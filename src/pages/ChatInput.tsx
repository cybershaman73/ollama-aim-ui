import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../context/ChatContext";

interface ChatInputProps {
  isFirstInteraction?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ isFirstInteraction = false }) => {
  const { addMessage, isLoading } = useChat();
  const [inputMessage, setInputMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input field when component mounts
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage.trim();
    setInputMessage("");
    await addMessage(message);
  };

  return (
    <div className="flex w-full">
      <input
        ref={inputRef}
        type="text"
        placeholder="Ask something..."
        className={`flex-grow p- md:p-1 rounded-l-lg bg-slate-700 text-slate-50 border-2 border-slate-600 focus:outline-none focus:border-blue-500 ${isFirstInteraction ? 'text-lg' : ''}`}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            handleSendMessage();
          }
        }}
        disabled={isLoading}
        data-testid="message-input"
      />
      <button
        className={`px-3 md:px-6 py-3 md:py-3 rounded-r-lg font-bold ${
          isLoading || !inputMessage.trim()
            ? 'bg-slate-600 cursor-not-allowed text-slate-300' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        onClick={handleSendMessage}
        disabled={isLoading || !inputMessage.trim()}
        data-testid="send-button"
      >
        {isLoading ? 'Thinking...' : 'Ask'}
      </button>
    </div>
  );
};

export default ChatInput;