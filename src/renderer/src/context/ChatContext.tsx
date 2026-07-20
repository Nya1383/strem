import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { ChatMessage } from '@shared/signaling';

interface ChatContextType {
  messages: ChatMessage[];
  unreadCount: number;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  markRead: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const addMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    if (!isChatOpen && !msg.historical) {
      setUnreadCount((c) => c + 1);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setUnreadCount(0);
  };

  const markRead = () => {
    setUnreadCount(0);
  };

  const handleSetIsChatOpen = (open: boolean) => {
    setIsChatOpen(open);
    if (open) setUnreadCount(0);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        unreadCount,
        isChatOpen,
        setIsChatOpen: handleSetIsChatOpen,
        addMessage,
        clearMessages,
        markRead
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
