// src/components/ConversationModeSelector.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { getRandomTopicForMode } from '../utils/randomTopics';
import { useLanguage } from '../contexts/LanguageContext';

// Define conversation mode types
export type ConversationMode = 'topic_lesson' | 'free_conversation' | 'interview' | 'verb_challenge' | 'situation_simulation';

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
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);

  // Get translation function
  const { translate } = useLanguage();

  // Categorized options for conversation modes - now using translations
  const conversationCategories = [
    {
      title: translate('conversation.categories.conversations'),
      modes: [
        {
          id: 'free_conversation' as ConversationMode,
          label: translate('conversation.freeConversation.label'),
          icon: 'chatbubbles-outline',
          description: translate('conversation.freeConversation.description'),
          placeholder: translate('conversation.freeConversation.placeholder')
        },
        {
          id: 'topic_lesson' as ConversationMode,
          label: translate('conversation.topicLesson.label'),
          icon: 'school-outline',
          description: translate('conversation.topicLesson.description'),
          placeholder: translate('conversation.topicLesson.placeholder')
        },
        {
          id: 'interview' as ConversationMode,
          label: translate('conversation.interview.label'),
          icon: 'person-outline',
          description: translate('conversation.interview.description'),
          placeholder: translate('conversation.interview.placeholder')
        },
        {
          id: 'situation_simulation' as ConversationMode,
          label: translate('conversation.situationSimulation.label'),
          icon: 'game-controller-outline',
          description: translate('conversation.situationSimulation.description'),
          placeholder: translate('conversation.situationSimulation.placeholder')
        }
      ]
    },
    {
      title: translate('conversation.categories.languageLessons'),
      modes: [
        {
          id: 'verb_challenge' as ConversationMode,
          label: translate('conversation.verbChallenge.label'),
          icon: 'flash-outline',
          description: translate('conversation.verbChallenge.description'),
          placeholder: translate('conversation.verbChallenge.placeholder'),
          comingSoon: true
        },
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
    onChangePromptText(''); // Clear the topic/theme text box
    setIsDropdownVisible(false);
  };

  // Generate random topic based on conversation mode
  const generateRandomTopic = () => {
    if (isGeneratingTopic) return;
    
    setIsGeneratingTopic(true);
    
    // Small delay to show loading state
    setTimeout(() => {
      const randomTopic = getRandomTopicForMode(selectedMode);
      onChangePromptText(randomTopic);
      setIsGeneratingTopic(false);
    }, 200);
  };

  // Check if the Generate Random Topic button should be shown
  const shouldShowRandomTopicButton = () => {
    return selectedMode === 'free_conversation' || 
           selectedMode === 'interview' || 
           selectedMode === 'topic_lesson' ||
           selectedMode === 'situation_simulation';
  };

  // Render each option in the dropdown
  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedMode === item.id && styles.selectedDropdownItem,
        item.comingSoon && styles.dropdownItemDisabled
      ]}
      onPress={() => item.comingSoon ? null : handleSelectMode(item.id)}
      disabled={item.comingSoon}
    >
      <Ionicons
        name={item.icon as any}
        size={24}
        color={item.comingSoon ? colors.gray400 : (selectedMode === item.id ? colors.primary : colors.gray600)}
        style={styles.dropdownItemIcon}
      />
      <View style={styles.dropdownItemTextContainer}>
        <View style={styles.dropdownItemLabelContainer}>
          <Text style={[
            styles.dropdownItemLabel,
            selectedMode === item.id && styles.selectedDropdownItemText,
            item.comingSoon && styles.dropdownItemLabelDisabled
          ]}>
            {item.label}
          </Text>
          {item.comingSoon && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.dropdownItemDescription,
          item.comingSoon && styles.dropdownItemDescriptionDisabled
        ]}>
          {item.description}
        </Text>
      </View>
      {selectedMode === item.id && !item.comingSoon && (
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
      {/* Description box without icon */}
      <View style={styles.descriptionBox}>
        <View style={styles.descriptionBoxTextContainer}>
          <Text style={styles.descriptionBoxText}>
            {currentMode.description}
          </Text>
        </View>
      </View>

      {/* Topic/Theme input */}
      <View style={styles.promptContainer}>
        <Text style={styles.promptLabel}>{translate('conversation.topicTheme.label') || 'Topic/Theme'}</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={[
              styles.textArea,
              // Dynamically adjust height based on content length
              promptText.length > 50 && { minHeight: 140 },
              promptText.length > 100 && { minHeight: 160 },
              promptText.length > 150 && { minHeight: 180 },
              promptText.length > 200 && { minHeight: 200, maxHeight: 300 }
            ]}
            value={promptText}
            onChangeText={onChangePromptText}
            placeholder={currentMode.placeholder}
            multiline
            scrollEnabled={promptText.length > 300}
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
        
        {/* Random Topic Button - Better positioned below text area */}
        {shouldShowRandomTopicButton() && (
          <TouchableOpacity
            style={styles.randomTopicButton}
            onPress={generateRandomTopic}
            disabled={isGeneratingTopic}
          >
            <Ionicons 
              name="shuffle-outline" 
              size={18} 
              color={isGeneratingTopic ? colors.gray400 : colors.primary} 
            />
            <Text style={[
              styles.randomTopicButtonText,
              isGeneratingTopic && styles.randomTopicButtonTextDisabled
            ]}>
              {isGeneratingTopic ? translate('loading.generating') || 'Generating...' : translate('conversation.generateRandomTopic') || 'Generate Random Topic'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.promptInfoContainer}>
          <Text style={styles.promptInfoText}>
{translate('conversation.topicInfo') || 'Confluency can talk with you about any topic you can dream of - from dating advice to dancing, from Ancient Egypt to Taylor Swift!'}
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
              <Text style={styles.modalTitle}>{translate('conversation.selectMode') || 'Select Conversation Mode'}</Text>
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
    fontWeight: '500',
    marginBottom: 8,
  },
  randomTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  randomTopicButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  randomTopicButtonTextDisabled: {
    color: colors.gray400,
  },
  textAreaContainer: {
    width: '100%',
  },
  textArea: {
    width: '100%',
    minHeight: 120,
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
    marginTop: 8,
  },
  promptInfoText: {
    fontSize: 13,
    color: colors.gray600,
    flex: 1,
    textAlign: 'center',
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
  dropdownItemDisabled: {
    opacity: 0.6,
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
  dropdownItemLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  dropdownItemLabelDisabled: {
    color: colors.gray500,
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
  dropdownItemDescriptionDisabled: {
    color: colors.gray400,
  },
  comingSoonBadge: {
    backgroundColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray600,
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