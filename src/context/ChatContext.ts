import { createContext, useContext } from "react";

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    isStreaming?: boolean;
    error?: boolean;
}

export interface ChatContextType {
    availableModels?: string[] | undefined;
    messages: ChatMessage[];
    addMessage: (content: string) => Promise<void>;
    setCurrentModel: (model: string) => void;
    activeModel: string;
    addBalance?: (amount: number) => Promise<void>;
    isLoading: boolean;
    walletAddress?: string;
}

export const ChatContext = createContext<ChatContextType | null>(null);

/**
 * Custom hook to access the chat context
 * @returns {ChatContextType} Object containing chat state and functions
 * @throws {Error} If used outside of a ChatProvider
 * @example
 * function ChatComponent() {
 *   const { messages, addMessage, isLoading } = useChat(); // updated to use the new hook
 *   
 *   const sendMessage = (content: string) => {
 *     addMessage(content);
 *   };
 *   
 *   return (
 *     <div>
 *       {messages.map((msg, index) => (
 *         <div key={index}>{msg.content}</div>
 *       ))}
 *     </div>
 *   );
 * }
 */
export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
};