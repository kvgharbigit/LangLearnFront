// src/screens/LanguageLanding.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import LanguageSelector from '../components/LanguageSelector';
import ConversationModeSelector, { ConversationMode } from '../components/ConversationModeSelector';
import DifficultyLevelSelector from '../components/DifficultyLevelSelector';
import { DIFFICULTY_LEVELS, DifficultyLevel } from '../constants/languages';
import { getLanguagePreferences, saveLanguagePreferences } from '../utils/languageStorage';
import { getLanguageInfo } from '../constants/languages';
import userPreferences from '../utils/userPreferences';

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageLanding'>;

const LanguageLanding: React.FC<Props> = ({ navigation }) => {
  // Auth state
  const { user } = useAuth();

  // State
  const [nativeLanguage, setNativeLanguage] = useState<string>('en');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [conversationMode, setConversationMode] = useState<ConversationMode>('free_conversation');
  const [learningObjective, setLearningObjective] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  // Reference to track API preconnection status
  const apiPreconnected = useRef(false);
  
  // Load saved language preferences when component mounts
  useEffect(() => {
    loadSavedPreferences();
    
    // Preconnect to the API in the background to speed up first message
    if (!apiPreconnected.current) {
      apiPreconnected.current = true;
      api.preconnectToAPI().catch(err => {
        console.log("API preconnection error (non-critical):", err);
      });
    }

    // Run entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Function to load saved preferences from storage
  const loadSavedPreferences = async () => {
    try {
      setIsLoading(true);
      
      // Load language preferences
      const { targetLanguage: savedTarget, nativeLanguage: savedNative } = await getLanguagePreferences();

      if (savedNative) {
        setNativeLanguage(savedNative.code);
      }

      if (savedTarget) {
        setTargetLanguage(savedTarget.code);
      }
      
      // Load difficulty level and learning objective
      const learningPrefs = await userPreferences.getLearningPreferences();
      if (learningPrefs.difficultyLevel) {
        setDifficulty(learningPrefs.difficultyLevel as DifficultyLevel);
      }
      
      if (learningPrefs.lastLearningObjective) {
        setLearningObjective(learningPrefs.lastLearningObjective);
      }
      
      // Load saved conversation mode
      const savedMode = await userPreferences.getSingleSetting('CONVERSATION_MODE', 'free_conversation');
      setConversationMode(savedMode as ConversationMode);
      
    } catch (error) {
      console.error('Error loading saved preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save preferences when they change
  useEffect(() => {
    // Only save if both languages are selected and different from each other
    if (nativeLanguage && targetLanguage && nativeLanguage !== targetLanguage && !isLoading) {
      savePreferences();
    }
  }, [nativeLanguage, targetLanguage]);

  // Function to save preferences to storage
  const savePreferences = async () => {
    try {
      if (!nativeLanguage || !targetLanguage || nativeLanguage === targetLanguage) {
        return;
      }

      // Get full language info objects
      const nativeInfo = getLanguageInfo(nativeLanguage);
      const targetInfo = getLanguageInfo(targetLanguage);

      await saveLanguagePreferences(
        {
          code: targetLanguage,
          name: targetInfo.name,
          flag: targetInfo.flag
        },
        {
          code: nativeLanguage,
          name: nativeInfo.name,
          flag: nativeInfo.flag
        }
      );
    } catch (error) {
      console.error('Error saving language preferences:', error);
    }
  };

  // Handle native language selection
  const handleNativeLanguageSelect = (code: string) => {
    // If selecting the same language that's currently the target, swap them
    if (code === targetLanguage) {
      setTargetLanguage(nativeLanguage);
    }
    setNativeLanguage(code);
  };

  // Handle target language selection
  const handleTargetLanguageSelect = (code: string) => {
    // If selecting the same language that's currently the native, swap them
    if (code === nativeLanguage) {
      setNativeLanguage(targetLanguage);
    }
    setTargetLanguage(code);
  };

  // Handle conversation mode selection
  const handleConversationModeSelect = async (mode: ConversationMode) => {
    setConversationMode(mode);
    
    // Save conversation mode to AsyncStorage
    try {
      await userPreferences.saveSingleAudioSetting('CONVERSATION_MODE', mode);
      // Only log in dev mode
      if (__DEV__) {
        console.log(`🔍 Conversation mode: ${mode}`);
      }
    } catch (error) {
      console.error('Error saving conversation mode:', error);
    }
  };

  // Handle start learning button press
  const handleStartLearning = (): void => {
    // Basic validation
    if (!nativeLanguage || !targetLanguage || nativeLanguage === targetLanguage || isSaving) {
      return;
    }

    setIsSaving(true);
    
    // Only log in dev mode
    if (__DEV__) {
      console.log(`🔍 Navigating with mode: ${conversationMode}`);
    }

    // Simulate loading for a better UX
    setTimeout(() => {
      navigation.navigate('LanguageTutor', {
        nativeLanguage,
        targetLanguage,
        difficulty,
        learningObjective: learningObjective.trim(),
        conversationMode: conversationMode
      });
      setIsSaving(false);
    }, 800);
  };

  if (isLoading) {
    return (
      <SafeView style={styles.loadingContainer}>
        <Image
          source={require('../../assets/transparent_background_icon.png')}
          style={styles.loadingLogo}
        />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
        <Text style={styles.loadingText}>Loading your language settings...</Text>
      </SafeView>
    );
  }

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />

      {/* Decorative background elements */}
      <View style={styles.backgroundDecoration1} />
      <View style={styles.backgroundDecoration2} />

      {/* Profile Button - Only shown when user is authenticated */}
      {user && (
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
          accessibilityLabel="Profile"
          accessibilityHint="Navigate to your profile page"
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContent,
              { opacity: fadeAnim, transform: [{ translateY }] }
            ]}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/transparent_background_icon.png')}
                  style={styles.logoImage}
                />
                <View>
                  <Text style={styles.title}>Confluency</Text>
                  <Text style={styles.tagline}>Your Multilingual AI Companion</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              {/* Native Language Selection - Using LanguageSelector */}
              <LanguageSelector
                title="I speak:"
                selectedLanguage={nativeLanguage}
                onSelectLanguage={handleNativeLanguageSelect}
              />

              {/* Target Language Selection - Using LanguageSelector */}
              <LanguageSelector
                title="I want to learn:"
                selectedLanguage={targetLanguage}
                onSelectLanguage={handleTargetLanguageSelect}
                excludeLanguage={nativeLanguage} // Don't show the native language
              />

              {/* Difficulty Level Selector - Using DifficultyLevelSelector */}
              <DifficultyLevelSelector
                selectedLevel={difficulty}
                onSelectLevel={setDifficulty}
              />

              {/* Conversation Mode Selector */}
              <ConversationModeSelector
                selectedMode={conversationMode}
                onSelectMode={handleConversationModeSelect}
                promptText={learningObjective}
                onChangePromptText={setLearningObjective}
                onPromptSubmit={handleStartLearning}
              />

              <TouchableOpacity
                style={[
                  styles.startButton,
                  (!nativeLanguage || !targetLanguage || nativeLanguage === targetLanguage) && styles.disabledButton,
                  isSaving && styles.loadingButton
                ]}
                onPress={handleStartLearning}
                disabled={!nativeLanguage || !targetLanguage || nativeLanguage === targetLanguage || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.startButtonText}>Start Chatting!</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" style={styles.startButtonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
};

// Enhanced color palette
const colors = {
  primary: '#2A9D8F',
  primaryGradientStart: '#40B4A7',
  primaryLight: '#E8F5F3',
  primaryDark: '#1E7268',
  secondary: '#E76F51',
  accent: '#F4A261',
  success: '#2A9D8F',
  danger: '#E76F51',
  warning: '#F4A261',
  info: '#4D908E',
  gray50: '#f8f9fa',
  gray100: '#f1f3f5',
  gray200: '#e9ecef',
  gray300: '#dee2e6',
  gray400: '#ced4da',
  gray500: '#adb5bd',
  gray600: '#868e96',
  gray700: '#495057',
  gray800: '#343a40',
  gray900: '#212529',
  white: '#ffffff',
  background: '#F9FAFB',
  cardBackground: '#ffffff',
};

// Styles from original LanguageLanding.tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  animatedContent: {
    flex: 1,
  },
  backgroundDecoration1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: colors.primaryLight,
    opacity: 0.3,
    top: -100,
    right: -100,
  },
  backgroundDecoration2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.accent,
    opacity: 0.1,
    bottom: -50,
    left: -100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingLogo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray700,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24, // Reduced from original to give more space at top
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40, // Increased to make room for the profile button
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginRight: 12,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: colors.gray600,
    letterSpacing: 1.2,
    fontWeight: '400',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 1,
    elevation: 8,
    marginBottom: 30,
  },
  cardHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  cardDivider: {
    height: 3,
    width: 40,
    backgroundColor: colors.primary,
    marginTop: 8,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.gray700,
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    alignSelf: 'center',
    minWidth: 220,
    flexDirection: 'row',
  },
  startButtonIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingButton: {
    backgroundColor: colors.primaryGradientStart,
  },
  startButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  profileButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 16, // Adjusted for iOS to be below status bar
    right: 16,
    zIndex: 10,
    backgroundColor: colors.primary, // Added background color for visibility
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default LanguageLanding;