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
  { code: 'es', name: 'Spanish', flag: '🇪🇸' }
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