import React from "react";
import { useChat } from "../context/ChatContext";
interface ChatHeaderProps {
  isFirstInteraction: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ isFirstInteraction }) => {

  const { activeModel } = useChat();

  if (isFirstInteraction) {
    return (
      <div className="text-center mb-8 mt-28" data-testid="first-interaction-header">
        <h1 className="text-4xl md:text-4xl font-bold mb-4 text-slate-50">
            {activeModel ? activeModel.charAt(0).toUpperCase() + activeModel.slice(1) : ''}
        </h1>
        <p className="text-slate-300 text-base md:text-lg">How can I assist you today?</p>
      </div>
    );
  }

  return (
    <div className="p-2 my-2 md:my-2" data-testid="regular-header">
      {/* If you need a compact header when conversation is happening */}
      <h2 className="text-sm md:text-xl font-bold text-slate-50 text-center"></h2>
    </div>
  );
};

export default ChatHeader;