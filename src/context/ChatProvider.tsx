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

    const nodeUrl = import.meta.env.VITE_NODE_URL as string;  // e.g. https://172.27.126.244:8880
    const slot = import.meta.env.VITE_AIM_SLOT as string;     // e.g. 0
    const action = import.meta.env.VITE_AIM_URI as string;    // e.g. /request

    // Sanitize stream base (allow empty → same-origin)
    const rawStreamBase = (import.meta.env.VITE_STREAM_HOST as string) || "";
    const streamBase = rawStreamBase.replace(/\/+$/, ""); // strip trailing slash

    // Add user message to chat
    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);

    // Add temporary assistant message that will be updated with streaming/final content
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      // Ensure selected model is advertised
      if (!availableModels?.includes(model)) {
        toast.error(`Model ${model} is not available`);
        console.error(`Model ${model} is not available`);
        return;
      }

      // Build chat payload for the request/token endpoint
      const messagePayload = {
        model: model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...messages,
          userMessage,
        ],
      };

      // 1) Ask AIM for a streaming token (POST to `action`, e.g., /request)
      const request = await hypercycle.aimFetch(
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

      if (request.status === 402) {
        const requestBody = await request.text();
        alert("Payment required. Please check your wallet balance. " + requestBody);
        return;
      }

      let accumulatedResponse = "";
      let streamed = false;

      // Try to parse token JSON
      let tokenResp: AIMResponse | null = null;
      try {
        tokenResp = (await request.json()) as AIMResponse;
      } catch {
        tokenResp = null;
      }

      // Helper: POST JSON with token
      const postJSON = (url: string, token: string) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

      // Helper: try advertised stream_url first (rewrite localhost → Vite origin)
      const tryStreamUrlFirst = async (resp: AIMResponse) => {
        if (!resp?.token) return null;
        const raw = resp.stream_url;
        if (!raw || typeof raw !== "string") return null;
        try {
          const u = new URL(raw);
          // Keep only the path from server's advertised URL, prepend our Vite origin (streamBase)
          // Example: "http://localhost:4001/stream" → "https://<vite-host>:8880/stream"
          const rewritten = `${streamBase}${u.pathname}`;
          const res = await postJSON(rewritten, resp.token);
          return res;
        } catch {
          return null;
        }
      };

      // 2) If we have a token, try streaming: stream_url → /chat → /stream/chat
      if (tokenResp?.token) {
        // a) Prefer server-advertised stream_url if present
        let stream = await tryStreamUrlFirst(tokenResp);

        // b) Fallback to direct /chat (→ :4001/chat via proxy)
        if (!stream || stream.status === 404) {
          stream = await postJSON(`${streamBase}/chat`, tokenResp.token);
        }

        // c) Fallback to legacy /stream/chat (proxy rewrites to /chat if configured)
        if (stream && stream.status === 404) {
          stream = await postJSON(`${streamBase}/stream/chat`, tokenResp.token);
        }

        if (stream && stream.ok && stream.body) {
          // Read the SSE-like stream of tokens
          const reader = stream.body.getReader();
          const decoder = new TextDecoder("utf-8");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const textChunk = decoder.decode(value, { stream: true });
            const lines = textChunk.split("\n").filter((line) => line.trim() !== "");

            for (let line of lines) {
              if (line.startsWith("data:")) line = line.slice(5).trim();
              if (!line) continue;

              try {
                const jsonResponse = JSON.parse(line) as TokenResponse;
                if (jsonResponse.token) {
                  accumulatedResponse += jsonResponse.token;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const last = newMessages.length - 1;
                    if (last >= 0) {
                      newMessages[last] = {
                        role: "assistant",
                        content: accumulatedResponse,
                        isStreaming: true,
                      };
                    }
                    return newMessages;
                  });
                }
              } catch {
                // ignore non-JSON lines
              }
            }
          }

          streamed = true;
        } else if (stream && stream.status !== 404) {
          // Some other error than 404 from stream path
          const text = await stream.text().catch(() => "");
          throw new Error(`Stream error ${stream.status}: ${text}`);
        }
      }

      // 3) Fallback: if streaming failed or not available, do non-streaming chat via AIM
      if (!streamed) {
        const nonStreamUrl = `${nodeUrl}/aim/${slot}/chat`;
        const resp = await fetch(nonStreamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messagePayload),
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`Non-stream chat error ${resp.status}: ${text}`);
        }

        // Accept either { content } or OpenAI-like shapes or plain text
        let txt = "";
        try {
          const j = await resp.json();
          if (typeof j === "string") txt = j;
          else if (typeof j?.content === "string") txt = j.content;
          else if (Array.isArray(j?.choices) && j.choices[0]?.message?.content) {
            txt = j.choices[0].message.content;
          } else {
            txt = JSON.stringify(j);
          }
        } catch {
          txt = await resp.text();
        }

        accumulatedResponse = txt;
        setMessages((prev) => {
          const newMessages = [...prev];
          const last = newMessages.length - 1;
          if (last >= 0) {
            newMessages[last] = {
              role: "assistant",
              content: accumulatedResponse,
              isStreaming: false,
            };
          }
          return newMessages;
        });
      } else {
        // Streaming complete - finalize
        setMessages((prev) => {
          const newMessages = [...prev];
          const last = newMessages.length - 1;
          if (last >= 0) {
            newMessages[last] = {
              role: "assistant",
              content: accumulatedResponse,
              isStreaming: false,
            };
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error in agent request:", error);
      toast.error("Error in agent request: " + error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const last = newMessages.length - 1;
        if (last >= 0) {
          newMessages[last] = {
            role: "assistant",
            content: "Sorry, an error occurred while processing your request.",
            isStreaming: false,
            error: true,
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Hybrid model discovery:
   * 1) Try /aim/:slot/models (LiteLLM-style; map object or arrays)
   * 2) Fallback to /aim/:slot/manifest.json (Ollama-style)
   */
  const getAvailableModels = async () => {
    const nodeUrl = import.meta.env.VITE_NODE_URL as string; // e.g. https://IP:PORT
    const slot = import.meta.env.VITE_AIM_SLOT as string;    // e.g. 0
    const action = import.meta.env.VITE_AIM_URI as string;   // e.g. /request

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

  // TODO: Needs to be fixed
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

      const res = await fetch(url, { method: "post", headers: headers });
      const paymentRequest = await res.json();
      console.log(paymentRequest, "deposit response", txReceipt);

      if (!paymentRequest) {
        throw new Error(
          "Problem creating payment request, check connector or reconnect wallet."
        );
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
