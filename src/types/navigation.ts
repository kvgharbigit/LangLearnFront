// types/navigation.ts
import { ConversationMode } from '../components/ConversationModeSelector';

export type RootStackParamList = {
  Auth: { screen?: string; params?: any } | undefined;
  Main: undefined;
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
  Profile: undefined;
  EditProfile: undefined;
  Subscription: undefined;
  AppLanguage: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  // Modal screens use component modals instead of navigation
  // Keep other screen types if you have any
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ResetPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  LanguageLanding: undefined;
  LanguageTutor: {
    nativeLanguage: string;
    targetLanguage: string;
    difficulty: string;
    learningObjective?: string;
    conversationMode: ConversationMode;
  };
  AudioTest: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Subscription: undefined; // New subscription screen
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};