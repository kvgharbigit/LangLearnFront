// src/screens/LanguageLanding.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import LanguageSelector from '../components/LanguageSelector';
import { DIFFICULTY_LEVELS } from '../constants/languages';
import { getLanguagePreferences, saveLanguagePreferences } from '../utils/languageStorage';
import { getLanguageInfo } from '../constants/languages';
// No additional imports needed

// Get screen dimensions for responsive design
const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageLanding'>;

const LanguageLanding: React.FC<Props> = ({ navigation }) => {
  // Auth state
  const { user } = useAuth();

  // State
  const [nativeLanguage, setNativeLanguage] = useState<string>('en');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [learningObjective, setLearningObjective] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  // Load saved language preferences when component mounts
  useEffect(() => {
    loadSavedPreferences();

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
      const { targetLanguage: savedTarget, nativeLanguage: savedNative } = await getLanguagePreferences();

      if (savedNative) {
        setNativeLanguage(savedNative.code);
      }

      if (savedTarget) {
        setTargetLanguage(savedTarget.code);
      }
    } catch (error) {
      console.error('Error loading saved language preferences:', error);
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

  // Handle start learning button press
  const handleStartLearning = (): void => {
    // Basic validation
    if (!nativeLanguage || !targetLanguage || nativeLanguage === targetLanguage) {
      return;
    }

    setIsSaving(true);

    // Simulate loading for a better UX
    setTimeout(() => {
      navigation.navigate('LanguageTutor', {
        nativeLanguage,
        targetLanguage,
        difficulty,
        learningObjective: learningObjective.trim()
      });
      setIsSaving(false);
    }, 800);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Image
          source={require('../../assets/transparent_background_mascot_icon.png')}
          style={styles.loadingLogo}
        />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
        <Text style={styles.loadingText}>Loading your language settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
                  source={require('../../assets/transparent_background_mascot_icon.png')}
                  style={styles.logoImage}
                />
                <View>
                  <Text style={styles.title}>LangLearn</Text>
                  <Text style={styles.tagline}>AI-powered language learning</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Conversation Settings</Text>
                <View style={styles.cardDivider} />
              </View>

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

              <View style={styles.section}>
  <Text style={styles.sectionTitle}>My level:</Text>
  <View style={styles.difficultyContainer}>
    {DIFFICULTY_LEVELS.map(level => (
      <TouchableOpacity
        key={level.level}
        style={[
          styles.difficultyOption,
          difficulty === level.level && styles.selectedDifficulty
        ]}
        onPress={() => setDifficulty(level.level)}
        accessibilityLabel={level.label}
        accessibilityHint={`Set your proficiency level to ${level.label}`}
      >
        <View style={[
          styles.difficultyIconContainer,
          difficulty === level.level && styles.selectedDifficultyIcon
        ]}>
          <Text style={styles.difficultyIcon}>{level.icon}</Text>
        </View>
        <Text
          style={[
            styles.difficultyText,
            difficulty === level.level && styles.selectedDifficultyText
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {level.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>

              <View style={styles.section}>
  <Text style={styles.sectionTitle}> Topic (Optional)</Text>
  <View style={styles.textAreaContainer}>
    <TextInput
      style={styles.textArea}
      value={learningObjective}
      onChangeText={setLearningObjective}
      placeholder="• Travel tips for Mexico
• Grammar of the Past Tense
• Relationship Advice
"
      multiline
      scrollEnabled={false}
      numberOfLines={4}
      textAlignVertical="top"
      placeholderTextColor={colors.gray500}
    />
  </View>

  {/* New topic info note */}
  <View style={styles.topicInfoContainer}>
    <Ionicons name="information-circle" size={16} color={colors.info} style={styles.infoIcon} />
    <Text style={styles.topicInfoText}>
      Our AI tutor has extensive knowledge on almost any topic. Feel free to discuss travel, culture, science, history, relationships, or any subject you're interested in learning about - even if its just gossiping about your favourite TV show!
    </Text>
  </View>
</View>

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
    </SafeAreaView>
  );
};

// Enhanced color palette
const colors = {
  primary: '#5468FF',
  primaryGradientStart: '#7B86FF',
  primaryLight: '#EEF0FF',
  primaryDark: '#3A46CF',
  secondary: '#FF6B6B',
  accent: '#FFD166',
  success: '#06D6A0',
  danger: '#FF5252',
  warning: '#FFC107',
  info: '#03A9F4',
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
  background: '#F9FAFF',
  cardBackground: '#ffffff',
};

// Updated styles in LanguageLanding.tsx

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
    opacity: 0.4,
    top: -100,
    right: -100,
  },
  backgroundDecoration2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.primaryLight,
    opacity: 0.3,
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
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray600,
    letterSpacing: 0.2,
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
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    width: '32%', // Slightly increased from 31%
    shadowColor: colors.gray400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  selectedDifficulty: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  difficultyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.gray300,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedDifficultyIcon: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  difficultyIcon: {
    fontSize: 22,
  },
  difficultyText: {
    fontWeight: '600',
    color: colors.gray700,
    textAlign: 'center',
    fontSize: 13, // Reduced from 14 to better fit
    flexWrap: 'nowrap', // Prevent text from wrapping
  },
  selectedDifficultyText: {
    color: colors.primary,
    fontWeight: '700',
  },
  textAreaContainer: {
    width: '100%',
  },
  textArea: {
    width: '100%',
    minHeight: 120,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    color: colors.gray800,
    backgroundColor: colors.white,
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
  featuresSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 1,
    elevation: 3,
    width: '48%',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureText: {
    color: colors.gray600,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.gray300,
    shadowColor: colors.gray400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testButtonText: {
    color: colors.gray700,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerDivider: {
    height: 1,
    width: 60,
    backgroundColor: colors.gray300,
    marginBottom: 16,
  },
  footerText: {
    color: colors.gray500,
    fontSize: 12,
    textAlign: 'center',
  },
  // Updated profile button styles
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
   topicInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(3, 169, 244, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  topicInfoText: {
    fontSize: 13,
    color: colors.gray700,
    flex: 1,
    lineHeight: 18,
  },
});

export default LanguageLanding;