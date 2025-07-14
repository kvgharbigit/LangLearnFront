// src/config/nativeLanguages.ts

/**
 * Dynamic Native Language Configuration
 * 
 * This module provides a scalable configuration system for managing
 * which languages can be used as native languages in the app.
 * Future languages can be easily enabled/disabled via feature flags.
 */

export interface NativeLanguageConfig {
  enabled: boolean;
  uiComplete: boolean;  // Whether all UI translations are complete
  fallbackLanguage?: string; // Language to fall back to if translations are missing
}

export interface NativeLanguageSupport {
  [languageCode: string]: NativeLanguageConfig;
}

/**
 * Configuration for supported native languages
 * Add new languages here and set enabled: true when ready for production
 */
export const SUPPORTED_NATIVE_LANGUAGES: NativeLanguageSupport = {
  en: {
    enabled: true,
    uiComplete: true,
  },
  es: {
    enabled: true,
    uiComplete: true, // Will be true after our implementation
    fallbackLanguage: 'en',
  },
  fr: {
    enabled: false, // Future support
    uiComplete: false,
    fallbackLanguage: 'en',
  },
  it: {
    enabled: false, // Future support
    uiComplete: false,
    fallbackLanguage: 'en',
  },
  de: {
    enabled: false, // Future support
    uiComplete: false,
    fallbackLanguage: 'en',
  },
  zh: {
    enabled: false, // Future support
    uiComplete: false,
    fallbackLanguage: 'en',
  },
};

/**
 * Get list of currently enabled native languages
 */
export const getEnabledNativeLanguages = (): string[] => {
  return Object.entries(SUPPORTED_NATIVE_LANGUAGES)
    .filter(([_, config]) => config.enabled)
    .map(([languageCode, _]) => languageCode);
};

/**
 * Check if a language is supported as a native language
 */
export const isNativeLanguageSupported = (languageCode: string): boolean => {
  const config = SUPPORTED_NATIVE_LANGUAGES[languageCode];
  return config ? config.enabled : false;
};

/**
 * Check if a native language has complete UI translations
 */
export const isNativeLanguageUIComplete = (languageCode: string): boolean => {
  const config = SUPPORTED_NATIVE_LANGUAGES[languageCode];
  return config ? config.uiComplete : false;
};

/**
 * Get fallback language for a native language
 */
export const getNativeLanguageFallback = (languageCode: string): string => {
  const config = SUPPORTED_NATIVE_LANGUAGES[languageCode];
  return config?.fallbackLanguage || 'en';
};

/**
 * Get default native language (first enabled language)
 */
export const getDefaultNativeLanguage = (): string => {
  const enabledLanguages = getEnabledNativeLanguages();
  return enabledLanguages.length > 0 ? enabledLanguages[0] : 'en';
};

/**
 * Validate if a native language selection is valid
 */
export const validateNativeLanguageSelection = (languageCode: string): {
  isValid: boolean;
  error?: string;
} => {
  if (!languageCode) {
    return {
      isValid: false,
      error: 'Language code is required',
    };
  }

  if (!isNativeLanguageSupported(languageCode)) {
    return {
      isValid: false,
      error: `Language '${languageCode}' is not supported as a native language`,
    };
  }

  if (!isNativeLanguageUIComplete(languageCode)) {
    return {
      isValid: false,
      error: `UI translations for '${languageCode}' are incomplete`,
    };
  }

  return { isValid: true };
};