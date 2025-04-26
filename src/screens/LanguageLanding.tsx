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
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

// Get screen dimensions for responsive design
const { width } = Dimensions.get('window');

// Language interface
interface Language {
  code: string;
  name: string;
  flag: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageLanding'>;

const LanguageLanding: React.FC<Props> = ({ navigation }) => {
  // Auth state
  const { user } = useAuth();

  // State
  const [nativeLanguage, setNativeLanguage] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [learningObjective, setLearningObjective] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Language options
  const languages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' }
  ];

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

  // For responsive layouts, calculate item width
  const getItemWidth = (): number => {
    const itemsPerRow = width > 500 ? 4 : 2;
    const padding = 40; // Total horizontal padding
    const gap = 10 * (itemsPerRow - 1); // Total gap between items
    return (width - padding - gap) / itemsPerRow;
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🌎</Text>
            <Text style={styles.title}>LangLearn</Text>
          </View>
          <Text style={styles.tagline}>Your AI-powered language learning companion</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose Your Languages</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I speak:</Text>
            <View style={styles.languageOptions}>
              {languages.map(lang => (
                <TouchableOpacity
                  key={`native-${lang.code}`}
                  style={[
                    styles.languageOption,
                    nativeLanguage === lang.code && styles.selectedOption
                  ]}
                  onPress={() => setNativeLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    nativeLanguage === lang.code && styles.selectedText
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I want to learn:</Text>
            <View style={styles.languageOptions}>
              {languages.map(lang => (
                <TouchableOpacity
                  key={`target-${lang.code}`}
                  style={[
                    styles.languageOption,
                    targetLanguage === lang.code && styles.selectedOption,
                    nativeLanguage === lang.code && styles.disabledOption
                  ]}
                  disabled={nativeLanguage === lang.code}
                  onPress={() => nativeLanguage !== lang.code && setTargetLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    targetLanguage === lang.code && styles.selectedText
                  ]}>
                    {lang.name}
                  </Text>
                  {nativeLanguage === lang.code && (
                    <View style={styles.disabledOverlay}>
                      <Text style={styles.disabledText}>Already speak</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My level:</Text>
            <View style={styles.languageOptions}>
              {['beginner', 'intermediate', 'advanced'].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.languageOption,
                    difficulty === level && styles.selectedOption
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text style={styles.difficultyIcon}>
                    {level === 'beginner' ? '🌱' : level === 'intermediate' ? '🌿' : '🌳'}
                  </Text>
                  <Text style={[
                    styles.languageName,
                    difficulty === level && styles.selectedText
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
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
• Past tense conjugation
• Travel and vacation vocabulary
• Business expressions"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.startButtonIcon}>🚀</Text>
                <Text style={styles.startButtonText}>Start Learning</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Key Features</Text>

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
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>✍️</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Grammar Correction</Text>
              <Text style={styles.featureText}>Learn from your mistakes with real-time corrections</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>🔄</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Natural Alternatives</Text>
              <Text style={styles.featureText}>Discover how native speakers would express the same ideas</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginVertical: 28,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 36,
    marginRight: 10,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.gray700,
    marginBottom: 14,
    fontWeight: '600',
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  languageOption: {
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    height: 85,
    justifyContent: 'center',
    aspectRatio: 1, // Makes the buttons perfectly square
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93, 106, 248, 0.08)',
  },
  disabledOption: {
    opacity: 0.6,
  },
  languageFlag: {
    fontSize: 28,
    marginBottom: 6,
  },
  difficultyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  languageName: {
    fontWeight: '600',
    color: colors.gray800,
    textAlign: 'center',
    fontSize: 11,
  },
  selectedText: {
    color: colors.primary,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  disabledText: {
    color: colors.gray700,
    fontSize: 10,
    fontWeight: '500',
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  textAreaContainer: {
    width: '100%',
    marginTop: 12,
  },
  textArea: {
    width: '100%',
    minHeight: 130,
    maxHeight: 130,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 16,
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    lineHeight: 24,
    textAlignVertical: 'top',
    color: colors.gray800,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 220,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  startButtonIcon: {
    fontSize: 18,
    color: 'white',
    marginRight: 8,
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
  },
  features: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 20,
    textAlign: 'center',
  },
  feature: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(93, 106, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  featureText: {
    color: colors.gray600,
    fontSize: 14,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: colors.gray100,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 40,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  testButtonIcon: {
    fontSize: 16,
    marginRight: 8,
    color: colors.primary,
  },
  testButtonText: {
    color: colors.gray700,
    fontWeight: '500',
    fontSize: 15,
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
  // Profile button styles
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default LanguageLanding;