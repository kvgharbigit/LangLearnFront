// src/constants/languages.ts

// Interface for language data
export interface Language {
  code: string;
  name: string;
  flag: string;
}

// Available languages
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'zh', name: 'Chinese Mandarin', flag: '🇨🇳' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' }
];

// Difficulty levels
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Difficulty {
  level: DifficultyLevel;
  label: string;
  icon: string;
}

export const DIFFICULTY_LEVELS: Difficulty[] = [
  { level: 'beginner', label: 'Beginner', icon: '🌱' },
  { level: 'intermediate', label: 'Intermediate', icon: '🌿' },
  { level: 'advanced', label: 'Advanced', icon: '🌳' }
];

// Get language info by code
export const getLanguageInfo = (code: string): Language => {
  const language = LANGUAGES.find(lang => lang.code === code);
  return language || { code: 'unknown', name: 'Unknown', flag: '🏳️' };
};

export default {
  LANGUAGES,
  DIFFICULTY_LEVELS,
  getLanguageInfo
};