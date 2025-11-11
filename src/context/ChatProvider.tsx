/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { ChatContext, ChatMessage } from "./ChatContext";
import { useAccount, useWriteContract } from "wagmi";
import hypercycle from "hypercyclejs";
import toast from "react-hot-toast";
import { abis } from "../abis";
import { CONTRACT_ADDRESSES } from "../constants/addresses";
import { addTrailingSlash, validURLChecker } from "../lib/utils";

interface ChatProviderProps {
  children: React.ReactNode;
}

type IAvailableModels = string[] | undefined;

interface TokenResponse {
  token: string;
  done?: boolean;
}

interface AIMResponse {
  costs: {
    currency: string;
    estimated_cost: number;
    max: number;
    min: number;
    used: number;
  }[];
  status: string;
  token?: string;       // present for streaming
  content?: string;     // may be present for non-stream responses
  stream_url?: string;  // optional advertised stream path (e.g. http://localhost:4001/stream)
}

const initialMessages: ChatMessage[] = [];

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { address: walletAddress, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [availableModels, setAvailableModels] = useState<IAvailableModels>([]);
  const [model, setModel] = useState<string>("gemma2:2b");

const addMessage = async (content: string) => {
  if (!content.trim() || isLoading || !walletAddress) return;

  const nodeUrl   = import.meta.env.VITE_NODE_URL;
  const slot      = import.meta.env.VITE_AIM_SLOT;
  const action    = import.meta.env.VITE_AIM_URI;     // e.g. "/request"
  const streamHost = import.meta.env.VITE_STREAM_HOST;

  // Add user message
  const userMessage: ChatMessage = { role: "user", content: content.trim() };
  setMessages((prev) => [...prev, userMessage]);

  setIsLoading(true);

  // Temp assistant message for streaming
  setMessages((prev) => [
    ...prev,
    { role: "assistant", content: "", isStreaming: true },
  ]);

  // The message payload we send to the AIM
  const messagePayload = {
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      ...messages,
      userMessage,
    ],
  };

  // Small helper for the streaming POST
  const postStream = async (url: string, token: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      throw new Error(`Stream error ${res.status}: ${await res.text()}`);
    }
    return res;
  };

  // Helper: try aimFetch once, optionally forcing a fresh nonce
  const tryAimFetch = async (forceNonce = false) => {
    try {
      // Optional: force-refresh nonce if supported by hypercyclejs
      if (forceNonce && typeof (hypercycle as any)?.refreshNonce === "function") {
        await (hypercycle as any).refreshNonce(nodeUrl, walletAddress);
      }
    } catch {
      // ignore if helper not present
    }

    const req = await hypercycle.aimFetch(
      walletAddress,
      nodeUrl,
      slot,
      "POST",
      action,
      {},
      JSON.stringify(messagePayload),
      {},
      "ethereum"
    );
    return req;
  };

  try {
    // 1) Make the signed request to the AIM to get the stream token
    let request = await tryAimFetch(false);

    // If payment required or unauthorized, surface early
    if (request.status === 402) {
      const body = await request.text();
      toast.error("Payment required. " + body);
      throw new Error("402 Payment Required");
    }
    if (request.status === 400 || request.status === 401) {
      // Read body once to inspect error
      const bodyText = await request.text();
      if (/invalid\s*nonce/i.test(bodyText)) {
        // Retry ONCE with a forced nonce refresh
        try {
          request = await tryAimFetch(true);
        } catch (e) {
          throw new Error(`Retry after nonce refresh failed: ${String(e)}`);
        }
        if (!request.ok) {
          const secondBody = await request.text();
          throw new Error(`After nonce refresh still failing: ${request.status} ${secondBody}`);
        }
      } else {
        throw new Error(`Signed request failed: ${request.status} ${bodyText}`);
      }
    }

    if (!request.ok) {
      // e.g., intermittent 500 from AIM
      const errBody = await request.text();
      throw new Error(`AIM error ${request.status}: ${errBody}`);
    }

    const tokenResp = (await request.json()) as { token?: string; stream_url?: string; status?: string };
    if (!tokenResp?.token) {
      throw new Error(`Token missing in response: ${JSON.stringify(tokenResp)}`);
    }

    // 2) Start streaming with robust fallbacks (no signed non-stream fallback)
    const token = tokenResp.token;

    // First try advertised stream URL (rewritten by vite proxy)
    let stream: Response | null = null;
    let streamErr: unknown = null;

    const tryStreamUrl = async (u: string) => {
      try {
        const r = await postStream(u, token);
        return r;
      } catch (e) {
        streamErr = e;
        return null;
      }
    };

    // (a) Use the provided stream_url (if present)
    if (tokenResp.stream_url) {
      // If the server gave an absolute /stream or /chat, hit it via the UI host:
      // The vite proxy maps /chat and /stream for us.
      const advertised = tokenResp.stream_url;
      // Normalize to UI base
      const normalized =
        advertised.startsWith("http")
          ? advertised.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, streamHost)
          : `${streamHost}${advertised.startsWith("/") ? "" : "/"}${advertised}`;
      stream = await tryStreamUrl(normalized);
    }

    // (b) Fallback to /chat
    if (!stream) {
      stream = await tryStreamUrl(`${streamHost}/chat`);
    }

    // (c) Fallback to /stream/chat
    if (!stream) {
      stream = await tryStreamUrl(`${streamHost}/stream/chat`);
    }

    // (d) Final fallback to /stream (LiteLLM often uses this)
    if (!stream) {
      stream = await tryStreamUrl(`${streamHost}/stream`);
    }

    if (!stream || !stream.body) {
      throw new Error(`Unable to open stream. ${streamErr ? String(streamErr) : "No body returned."}`);
    }

    // 3) Read the SSE and update UI
    const reader = stream.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const textChunk = decoder.decode(value, { stream: true });
      const lines = textChunk.split("\n").filter((line) => line.trim() !== "");
      for (let line of lines) {
        if (line.startsWith("data:")) line = line.slice(5).trim();
        if (!line) continue;
        try {
          const json = JSON.parse(line) as { token?: string; done?: boolean };
          if (json.token) {
            accumulatedResponse += json.token;
            setMessages((prev) => {
              const newMsgs = [...prev];
              const idx = newMsgs.length - 1;
              if (idx >= 0) {
                newMsgs[idx] = { role: "assistant", content: accumulatedResponse, isStreaming: true };
              }
              return newMsgs;
            });
          }
        } catch (e) {
          // non-JSON lines harmless
          console.debug("Non-JSON SSE line:", line);
        }
      }
    }

    // finalize
    setMessages((prev) => {
      const newMsgs = [...prev];
      const idx = newMsgs.length - 1;
      if (idx >= 0) {
        newMsgs[idx] = { role: "assistant", content: accumulatedResponse, isStreaming: false };
      }
      return newMsgs;
    });
  } catch (err: any) {
    console.error("Error in agent request:", err);

    // If it was a 500 from /request, be explicit
    if (String(err).includes("AIM error 500")) {
      toast.error("The model backend hit an internal error. Try a simpler prompt or retry in a moment.");
    } else if (/invalid\s*nonce/i.test(String(err))) {
      toast.error("Wallet signature nonce was invalid. Please try again.");
    } else {
      toast.error("Error in agent request: " + String(err));
    }

    // Show a clean error bubble
    setMessages((prev) => {
      const newMsgs = [...prev];
      const idx = newMsgs.length - 1;
      if (idx >= 0) {
        newMsgs[idx] = {
          role: "assistant",
          content: "Sorry—there was a problem talking to the model. Please try again.",
          isStreaming: false,
          error: true,
        };
      }
      return newMsgs;
    });
  } finally {
    setIsLoading(false);
  }
};

  /**
   * Hybrid model discovery:
   * 1) Try /aim/:slot/models (LiteLLM-style; map/object or arrays)
   * 2) Fallback to /aim/:slot/manifest.json (Ollama-style)
   */
  const getAvailableModels = async () => {
    const nodeUrl = import.meta.env.VITE_NODE_URL as string; // e.g. https://IP:PORT
    const slot    = import.meta.env.VITE_AIM_SLOT as string; // e.g. "0"
    const action  = import.meta.env.VITE_AIM_URI as string;  // e.g. "/request"

    const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

    // 1) /models (LiteLLM style: { default_model, models: {name:provider} | string[], models_by_provider })
    try {
      const url = `${nodeUrl}/aim/${slot}/models`;
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) {
        const data = (await r.json()) as any;

        const fromMapKeys =
          data?.models && typeof data.models === "object" && !Array.isArray(data.models)
            ? Object.keys(data.models)
            : [];
        const fromByProvider =
          data?.models_by_provider && typeof data.models_by_provider === "object"
            ? (Object.values(data.models_by_provider) as string[][]).flat()
            : [];
        const fromArray =
          Array.isArray(data?.models) && data.models.every((x: any) => typeof x === "string")
            ? data.models
            : [];

        const list = uniq([...fromMapKeys, ...fromByProvider, ...fromArray]);

        if (list.length) {
          const def = typeof data.default_model === "string" ? data.default_model : undefined;
          setAvailableModels(list);
          setModel((cur) =>
            cur && list.includes(cur) ? cur :
            def && list.includes(def) ? def :
            list[0]
          );
          return;
        }
      }
    } catch {
      // fall through to manifest
    }

    // 2) manifest.json (Ollama style)
    try {
      const resp = await fetch(`${nodeUrl}/aim/${slot}/manifest.json`, {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) throw new Error(`manifest ${resp.status}`);
      const manifest = await resp.json();

      const endpoints: any[] = Array.isArray(manifest?.endpoints) ? manifest.endpoints : [];
      const ep: any =
        endpoints.find((e) => e?.uri === action) ||
        endpoints.find((e) => Array.isArray(e?.available_models) && e.available_models.length) ||
        endpoints[0];

      const list: string[] = Array.isArray(ep?.available_models) ? ep.available_models : [];
      const defModel: string | undefined = ep?.defaults?.model;

      if (list.length) {
        setAvailableModels(list);
        setModel((cur) =>
          defModel && list.includes(defModel)
            ? defModel
            : cur && list.includes(cur)
            ? cur
            : list[0]
        );
      } else if (defModel) {
        setAvailableModels([defModel]);
        setModel(defModel);
      } else {
        setAvailableModels([]);
      }
    } catch {
      setAvailableModels([]);
    }
  };

  // Deposit / addBalance (unchanged)
  const addBalance = async (amount: number) => {
    setIsLoading(true);
    const nodeUrl = import.meta.env.VITE_NODE_URL as string;
    const info = await hypercycle.getNodeInfo(nodeUrl);
    if (!info) {
      console.error("Error getting node info:", info);
      throw new Error("Problem getting node info");
    }
    if (!walletAddress) {
      toast.error("No wallet address found");
      throw new Error("No wallet address found");
    }
    const adjustedUnits = amount * 1000000; // (assuming USDC has 6 decimals)
    try {
      const txHash = await writeContractAsync({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        address: CONTRACT_ADDRESSES[chain!.name].usdc,
        abi: abis["hypc"],
        functionName: "transfer",
        args: [info.tm.address, adjustedUnits],
      });

      const txReceipt = await hypercycle.transactionReceiptWait(txHash);
      const headers: any = {
        "tx-sender": walletAddress,
        "tx-origin": walletAddress,
        "hypc-program": "",
        "currency-type": "USDC",
        "tx-driver": "ethereum",
        "tx-value": adjustedUnits,
        "tx-id": txHash,
        "ngrok-skip-browser-warning": "true",
      };
      const url = validURLChecker(nodeUrl)
        ? `${addTrailingSlash(nodeUrl)}balance`
        : `http://${addTrailingSlash(nodeUrl).replace("http://", "")}balance`;

      const res = await fetch(url, { method: "post", headers });
      const paymentRequest = await res.json();
      console.log(paymentRequest, "deposit response", txReceipt);
      if (!paymentRequest) {
        throw new Error("Problem creating payment request, check connector or reconnect wallet.");
      }
      toast.success("Founds added successfully!");
    } catch (error) {
      console.log(error);
      toast.error("Error adding funds: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAvailableModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    messages,
    addMessage,
    isLoading,
    walletAddress,
    availableModels,
    activeModel: model,
    setCurrentModel: setModel,
    addBalance,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatProvider;
