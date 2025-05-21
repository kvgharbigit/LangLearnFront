// src/components/LanguageSelector.tsx

import React, { useState, useEffect } from 'react';
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

// Define available languages - only English available for now
const AVAILABLE_LANGUAGES = ['en'];

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
  const [selectedLangInfo, setSelectedLangInfo] = useState<Language>({
    code: 'unknown',
    name: 'Select Language',
    nativeName: 'Select Language',
    flag: '🌎'
  });

  // Update selected language info when selectedLanguage prop changes
  useEffect(() => {
    const langInfo = LANGUAGES.find(lang => lang.code === selectedLanguage);
    if (langInfo) {
      setSelectedLangInfo(langInfo);
    } else if (selectedLanguage) {
      // If we have a language code but no matching info, use a placeholder
      setSelectedLangInfo({
        code: selectedLanguage,
        name: selectedLanguage.toUpperCase(),
        nativeName: selectedLanguage.toUpperCase(),
        flag: '🌎'
      });
    }
  }, [selectedLanguage]);

  // Filter languages based on search query and excluded language
  const getFilteredLanguages = () => {
    const filtered = LANGUAGES.filter(lang => {
      const matchesSearch = lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           lang.code.toLowerCase().includes(searchQuery.toLowerCase());
      const notExcluded = excludeLanguage ? lang.code !== excludeLanguage : true;
      return matchesSearch && notExcluded;
    });
    
    // Sort available languages to top
    return filtered.sort((a, b) => {
      const aAvailable = AVAILABLE_LANGUAGES.includes(a.code);
      const bAvailable = AVAILABLE_LANGUAGES.includes(b.code);
      
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;
      return 0;
    });
  };

  // Calculate the optimal number of columns based on screen width
  const screenWidth = Dimensions.get('window').width;
  // Adjust this calculation for better responsiveness
  const modalContentMaxWidth = Math.min(screenWidth - 40, 500);
  const numColumns = Math.max(2, Math.floor((modalContentMaxWidth - 32) / 140));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity
        style={[
          styles.selector,
          selectedLanguage ? styles.selectorSelected : styles.selectorEmpty
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectedLanguage}>
          <Text style={styles.languageFlag}>{selectedLangInfo.flag}</Text>
          <Text style={[
            styles.languageName,
            selectedLanguage ? styles.languageNameSelected : styles.languageNameEmpty
          ]}>
            {selectedLangInfo.name}
          </Text>
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
              columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
              renderItem={({ item }) => {
                const isSelected = selectedLanguage === item.code;
                const isExcluded = excludeLanguage === item.code;

                return (
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      isSelected && styles.selectedOption,
                      isExcluded && styles.excludedOption,
                      !AVAILABLE_LANGUAGES.includes(item.code) && styles.comingSoonOption
                    ]}
                    onPress={() => {
                      if (!isExcluded && AVAILABLE_LANGUAGES.includes(item.code)) {
                        onSelectLanguage(item.code);
                        setModalVisible(false);
                        setSearchQuery('');
                      }
                    }}
                    disabled={isExcluded || !AVAILABLE_LANGUAGES.includes(item.code)}
                  >
                    <Text style={styles.optionFlag}>{item.flag}</Text>
                    <Text style={[
                      styles.optionName,
                      isSelected && styles.selectedText,
                      isExcluded && styles.excludedText,
                      !AVAILABLE_LANGUAGES.includes(item.code) && styles.comingSoonText
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
                    
                    {!AVAILABLE_LANGUAGES.includes(item.code) && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
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

            {/* Recently used languages section */}
            {selectedLanguage && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Previously Selected</Text>
                <TouchableOpacity
                  style={styles.recentLanguage}
                  onPress={() => {
                    onSelectLanguage(selectedLanguage);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.recentFlag}>{selectedLangInfo.flag}</Text>
                  <Text style={styles.recentName}>{selectedLangInfo.name}</Text>
                </TouchableOpacity>
              </View>
            )}
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    height: 60,
  },
  selectorEmpty: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray300,
  },
  selectorSelected: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray400,
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
  },
  languageNameEmpty: {
    color: colors.gray600,
  },
  languageNameSelected: {
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
    maxHeight: '90%',
    flex: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-evenly',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  languageOption: {
    margin: 6,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    flex: 1,
    minWidth: 110,
    maxWidth: 160,
    minHeight: 100,
    justifyContent: 'center',
  },
  selectedOption: {
    borderColor: colors.gray600,
    backgroundColor: colors.gray100,
  },
  excludedOption: {
    opacity: 0.6,
    backgroundColor: colors.gray200,
  },
  comingSoonOption: {
    opacity: 0.5,
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
    color: colors.gray800,
    fontWeight: '700',
  },
  excludedText: {
    color: colors.gray600,
  },
  comingSoonText: {
    color: colors.gray600,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gray600,
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
  comingSoonBadge: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    backgroundColor: colors.gray500,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
  },
  comingSoonBadgeText: {
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
  },
  recentSection: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    padding: 16,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 12,
  },
  recentLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray800,
  },
});

export default LanguageSelector;