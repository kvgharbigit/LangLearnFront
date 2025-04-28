// types/navigation.ts
import { ConversationMode } from '../components/ConversationModeSelector';

export type RootStackParamList = {
  Home: undefined;
  LanguageLanding: undefined;
  LanguageTutor: {
    nativeLanguage: string;
    targetLanguage: string;
    difficulty: string;
    learningObjective?: string;
    conversationMode: ConversationMode; // Added new parameter
  };
  AudioTest: undefined;
  // Keep other screen types if you have any
};