// src/components/ConversationModeSelector.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

// Define conversation mode types
export type ConversationMode = 'language_lesson' | 'topic_lesson' | 'free_conversation' | 'interview' | 'verb_challenge' | 'noun_challenge' | 'situation_simulation';

interface ConversationModeSelectorProps {
  selectedMode: ConversationMode;
  onSelectMode: (mode: ConversationMode) => void;
  promptText: string;
  onChangePromptText: (text: string) => void;
  onPromptSubmit?: () => void; // Optional callback for when Enter is pressed
}

const ConversationModeSelector: React.FC<ConversationModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  promptText,
  onChangePromptText,
  onPromptSubmit,
}) => {
  // State for the dropdown modal
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // Categorized options for conversation modes
  const conversationCategories = [
    {
      title: 'Language Lessons',
      modes: [
        {
          id: 'language_lesson' as ConversationMode,
          label: 'Grammar Lesson',
          icon: 'book-outline',
          description: 'Master specific grammar rules, verb forms, and language structures with focused guidance.',
          placeholder: '• The Subjunctive Mood\n• Conjugating the Preterite \n• Common Verbs'
        },
        {
          id: 'verb_challenge' as ConversationMode,
          label: 'Verb Challenge',
          icon: 'flash-outline',
          description: 'Practice constructing sentences with essential verbs in different tenses and moods.',
          placeholder: '• Specific verb tenses to practice\n• Difficulty level preferences\n• Types of verbs'
        },
        {
          id: 'noun_challenge' as ConversationMode,
          label: 'Noun Challenge',
          icon: 'cube-outline',
          description: 'Build vocabulary and sentence skills using important nouns from your areas of interest.',
          placeholder: '• Categories of nouns\n• Specific topics\n• Difficulty preferences'
        }
      ]
    },
    {
      title: 'Conversations',
      modes: [
        {
          id: 'topic_lesson' as ConversationMode,
          label: 'Special Topic Lesson',
          icon: 'school-outline',
          description: 'Explore fascinating topics in your target language - history, culture, sport, geopolitics...',
          placeholder: '• History of Rome\n• Dog Training Tips\n• Modern Art Movements'
        },
        {
          id: 'free_conversation' as ConversationMode,
          label: 'Free Conversation',
          icon: 'chatbubbles-outline',
          description: 'Engage in natural, unstructured conversations about any topic that interests you.',
          placeholder: '• Game of Thrones\n• Golfing Tips\n• Holiday Destinations'
        },
        {
          id: 'interview' as ConversationMode,
          label: 'Interview',
          icon: 'person-outline',
          description: 'Express yourself naturally while answering questions about your interests, experiences and opinions.',
          placeholder: '• Your Hobbies\n• Travel Experiences\n• Life Goals'
        },
        {
          id: 'situation_simulation' as ConversationMode,
          label: 'Situation Simulation',
          icon: 'theatre-outline',
          description: 'Practice real-life conversations in common scenarios like restaurants, travel, and shopping.',
          placeholder: '• At a restaurant\n• Job interview\n• Airport check-in\n• Shopping for clothes'
        }
      ]
    }
  ];
  
  // Flatten the categories for use when we need to find a specific mode
  const modeOptions = conversationCategories.flatMap(category => category.modes);

  // Get the currently selected mode's details
  const currentMode = modeOptions.find(mode => mode.id === selectedMode) || modeOptions[0];

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible);
  };

  // Handle mode selection from dropdown
  const handleSelectMode = (mode: ConversationMode) => {
    onSelectMode(mode);
    setIsDropdownVisible(false);
  };

  // Render each option in the dropdown
  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedMode === item.id && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelectMode(item.id)}
    >
      <Ionicons
        name={item.icon as any}
        size={24}
        color={selectedMode === item.id ? colors.primary : colors.gray600}
        style={styles.dropdownItemIcon}
      />
      <View style={styles.dropdownItemTextContainer}>
        <Text style={[
          styles.dropdownItemLabel,
          selectedMode === item.id && styles.selectedDropdownItemText
        ]}>
          {item.label}
        </Text>
        <Text style={styles.dropdownItemDescription}>
          {item.description}
        </Text>
      </View>
      {selectedMode === item.id && (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Conversation Mode</Text>

      {/* Dropdown button */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={toggleDropdown}
        accessibilityLabel="Select conversation mode"
      >
        <View style={styles.selectedModeContainer}>
          <Ionicons
            name={currentMode.icon as any}
            size={20}
            color={colors.primary}
            style={styles.selectedModeIcon}
          />
          <Text style={styles.selectedModeText}>
            {currentMode.label}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.gray600} />
      </TouchableOpacity>

      {/* Mode description */}
      {/* Completely rebuilt description box */}
      <View style={styles.descriptionBox}>
        <View style={styles.descriptionBoxIcon}>
          <Ionicons
            name={currentMode.icon as any}
            size={24}
            color={colors.primary}
          />
        </View>
        <View style={styles.descriptionBoxTextContainer}>
          <Text style={styles.descriptionBoxText}>
            {currentMode.description}
          </Text>
        </View>
      </View>

      {/* Topic/Theme input */}
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
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (onPromptSubmit) {
                onPromptSubmit();
              }
            }}
            returnKeyType="go"
            onKeyPress={(e) => {
              // Additional handling for web or platforms that support direct key events
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey && onPromptSubmit) {
                e.preventDefault?.();
                onPromptSubmit();
              }
            }}
          />
        </View>
        <View style={styles.promptInfoContainer}>
          <Ionicons name="information-circle" size={16} color={colors.info} />
          <Text style={styles.promptInfoText}>
            Choose a topic you want to chat/learn about! Leave empty and the AI will suggest a topic :)
          </Text>
        </View>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={isDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Conversation Mode</Text>
              <TouchableOpacity onPress={() => setIsDropdownVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={conversationCategories}
              renderItem={({ item: category }) => (
                <View>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  {category.modes.map((mode, index) => (
                    <React.Fragment key={mode.id}>
                      {renderDropdownItem({ item: mode })}
                      {index < category.modes.length - 1 && <View style={styles.separator} />}
                    </React.Fragment>
                  ))}
                  {/* Add spacing after category except the last one */}
                  <View style={styles.categorySpacing} />
                </View>
              )}
              keyExtractor={item => item.title}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  selectedModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedModeIcon: {
    marginRight: 10,
  },
  selectedModeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  // New description box styles
  descriptionBox: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EBFF',
    flexDirection: 'row',
  },
  descriptionBoxIcon: {
    marginRight: 12,
    width: 30,
    alignItems: 'center',
  },
  descriptionBoxTextContainer: {
    flex: 1,
  },
  descriptionBoxText: {
    fontSize: 15,
    color: colors.gray800,
    fontWeight: '500',
    lineHeight: 22,
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
    paddingHorizontal: 16,
    paddingTop: 8,  // Reduced from 16 to bring text closer to top
    paddingBottom: 16,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    color: colors.gray800,
    backgroundColor: colors.white,
  },
  promptInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  promptInfoText: {
    fontSize: 13,
    color: colors.gray600,
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  // Dropdown item styles
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectedDropdownItem: {
    backgroundColor: colors.gray200, // Lighter background for better contrast 
  },
  dropdownItemIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  dropdownItemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  selectedDropdownItemText: {
    color: colors.primary,
    fontWeight: '700', // Make text bolder for better readability
  },
  dropdownItemDescription: {
    fontSize: 13,
    color: colors.gray600,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 16,
  },
  // Category styles
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  categorySpacing: {
    height: 16,
    backgroundColor: colors.gray50,
    marginTop: 8,
  },
});

export default ConversationModeSelector;