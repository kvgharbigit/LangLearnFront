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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
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
    const itemsPerRow = width > 500 ? 3 : 2;
    const padding = 32; // Total horizontal padding
    const gap = 12 * (itemsPerRow - 1); // Total gap between items
    return (width - padding - gap) / itemsPerRow;
  };

  return (
  <SafeAreaView style={styles.container}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>LangLearn</Text>
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
                  nativeLanguage === lang.code && styles.selectedOption,
                  { width: getItemWidth() }
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
                  nativeLanguage === lang.code && styles.disabledOption,
                  { width: getItemWidth() }
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
                  difficulty === level && styles.selectedOption,
                  { width: getItemWidth() }
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
          <Text style={styles.sectionTitle}>What would you like to practice? (Optional)</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              value={learningObjective}
              onChangeText={setLearningObjective}
              placeholder="Examples:\n• I want to practice ordering food at restaurants\n• Help me with past tense conjugation\n• Let's discuss travel and vacations\n• I need help with business vocabulary"
              multiline
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
            <Text style={styles.startButtonText}>Start Learning</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🎙️</Text>
          <Text style={styles.featureTitle}>Voice Conversation</Text>
          <Text style={styles.featureText}>Practice speaking with our AI tutor and get instant feedback</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>✍️</Text>
          <Text style={styles.featureTitle}>Grammar Correction</Text>
          <Text style={styles.featureText}>Learn from your mistakes with real-time corrections</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🔄</Text>
          <Text style={styles.featureTitle}>Natural Alternatives</Text>
          <Text style={styles.featureText}>Discover how native speakers would express the same ideas</Text>
        </View>
      </View>

      {/* New Microphone Test Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => navigation.navigate('AudioTest')}
      >
        <Text style={styles.testButtonText}>Microphone Test</Text>
      </TouchableOpacity>
    </ScrollView>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
    // Add these styles to your existing StyleSheet in LanguageLanding.tsx
  testButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  testButtonText: {
    color: '#495057',
    fontWeight: '500',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray600,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.gray700,
    marginBottom: 12,
    fontWeight: '500',
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  languageOption: {
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(93, 106, 248, 0.05)',
  },
  disabledOption: {
    opacity: 0.6,
  },
  languageFlag: {
    fontSize: 32,
    marginBottom: 8,
  },
  difficultyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  languageName: {
    fontWeight: '500',
    color: colors.gray800,
    textAlign: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  disabledText: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '500',
  },
  textAreaContainer: {
    width: '100%',
    marginTop: 12,
  },
  textArea: {
    width: '100%',
    minHeight: 120,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: 16,
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
    alignSelf: 'center',
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
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  featureText: {
    color: colors.gray600,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default LanguageLanding;