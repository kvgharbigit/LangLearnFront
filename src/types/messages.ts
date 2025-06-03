// src/types/messages.ts

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  corrected?: string;
  natural?: string;
  translation?: string; // Added translation field
  isTemporary?: boolean;
  hasAudio?: boolean; // Whether audio is available for this message
  tts_status?: 'completed' | 'running' | 'failed' | 'skipped'; // TTS generation status
}

export interface MessageComponentProps {
  message: Message;
  originalUserMessage?: string | null;
}