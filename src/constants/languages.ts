// src/constants/languages.ts

// Interface for language data
export interface Language {
  code: string;
  name: string;
  nativeName: string; // Name of the language in that language
  flag: string;
}

// Available languages
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'zh', name: 'Chinese Mandarin', nativeName: '中文', flag: '🇨🇳' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' }
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
  return language || { code: 'unknown', name: 'Unknown', nativeName: 'Unknown', flag: '🏳️' };
};

export default {
  LANGUAGES,
  DIFFICULTY_LEVELS,
  getLanguageInfo
};