// src/components/ConversationModeSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

// Define conversation mode types
export type ConversationMode = 'language_lesson' | 'topic_lesson' | 'free_conversation';

interface ConversationModeSelectorProps {
  selectedMode: ConversationMode;
  onSelectMode: (mode: ConversationMode) => void;
  promptText: string;
  onChangePromptText: (text: string) => void;
}

const ConversationModeSelector: React.FC<ConversationModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  promptText,
  onChangePromptText,
}) => {
  // Options for conversation modes
  const modeOptions = [
    {
      id: 'language_lesson' as ConversationMode,
      label: 'Language Lesson',
      icon: 'book-outline',
      description: 'Focus on language learning concepts (grammar, vocabulary, etc.)',
      placeholder: '• The Subjunctive Mood\n• Conjugating the Preterite \n• Food vocabulary'
    },
    {
      id: 'topic_lesson' as ConversationMode,
      label: 'Content Learning',
      icon: 'school-outline',
      description: 'Learn about specific topics while practicing the language',
      placeholder: '• History of Rome\n• Climate change\n• Modern art movements'
    },
    {
      id: 'free_conversation' as ConversationMode,
      label: 'Free Conversation',
      icon: 'chatbubbles-outline',
      description: 'Chat about anything - from TV shows to daily life',
      placeholder: '• Game of Thrones\n• My favorite hobby\n• Weekend plans'
    }
  ];

  // Get the currently selected mode's details
  const currentMode = modeOptions.find(mode => mode.id === selectedMode) || modeOptions[0];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Conversation Mode</Text>

      <View style={styles.modeButtonsContainer}>
        {modeOptions.map(mode => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.modeButton,
              selectedMode === mode.id && styles.selectedModeButton
            ]}
            onPress={() => onSelectMode(mode.id)}
          >
            <Ionicons
              name={mode.icon as any}
              size={20}
              color={selectedMode === mode.id ? colors.primary : colors.gray600}
            />
            <Text
              style={[
                styles.modeButtonText,
                selectedMode === mode.id && styles.selectedModeButtonText
              ]}
              numberOfLines={1}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.modeDescriptionContainer}>
        <Ionicons
          name={currentMode.icon as any}
          size={20}
          color={colors.primary}
          style={styles.descriptionIcon}
        />
        <Text style={styles.modeDescription}>{currentMode.description}</Text>
      </View>

      <View style={styles.promptContainer}>
        <Text style={styles.promptLabel}>Topic/Theme (Optional)</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            value={promptText}
            onChangeText={onChangePromptText}
            placeholder={currentMode.placeholder}
            multiline
            scrollEnabled={false}
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={colors.gray500}
          />
        </View>
        <View style={styles.promptInfoContainer}>
          <Ionicons name="information-circle" size={16} color={colors.info} />
          <Text style={styles.promptInfoText}>
            Leave empty for a random topic chosen by the AI tutor.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.gray700,
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '32%',
    shadowColor: colors.gray400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  selectedModeButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeButtonText: {
    fontWeight: '600',
    color: colors.gray700,
    fontSize: 13,
    textAlign: 'center',
  },
  selectedModeButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  modeDescriptionContainer: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  descriptionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.gray700,
    flex: 1,
    lineHeight: 20,
  },
  promptContainer: {
    width: '100%',
  },
  promptLabel: {
    fontSize: 15,
    color: colors.gray700,
    marginBottom: 8,
    fontWeight: '500',
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
  promptInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  promptInfoText: {
    fontSize: 13,
    color: colors.gray600,
    flex: 1,
  },
});

export default ConversationModeSelector;