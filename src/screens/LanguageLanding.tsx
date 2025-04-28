// src/screens/LanguageLanding.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import LanguageSelector from '../components/LanguageSelector';
import LanguageDropdown from '../components/LanguageDropdown';
import { DIFFICULTY_LEVELS } from '../constants/languages';

// Get screen dimensions for responsive design
const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageLanding'>;

const LanguageLanding: React.FC<Props> = ({ navigation }) => {
  // Auth state
  const { user } = useAuth();

  // State
  const [nativeLanguage, setNativeLanguage] = useState<string>('en');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [learningObjective, setLearningObjective] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle start learning button press
  const handleStartLearning = (): void => {
    // Basic validation
    if (!nativeLanguage || !targetLanguage) {
      return;
    }

    setIsLoading(true);

    // Simulate loading for a better UX
    setTimeout(() => {
      navigation.navigate('LanguageTutor', {
        nativeLanguage,
        targetLanguage,
        difficulty,
        learningObjective: learningObjective.trim()
      });
      setIsLoading(false);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Profile Button - Only shown when user is authenticated */}
      {user && (
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : '👤'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconBackground}>
              <Text style={styles.logoIcon}>🌎</Text>
            </View>
            <Text style={styles.title}>LangLearn</Text>
          </View>
          <Text style={styles.tagline}>Your AI-powered language learning companion</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLine}>
              <View style={styles.lineDecoration}></View>
              <Text style={styles.cardTitle}>Choose Your Languages</Text>
              <View style={styles.lineDecoration}></View>
            </View>
          </View>

          {/* Native Language Selection - Using LanguageSelector */}
          <LanguageSelector
            title="I speak:"
            selectedLanguage={nativeLanguage}
            onSelectLanguage={setNativeLanguage}
          />

          {/* Target Language Selection - Using LanguageSelector */}
          <LanguageSelector
            title="I want to learn:"
            selectedLanguage={targetLanguage}
            onSelectLanguage={setTargetLanguage}
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
                >
                  <View style={[
                    styles.difficultyIconContainer,
                    difficulty === level.level && styles.selectedDifficultyIcon
                  ]}>
                    <Text style={styles.difficultyIcon}>{level.icon}</Text>
                  </View>
                  <Text style={[
                    styles.difficultyText,
                    difficulty === level.level && styles.selectedDifficultyText
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversation Themes (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={learningObjective}
                onChangeText={setLearningObjective}
                placeholder="• Ordering food at restaurants
- Past tense conjugation
- Travel and vacation vocabulary
- Business expressions"
                multiline
                scrollEnabled={false}
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#adb5bd"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              (!nativeLanguage || !targetLanguage) && styles.disabledButton,
              isLoading && styles.loadingButton
            ]}
            onPress={handleStartLearning}
            disabled={!nativeLanguage || !targetLanguage || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.startButtonText}>Start Learning</Text>
                <View style={styles.rocketContainer}>
                  <Text style={styles.startButtonIcon}>🚀</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <View style={styles.featureHeaderLine}>
            <View style={styles.lineDecoration}></View>
            <Text style={styles.featuresTitle}>Key Features</Text>
            <View style={styles.lineDecoration}></View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>🎙️</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Voice Conversation</Text>
              <Text style={styles.featureText}>Practice speaking with our AI tutor and get instant feedback</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIconContainer, styles.featureIconGrammar]}>
              <Text style={styles.featureIcon}>✍️</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Grammar Correction</Text>
              <Text style={styles.featureText}>Learn from your mistakes with real-time corrections</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIconContainer, styles.featureIconNatural]}>
              <Text style={styles.featureIcon}>🔄</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Natural Alternatives</Text>
              <Text style={styles.featureText}>Discover how native speakers would express the same ideas</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.featureIconContainer, styles.featureIconMultilingual]}>
              <Text style={styles.featureIcon}>🌐</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>18 Languages Supported</Text>
              <Text style={styles.featureText}>Learn multiple languages with the same intuitive interface</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.testButton}
          onPress={() => navigation.navigate('AudioTest')}
        >
          <Text style={styles.testButtonIcon}>🎤</Text>
          <Text style={styles.testButtonText}>Test Your Microphone</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 LangLearn • Privacy Policy • Terms of Service</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Enhanced color palette
const colors = {
  primary: '#5D6AF8',
  primaryLight: '#E8EAFF',
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
  background: '#f8f9fa',
  cardBackground: '#ffffff',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIconBackground: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(93, 106, 248, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 30,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lineDecoration: {
    height: 1,
    flex: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 12,
  },
  cardTitle: {
    fontSize: 20,
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
    backgroundColor: colors.gray50,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    width: '31%',
    shadowColor: colors.gray400,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedDifficulty: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  difficultyIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedDifficultyIcon: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  difficultyIcon: {
    fontSize: 20,
  },
  difficultyText: {
    fontWeight: '600',
    color: colors.gray800,
    textAlign: 'center',
    fontSize: 13,
  },
  selectedDifficultyText: {
    color: colors.primary,
    fontWeight: '700',
  },
  textAreaContainer: {
    width: '100%',
    marginTop: 12,
  },
  textArea: {
    width: '100%',
    minHeight: 120,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
    color: colors.gray800,
    backgroundColor: colors.white,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    alignSelf: 'center',
    minWidth: 220,
    flexDirection: 'row',
  },
  rocketContainer: {
    marginLeft: 8,
    marginBottom: -2,
  },
  startButtonIcon: {
    fontSize: 18,
    color: 'white',
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingButton: {
    backgroundColor: colors.primaryLight,
  },
  startButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  features: {
    marginBottom: 32,
  },
  featureHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
  },
  feature: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIconGrammar: {
    backgroundColor: `rgba(255, 107, 107, 0.1)`,
  },
  featureIconNatural: {
    backgroundColor: `rgba(6, 214, 160, 0.1)`,
  },
  featureIconMultilingual: {
    backgroundColor: `rgba(3, 169, 244, 0.1)`,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  featureText: {
    color: colors.gray600,
    fontSize: 14,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 40,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
    flexDirection: 'row',
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  testButtonIcon: {
    fontSize: 16,
    marginRight: 8,
    color: colors.primary,
  },
  testButtonText: {
    color: colors.gray700,
    fontWeight: '500',
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    color: colors.gray500,
    fontSize: 12,
    textAlign: 'center',
  },
  profileButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default LanguageLanding;