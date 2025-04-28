// src/components/LanguageSelector.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, Language } from '../constants/languages';
import colors from '../styles/colors';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (languageCode: string) => void;
  excludeLanguage?: string;
  title: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  excludeLanguage,
  title
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get the currently selected language info
  const selectedLangInfo = LANGUAGES.find(lang => lang.code === selectedLanguage) ||
    { code: 'unknown', name: 'Select Language', flag: '🌎' };

  // Filter languages based on search query and excluded language
  const getFilteredLanguages = () => {
    return LANGUAGES.filter(lang => {
      const matchesSearch = lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lang.code.toLowerCase().includes(searchQuery.toLowerCase());
      const notExcluded = excludeLanguage ? lang.code !== excludeLanguage : true;
      return matchesSearch && notExcluded;
    });
  };

  // Calculate the optimal number of columns based on screen width
  const screenWidth = Dimensions.get('window').width;
  // Adjust this calculation for better responsiveness
  const numColumns = Math.max(2, Math.floor((screenWidth - 40) / 160));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectedLanguage}>
          <Text style={styles.languageFlag}>{selectedLangInfo.flag}</Text>
          <Text style={styles.languageName}>{selectedLangInfo.name}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.gray600} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close" size={22} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={colors.gray500} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search languages..."
                placeholderTextColor={colors.gray500}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            <FlatList
              data={getFilteredLanguages()}
              keyExtractor={(item) => item.code}
              numColumns={numColumns}
              key={numColumns} // This forces re-render when numColumns changes
              contentContainerStyle={styles.languageList}
              columnWrapperStyle={styles.columnWrapper}
              renderItem={({ item }) => {
                const isSelected = selectedLanguage === item.code;
                const isExcluded = excludeLanguage === item.code;

                return (
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      isSelected && styles.selectedOption,
                      isExcluded && styles.excludedOption
                    ]}
                    onPress={() => {
                      if (!isExcluded) {
                        onSelectLanguage(item.code);
                        setModalVisible(false);
                        setSearchQuery('');
                      }
                    }}
                    disabled={isExcluded}
                  >
                    <Text style={styles.optionFlag}>{item.flag}</Text>
                    <Text style={[
                      styles.optionName,
                      isSelected && styles.selectedText,
                      isExcluded && styles.excludedText
                    ]}>
                      {item.name}
                    </Text>

                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={12} color="white" />
                      </View>
                    )}

                    {isExcluded && (
                      <View style={styles.excludedBadge}>
                        <Text style={styles.excludedBadgeText}>Native</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyResult}>
                  <Ionicons name="search-outline" size={40} color={colors.gray400} />
                  <Text style={styles.emptyResultText}>No languages found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    color: colors.gray700,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 14,
    height: 60,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%', // Increased from 80% to give more room
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.gray800,
  },
  languageList: {
    padding: 8,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  languageOption: {
    margin: 8,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 130, // Fixed width for consistency
    minHeight: 110, // Fixed minimum height
    justifyContent: 'center',
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  excludedOption: {
    opacity: 0.6,
    backgroundColor: colors.gray200,
  },
  optionFlag: {
    fontSize: 28,
    marginBottom: 8,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray800,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.primary,
    fontWeight: '700',
  },
  excludedText: {
    color: colors.gray600,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.gray500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  excludedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyResult: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyResultText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.gray600,
  }
});

export default LanguageSelector;