// src/components/LanguageDropdown.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  TextInput,
  Dimensions,
  ScrollView,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, Language } from '../constants/languages';
import colors from '../styles/colors';

interface LanguageDropdownProps {
  value: string;
  onChange: (languageCode: string) => void;
  excludeLanguage?: string;
  placeholder?: string;
  label?: string;
  error?: string;
}

const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  value,
  onChange,
  excludeLanguage,
  placeholder = 'Select a language',
  label,
  error
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(LANGUAGES);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [dropdownHeight, setDropdownHeight] = useState(0);

  // Get selected language info
  const selectedLanguage = LANGUAGES.find(lang => lang.code === value);

  // Filter languages on search query change
  useEffect(() => {
    if (searchQuery) {
      const filtered = LANGUAGES.filter(lang => {
        // Skip excluded language
        if (excludeLanguage && lang.code === excludeLanguage) return false;

        // Search by name or code
        const normalizedQuery = searchQuery.toLowerCase();
        return (
          lang.name.toLowerCase().includes(normalizedQuery) ||
          lang.code.toLowerCase().includes(normalizedQuery)
        );
      });
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages(
        excludeLanguage
          ? LANGUAGES.filter(lang => lang.code !== excludeLanguage)
          : LANGUAGES
      );
    }
  }, [searchQuery, excludeLanguage]);

  // Group languages by regions to create categories
  const groupedLanguages = () => {
    // Language regions
    const regions = {
      europe: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'pl', 'nl', 'hu', 'fi', 'el'],
      asia: ['zh', 'ja', 'ko', 'hi'],
      middleEast: ['ar', 'tr'],
    };

    const grouped = {
      popular: ['en', 'es', 'fr', 'zh', 'de', 'ja'],
      europe: [] as Language[],
      asia: [] as Language[],
      middleEast: [] as Language[],
      other: [] as Language[]
    };

    // Place each language in its region group
    filteredLanguages.forEach(lang => {
      if (regions.europe.includes(lang.code)) {
        grouped.europe.push(lang);
      } else if (regions.asia.includes(lang.code)) {
        grouped.asia.push(lang);
      } else if (regions.middleEast.includes(lang.code)) {
        grouped.middleEast.push(lang);
      } else {
        grouped.other.push(lang);
      }
    });

    return grouped;
  };

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    if (modalVisible) {
      setModalVisible(false);
      setSearchQuery('');
    } else {
      setModalVisible(true);
    }
  };

  // Select a language
  const handleSelect = (languageCode: string) => {
    onChange(languageCode);
    setModalVisible(false);
    setSearchQuery('');
  };

  // Calculate dimensions and categories for the grid view
  const windowWidth = Dimensions.get('window').width;
  const numColumns = Math.floor(windowWidth / 130); // Adaptive column count based on screen width

  // Get grouped languages
  const grouped = groupedLanguages();

  // Only show categories that have languages
  const categories = [
    { key: 'popular', title: 'Popular', data: grouped.popular },
    { key: 'europe', title: 'European', data: grouped.europe },
    { key: 'asia', title: 'Asian', data: grouped.asia },
    { key: 'middleEast', title: 'Middle East', data: grouped.middleEast },
    { key: 'other', title: 'Other', data: grouped.other }
  ].filter(category =>
    // Only show the "Popular" category when not searching
    (category.key === 'popular' && !searchQuery) ||
    // Show other categories if they have items
    (category.key !== 'popular' && category.data.length > 0)
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.dropdown, error && styles.dropdownError]}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        {selectedLanguage ? (
          <View style={styles.selectedLanguage}>
            <Text style={styles.flagText}>{selectedLanguage.flag}</Text>
            <Text style={styles.selectedLanguageText}>{selectedLanguage.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={colors.gray600} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleDropdown}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity style={styles.closeButton} onPress={toggleDropdown}>
                <Ionicons name="close" size={22} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.gray500} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                placeholderTextColor={colors.gray500}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={18} color={colors.gray500} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.languageListContainer}>
              {searchQuery ? (
                // Show flat list when searching
                <View style={styles.searchResults}>
                  {filteredLanguages.length === 0 ? (
                    <View style={styles.noResults}>
                      <Ionicons name="search" size={48} color={colors.gray300} />
                      <Text style={styles.noResultsText}>No languages found</Text>
                    </View>
                  ) : (
                    <View style={styles.searchResultsList}>
                      {filteredLanguages.map(lang => {
                        const isExcluded = excludeLanguage === lang.code;
                        const isSelected = value === lang.code;

                        return (
                          <TouchableOpacity
                            key={lang.code}
                            style={[
                              styles.languageItem,
                              isSelected && styles.selectedItem,
                              isExcluded && styles.excludedItem
                            ]}
                            onPress={() => !isExcluded && handleSelect(lang.code)}
                            disabled={isExcluded}
                          >
                            <Text style={styles.languageFlag}>{lang.flag}</Text>
                            <Text style={[
                              styles.languageName,
                              isSelected && styles.selectedLanguageName
                            ]}>
                              {lang.name}
                            </Text>
                            {isSelected && (
                              <View style={styles.checkmark}>
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : (
                // Show categorized list when not searching
                <View style={styles.categorizedList}>
                  {categories.map(category => (
                    <View key={category.key} style={styles.category}>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <View style={styles.languageGrid}>
                        {category.data
                          .filter(lang => excludeLanguage !== lang.code)
                          .map(lang => {
                            const isSelected = value === lang.code;

                            return (
                              <TouchableOpacity
                                key={lang.code}
                                style={[
                                  styles.gridItem,
                                  isSelected && styles.selectedGridItem
                                ]}
                                onPress={() => handleSelect(lang.code)}
                              >
                                <Text style={styles.gridItemFlag}>{lang.flag}</Text>
                                <Text style={[
                                  styles.gridItemName,
                                  isSelected && styles.selectedGridItemName
                                ]} numberOfLines={2}>
                                  {lang.name}
                                </Text>
                                {isSelected && (
                                  <View style={styles.gridItemCheckmark}>
                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dropdownError: {
    borderColor: colors.danger,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagText: {
    fontSize: 22,
    marginRight: 12,
  },
  selectedLanguageText: {
    fontSize: 16,
    color: colors.gray800,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.gray500,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: 4,
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
    maxWidth: 600,
    maxHeight: '80%',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    marginLeft: 8,
    color: colors.gray800,
  },
  clearButton: {
    padding: 4,
  },
  languageListContainer: {
    maxHeight: 500,
    paddingBottom: 16,
  },
  searchResults: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.gray600,
  },
  searchResultsList: {
    paddingVertical: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    position: 'relative',
  },
  selectedItem: {
    backgroundColor: colors.primaryLight,
  },
  excludedItem: {
    opacity: 0.5,
    backgroundColor: colors.gray100,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageName: {
    fontSize: 16,
    color: colors.gray800,
  },
  selectedLanguageName: {
    fontWeight: '600',
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categorizedList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  category: {
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    paddingVertical: 8,
  },
  gridItem: {
    width: '33.33%',
    minWidth: 110,
    paddingHorizontal: 4,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  selectedGridItem: {
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },
  gridItemFlag: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
    height: 32,
    lineHeight: 32,
  },
  gridItemName: {
    fontSize: 13,
    textAlign: 'center',
    color: colors.gray800,
    numberOfLines: 2,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  selectedGridItemName: {
    fontWeight: '600',
    color: colors.primary,
  },
  gridItemCheckmark: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LanguageDropdown;