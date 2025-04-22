// src/types/messages.ts

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  corrected?: string;
  natural?: string;
  isTemporary?: boolean;
}

export interface MessageComponentProps {
  message: Message;
  originalUserMessage?: string | null;
}