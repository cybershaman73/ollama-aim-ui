import React, { useState, useEffect, useRef } from "react";
import hypercycle from "hypercyclejs";
import { useAccount } from "wagmi";

const nodeUrl = import.meta.env.VITE_NODE_URL;
const slot = import.meta.env.VITE_AIM_SLOT;
const action = import.meta.env.VITE_AIM_URI;
const streamHost = import.meta.env.VITE_STREAM_HOST;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  error?: boolean;
}

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
  token: string;
}

const HypercycleChat: React.FC = () => {
  const { address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus the input field when component mounts
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !address) return;
    
    // Add user message to chat
    const userMessage: Message = { role: "user", content: inputMessage.trim() };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);
    
    // Add temporary assistant message that will be updated with streaming content
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);
  
    try {
      const messagePayload = {
        "model": "llama3:latest",
        "system": "You are a helpful assistant",
        "prompt": currentInput
      };
      
      const request = await hypercycle.aimFetch(
        address,
        nodeUrl,
        slot,
        "POST",
        action,
        {},
        JSON.stringify(messagePayload),
        {},
        "ethereum"
      );
      
      const response = await request.json() as AIMResponse;
      console.log("Initial response:", response);
      
      if (response.token) {
        try {
          // Use fetch to start the SSE stream
          const stream = await fetch(`${streamHost}/stream`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: response.token }),
          });
          
          if (!stream.body) {
            throw new Error("Response body is null");
          }
          
          const reader = stream.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let accumulatedResponse = "";
          
          // Process the stream
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const textChunk = decoder.decode(value, { stream: true });
            
            // Each line may contain an SSE event starting with "data:"
            const lines = textChunk.split('\n').filter(line => line.trim() !== '');
            for (let line of lines) {
              // Remove the "data:" prefix if present
              if (line.startsWith("data:")) {
                line = line.slice(5).trim();
              }
              if (!line) continue;
              try {
                const jsonResponse = JSON.parse(line) as TokenResponse;
                if (jsonResponse.token) {
                  accumulatedResponse += jsonResponse.token;
                  // Update the assistant message with new tokens
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessageIndex = newMessages.length - 1;
                    if (lastMessageIndex >= 0) {
                      newMessages[lastMessageIndex] = {
                        role: "assistant",
                        content: accumulatedResponse,
                        isStreaming: true
                      };
                    }
                    return newMessages;
                  });
                } else if (jsonResponse.done) {
                  // Optionally, you can handle a "done" signal here
                }
              } catch (jsonError) {
                console.error("Error parsing JSON in stream:", jsonError, line);
              }
            }
          }
          
          // Streaming complete - update the final message
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessageIndex = newMessages.length - 1;
            if (lastMessageIndex >= 0) {
              newMessages[lastMessageIndex] = {
                role: "assistant",
                content: accumulatedResponse,
                isStreaming: false
              };
            }
            return newMessages;
          });
          
        } catch (streamError) {
          console.error("Stream error:", streamError);
          throw streamError;
        }
      } else {
        throw new Error("Failed to get streaming token");
      }
    } catch (error) {
      console.error("Error in AI request:", error);
      
      // Update the assistant message to indicate an error
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;
        if (lastMessageIndex >= 0) {
          newMessages[lastMessageIndex] = {
            role: "assistant",
            content: "Sorry, an error occurred while processing your request.",
            isStreaming: false,
            error: true
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  const isFirstInteraction = messages.length === 0;

  return (
    <div className="w-full flex flex-col items-center bg-transparent">
      <div className={`w-full max-w-3xl transition-all duration-300 ${isFirstInteraction ? 'mt-32' : 'mt-8'}`}>
        {isFirstInteraction ? (
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-slate-50">Hypercycle AI</h1>
            <p className="text-slate-300 text-lg">How can I assist you today?</p>
          </div>
        ) : (
          <div className="p-4 my-20">
            {/* <h1 className="text-2xl font-bold text-slate-50">Hypercycle AI Chat</h1> */}
          </div>
        )}
        
        {!isFirstInteraction && (
          <div className="bg-slate-800 rounded-lg mb-4 max-h-96 overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg mb-3 ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 ml-8' 
                    : 'bg-slate-900 mr-8'
                }`}
              >
                <div className="font-semibold mb-1 text-slate-300">
                  {msg.role === 'user' ? 'You' : 'Hypercycle AI'}
                </div>
                <div className="text-slate-50 whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && <span className="animate-pulse text-slate-300">▌</span>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        <div className="flex w-full">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask something..."
            className={`flex-grow p-4 rounded-l-lg bg-slate-700 text-slate-50 border-2 border-slate-600 focus:outline-none focus:border-blue-500 ${isFirstInteraction ? 'text-lg' : ''}`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                sendMessage();
              }
            }}
            disabled={isLoading}
          />
          <button
            className={`px-6 py-4 rounded-r-lg font-bold ${
              isLoading || !inputMessage.trim()
                ? 'bg-slate-500 cursor-not-allowed text-slate-300' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            {isLoading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HypercycleChat;