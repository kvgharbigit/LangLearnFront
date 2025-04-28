// src/utils/languageStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  TARGET_LANGUAGE: 'app_target_language',
  NATIVE_LANGUAGE: 'app_native_language',
};

// Interface for language data
export interface LanguagePreference {
  code: string;
  name: string;
  flag: string;
}

/**
 * Save the target language (language the user wants to learn)
 */
export const saveTargetLanguage = async (language: LanguagePreference): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TARGET_LANGUAGE, JSON.stringify(language));
    console.log('Target language saved successfully:', language.code);
  } catch (error) {
    console.error('Error saving target language:', error);
  }
};

/**
 * Save the native language (language the user speaks)
 */
export const saveNativeLanguage = async (language: LanguagePreference): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NATIVE_LANGUAGE, JSON.stringify(language));
    console.log('Native language saved successfully:', language.code);
  } catch (error) {
    console.error('Error saving native language:', error);
  }
};

/**
 * Get the saved target language
 * @returns The saved target language or null if not found
 */
export const getTargetLanguage = async (): Promise<LanguagePreference | null> => {
  try {
    const languageData = await AsyncStorage.getItem(STORAGE_KEYS.TARGET_LANGUAGE);
    if (languageData) {
      return JSON.parse(languageData);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving target language:', error);
    return null;
  }
};

/**
 * Get the saved native language
 * @returns The saved native language or null if not found
 */
export const getNativeLanguage = async (): Promise<LanguagePreference | null> => {
  try {
    const languageData = await AsyncStorage.getItem(STORAGE_KEYS.NATIVE_LANGUAGE);
    if (languageData) {
      return JSON.parse(languageData);
    }
    return null;
  } catch (error) {
    console.error('Error retrieving native language:', error);
    return null;
  }
};

/**
 * Save both target and native languages at once
 * Useful when setting up initial preferences
 */
export const saveLanguagePreferences = async (
  targetLanguage: LanguagePreference,
  nativeLanguage: LanguagePreference
): Promise<void> => {
  try {
    const languageData = {
      [STORAGE_KEYS.TARGET_LANGUAGE]: JSON.stringify(targetLanguage),
      [STORAGE_KEYS.NATIVE_LANGUAGE]: JSON.stringify(nativeLanguage),
    };

    await AsyncStorage.multiSet(Object.entries(languageData));
    console.log('Language preferences saved successfully');
  } catch (error) {
    console.error('Error saving language preferences:', error);
  }
};

/**
 * Get both language preferences at once
 * @returns Object containing both language preferences or null values if not found
 */
export const getLanguagePreferences = async (): Promise<{
  targetLanguage: LanguagePreference | null,
  nativeLanguage: LanguagePreference | null
}> => {
  try {
    const keys = [STORAGE_KEYS.TARGET_LANGUAGE, STORAGE_KEYS.NATIVE_LANGUAGE];
    const results = await AsyncStorage.multiGet(keys);

    let targetLanguage: LanguagePreference | null = null;
    let nativeLanguage: LanguagePreference | null = null;

    results.forEach(([key, value]) => {
      if (value) {
        if (key === STORAGE_KEYS.TARGET_LANGUAGE) {
          targetLanguage = JSON.parse(value);
        } else if (key === STORAGE_KEYS.NATIVE_LANGUAGE) {
          nativeLanguage = JSON.parse(value);
        }
      }
    });

    return { targetLanguage, nativeLanguage };
  } catch (error) {
    console.error('Error retrieving language preferences:', error);
    return { targetLanguage: null, nativeLanguage: null };
  }
};

/**
 * Clear all saved language preferences
 * Useful for resetting the app or when implementing a logout feature
 */
export const clearLanguagePreferences = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TARGET_LANGUAGE,
      STORAGE_KEYS.NATIVE_LANGUAGE,
    ]);
    console.log('Language preferences cleared successfully');
  } catch (error) {
    console.error('Error clearing language preferences:', error);
  }
};