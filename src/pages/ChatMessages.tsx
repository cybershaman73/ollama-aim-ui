import React, { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import { useChat } from "../context/ChatContext";

const ChatMessages: React.FC = () => {
  const { messages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }
  //max-h-96 md:max-h-[60vh] overflow-y-auto
  return (
    <div 
      className="rounded-lg mb-4 p-2 md:p-4"
      data-testid="messages-container"
    >
      {messages.map((message, index) => (
        <ChatBubble key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;