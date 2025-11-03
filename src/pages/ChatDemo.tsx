import React from "react";
import { useChat } from "../context/ChatContext";

import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ModelSelector from "./ModelSelector";

const HypercycleChat: React.FC = () => {
  const { messages } = useChat();
  
  const isFirstInteraction = messages.length === 0;

  return (
    <div className="w-full flex flex-col">

      <div className="flex items-center justify-between ml-36 mt-4 md:mt-8">
        <div className="flex items-center space-x-2">
          <p className="text-white text-sm font-semibold">
            Models
          </p>
          <ModelSelector />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className={`w-full max-w-3xl px-4 transition-all duration-300 ${isFirstInteraction ? 'mt-16 md:mt-32' : 'mt-4 md:mt-8'}`}>
          <ChatHeader isFirstInteraction={isFirstInteraction} />
          
          <ChatMessages />
          
          <ChatInput isFirstInteraction={isFirstInteraction} />
        </div>
      </div>
    </div>
  );
};

export default HypercycleChat;