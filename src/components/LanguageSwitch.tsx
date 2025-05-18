// src/components/LanguageSwitch.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { LANGUAGES, getLanguageInfo } from '../constants/languages';

interface LanguageSwitchProps {
  currentLanguage: string;
  nativeLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  currentLanguage,
  nativeLanguage,
  onLanguageChange
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Get current language info
  const languageInfo = getLanguageInfo(currentLanguage);

  // Filter out native language from options
  const availableLanguages = LANGUAGES.filter(lang => lang.code !== nativeLanguage);

  // Calculate number of columns based on screen width
  const numColumns = Dimensions.get('window').width > 500 ? 3 : 2;

  return (
    <>
      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.flag}>{languageInfo.flag}</Text>
        <Text style={styles.languageCode}>{languageInfo.code.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.gray600} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Language</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableLanguages}
              numColumns={numColumns}
              keyExtractor={(item) => item.code}
              columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
              contentContainerStyle={styles.languageList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    currentLanguage === item.code && styles.selectedOption,
                  ]}
                  onPress={() => {
                    onLanguageChange(item.code);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLanguage === item.code && styles.selectedText
                  ]}>
                    {item.name}
                  </Text>
                  {currentLanguage === item.code && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray300,
    gap: 4,
  },
  flag: {
    fontSize: 16,
  },
  languageCode: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
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
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
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
  languageOption: {
    flex: 1,
    backgroundColor: colors.gray50,
    margin: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    position: 'relative',
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  languageFlag: {
    fontSize: 24,
    marginBottom: 8,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.primary,
    fontWeight: '700',
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
  languageList: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-evenly',
    marginVertical: 4,
  },
});

export default LanguageSwitch;