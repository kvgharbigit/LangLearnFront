// src/components/LanguageTips.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { getLanguageInfo } from '../constants/languages';

interface LanguageTipsProps {
  language: string;
}

const LanguageTips: React.FC<LanguageTipsProps> = ({ language }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const languageInfo = getLanguageInfo(language);

  // Get language-specific tips
  const getTips = (): { title: string; tips: string[] } => {
    const commonTips = [
      "Speak slowly and clearly.",
      "Don't worry about making mistakes - they're part of learning!",
      "Try to practice a little every day.",
      "Focus on common, everyday phrases first.",
      "Listen carefully to the tutor's pronunciations and try to mimic them."
    ];

    const languageTips: Record<string, string[]> = {
      'es': [
        "Spanish uses inverted question marks (¿) at the beginning of questions.",
        "Pay attention to gender (masculine/feminine) for nouns.",
        "Practice rolling your 'r' sounds.",
        "The verb 'ser' is used for permanent traits, while 'estar' is for temporary states."
      ],
      'fr': [
        "French has nasal sounds that don't exist in English.",
        "Pay attention to silent letters at the end of words.",
        "Practice liaison - connecting words that end in consonants with words that start with vowels.",
        "Focus on mastering the difference between 'tu' (informal) and 'vous' (formal)."
      ],
      'de': [
        "All nouns in German are capitalized.",
        "German has three genders: masculine, feminine, and neuter.",
        "Word order can be different from English, with verbs often at the end of clauses.",
        "Practice compound words - German combines words to create new ones."
      ],
      'it': [
        "Italian is a phonetic language - words are pronounced as they're spelled.",
        "Double consonants are pronounced longer/stronger than single ones.",
        "Verbs change dramatically based on who is performing the action.",
        "Hand gestures are an important part of Italian communication."
      ],
      'pt': [
        "Portuguese has nasal sounds marked by a tilde (~).",
        "Brazilian and European Portuguese have different pronunciations.",
        "Practice the difference between 'ser' and 'estar' verbs.",
        "Pay attention to contractions like 'no' (em + o) and 'na' (em + a)."
      ],
      'zh': [
        "Mandarin is a tonal language with four main tones.",
        "Characters represent concepts rather than sounds.",
        "Practice writing characters to help remember them.",
        "Word order is similar to English (Subject-Verb-Object)."
      ],
      'ja': [
        "Japanese has three writing systems: hiragana, katakana, and kanji.",
        "Practice proper sentence structure with verbs at the end.",
        "Pay attention to politeness levels in speech.",
        "Learn counting with different counters for different types of objects."
      ],
      'ko': [
        "Korean has a phonetic alphabet (Hangul) that's relatively easy to learn.",
        "Verbs come at the end of sentences.",
        "Honorifics are important in Korean speech.",
        "Practice formal vs. informal speech styles."
      ],
      'ar': [
        "Arabic is written and read from right to left.",
        "Many letters change form depending on their position in a word.",
        "Practice throat sounds that don't exist in English.",
        "Most words have a three-consonant root that carries the basic meaning."
      ],
      'hi': [
        "Hindi has retroflex consonants pronounced with the tongue curled back.",
        "The Devanagari script is phonetic - what you see is what you say.",
        "Gender affects verbs and adjectives.",
        "Word order typically follows Subject-Object-Verb pattern."
      ],
      'ru': [
        "Russian uses the Cyrillic alphabet.",
        "Pay attention to stress in words, as it can change meaning.",
        "Practice cases - words change form based on their function in a sentence.",
        "Verbs of motion have specific forms for different types of movement."
      ],
      'nl': [
        "Dutch pronunciation includes the 'g' sound made in the back of the throat.",
        "Word order can be different from English in questions and subordinate clauses.",
        "There are many cognates with English that make vocabulary easier.",
        "Practice the difference between 'de' and 'het' articles."
      ],
      'pl': [
        "Polish has many consonant clusters that can be challenging.",
        "Practice the nasal vowels 'ą' and 'ę'.",
        "Words change form extensively based on their grammatical role (cases).",
        "Stress is usually on the second-to-last syllable."
      ],
      'hu': [
        "Hungarian uses vowel harmony - vowels in suffixes match the vowels in the stem.",
        "Words can get very long due to agglutination (adding suffixes).",
        "Practice the unique sounds like 'gy', 'ny', and 'ty'.",
        "Word order is flexible but carries nuanced meanings."
      ],
      'fi': [
        "Finnish words can get very long due to adding suffixes.",
        "There are 15 grammatical cases that change word endings.",
        "Vowel harmony means certain vowels can't appear together in native words.",
        "Stress is always on the first syllable."
      ],
      'el': [
        "Modern Greek pronunciation is different from Ancient Greek.",
        "Practice the unique sounds like 'γ' (gamma) and 'θ' (theta).",
        "Verbs change form based on who is performing the action.",
        "Stress marks are important for correct pronunciation."
      ],
      'tr': [
        "Turkish has vowel harmony - vowels in suffixes match the vowels in the stem.",
        "The language is agglutinative, with many suffixes added to words.",
        "The letter 'ı' (without a dot) is different from 'i' (with a dot).",
        "Word order typically follows Subject-Object-Verb pattern."
      ]
    };

    // Combine common tips with language-specific tips
    const specificTips = languageTips[language] || [];

    return {
      title: `Tips for Learning ${languageInfo.name}`,
      tips: [...specificTips, ...commonTips]
    };
  };

  const { title, tips } = getTips();

  return (
    <>
      <TouchableOpacity
        style={styles.tipButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="bulb-outline" size={18} color={colors.primary} />
        <Text style={styles.tipButtonText}>Language Tips</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.flag}>{languageInfo.flag}</Text>
                <Text style={styles.modalTitle}>{title}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.tipsList}>
              {tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipBullet}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  tipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 8,
  },
  tipButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsList: {
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipBullet: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    fontSize: 16,
    color: colors.gray700,
    flex: 1,
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default LanguageTips;