// src/components/DifficultyLevelSelector.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIFFICULTY_LEVELS, DifficultyLevel } from '../constants/languages';
import colors from '../styles/colors';

interface DifficultyLevelSelectorProps {
  selectedLevel: DifficultyLevel;
  onSelectLevel: (level: DifficultyLevel) => void;
}

const DifficultyLevelSelector: React.FC<DifficultyLevelSelectorProps> = ({
  selectedLevel,
  onSelectLevel,
}) => {
  // State for the dropdown modal
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // Get the currently selected level's details
  const currentLevel = DIFFICULTY_LEVELS.find(level => level.level === selectedLevel) || DIFFICULTY_LEVELS[0];

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setIsDropdownVisible(!isDropdownVisible);
  };

  // Handle level selection from dropdown
  const handleSelectLevel = (level: DifficultyLevel) => {
    onSelectLevel(level);
    setIsDropdownVisible(false);
  };

  // Render each option in the dropdown
  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        selectedLevel === item.level && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelectLevel(item.level)}
      accessibilityLabel={item.label}
      accessibilityHint={`Set your proficiency level to ${item.label}`}
    >
      <View style={[
        styles.levelIconContainer,
        selectedLevel === item.level && styles.selectedLevelIcon
      ]}>
        <Text style={styles.levelIcon}>{item.icon}</Text>
      </View>
      <View style={styles.dropdownItemTextContainer}>
        <Text style={[
          styles.dropdownItemLabel,
          selectedLevel === item.level && styles.selectedDropdownItemText
        ]}>
          {item.label}
        </Text>
      </View>
      {selectedLevel === item.level && (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>My level:</Text>
      
      {/* Dropdown button */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={toggleDropdown}
        accessibilityLabel="Select difficulty level"
      >
        <View style={styles.selectedLevelContainer}>
          <View style={styles.selectedLevelIconWrapper}>
            <Text style={styles.selectedLevelIconText}>{currentLevel.icon}</Text>
          </View>
          <Text style={styles.selectedLevelText}>
            {currentLevel.label}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.gray600} />
      </TouchableOpacity>

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
              <Text style={styles.modalTitle}>Select Difficulty Level</Text>
              <TouchableOpacity onPress={() => setIsDropdownVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DIFFICULTY_LEVELS}
              renderItem={renderDropdownItem}
              keyExtractor={item => item.level}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  selectedLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLevelIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: colors.gray300,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  selectedLevelIconText: {
    fontSize: 20,
  },
  selectedLevelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
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
  levelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: colors.gray300,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedLevelIcon: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  levelIcon: {
    fontSize: 22,
  },
  dropdownItemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  dropdownItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  selectedDropdownItemText: {
    color: colors.primary,
    fontWeight: '700', // Make text bolder for better readability
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 16,
  },
});

export default DifficultyLevelSelector;