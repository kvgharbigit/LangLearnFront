// export type RootStackParamList = {
//   LanguageLanding: undefined;
//   SpanishTutor: {
//     nativeLanguage: string;
//     targetLanguage: string;
//     difficulty: string;
//     learningObjective: string;
//   };
// };

// export type RootStackParamList = {
//   LanguageLanding: undefined;
//   SpanishTutor: {
//     nativeLanguage: string;
//     targetLanguage: string;
//     difficulty: string;
//     learningObjective: string;
//   };
//   AudioTest: undefined; // Add this new route
// };/

// types/navigation.ts
export type RootStackParamList = {
  Home: undefined;
  LanguageLanding: undefined;
  LanguageTutor: {
    nativeLanguage: string;
    targetLanguage: string;
    difficulty: string;
    learningObjective?: string;
  };
  AudioTest: undefined;
  // Keep other screen types if you have any
};