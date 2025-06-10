// types/navigation.ts
import { ConversationMode } from '../components/ConversationModeSelector';

export type RootStackParamList = {
  // Auth screens (when not authenticated)
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
  
  // Main screens (when authenticated)
  LanguageLanding: undefined;
  LanguageTutor: {
    nativeLanguage: string;
    targetLanguage: string;
    difficulty: string;
    learningObjective?: string;
    conversationMode: ConversationMode;
  };
  AudioTest: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Subscription: undefined;
  AppLanguage: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
};