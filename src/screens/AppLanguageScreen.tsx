import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LANGUAGES } from '../constants/languages';
import { useLanguage } from '../contexts/LanguageContext';
import colors from '../styles/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AppLanguage'>;

const AppLanguageScreen: React.FC<Props> = ({ navigation }) => {
  const { appLanguage, setAppLanguage, translate } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(appLanguage);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await setAppLanguage(selectedLanguage);
      // Short delay to show loading state
      setTimeout(() => {
        setIsLoading(false);
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('Error saving app language:', error);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translate('profile.app.language')}</Text>
        <View style={styles.placeholderButton} />
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.languageItem,
              selectedLanguage === item.code && styles.selectedLanguageItem
            ]}
            onPress={() => handleLanguageSelect(item.code)}
          >
            <View style={styles.flagContainer}>
              <Text style={styles.flagText}>{item.flag}</Text>
            </View>
            <View style={styles.languageInfoContainer}>
              <Text style={styles.languageName}>{item.name}</Text>
              <Text style={styles.languageNativeName}>
                {item.nativeName || item.name}
              </Text>
            </View>
            {selectedLanguage === item.code && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            selectedLanguage === appLanguage && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={selectedLanguage === appLanguage || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{translate('button.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  placeholderButton: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedLanguageItem: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  flagContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  flagText: {
    fontSize: 24,
  },
  languageInfoContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  languageNativeName: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AppLanguageScreen;