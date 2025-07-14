import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Platform,
  Alert
} from 'react-native';
import SafeView from '../components/SafeView';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LANGUAGES } from '../constants/languages';
import { useLanguage } from '../contexts/LanguageContext';
import colors from '../styles/colors';
import { isNativeLanguageSupported } from '../config/nativeLanguages';

type Props = NativeStackScreenProps<RootStackParamList, 'AppLanguage'>;

const AppLanguageScreen: React.FC<Props> = ({ navigation }) => {
  const { appLanguage, setAppLanguage, translate } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(appLanguage);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(15)).current;
  
  useEffect(() => {
    // Run entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

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
  
  // Item separator for the FlatList
  const ItemSeparator = () => <View style={styles.separator} />;

  // Render individual language item
  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage === item.code && styles.selectedLanguageItem
      ]}
      onPress={() => handleLanguageSelect(item.code)}
      accessibilityLabel={`Select ${item.name} language`}
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
        <View style={styles.checkmarkContainer}>
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translate('profile.app.language')}</Text>
        <View style={styles.placeholderButton} />
      </View>

      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.animatedContent,
            { opacity: fadeAnim, transform: [{ translateY }] }
          ]}
        >
          <View style={styles.instructionContainer}>
            <Ionicons name="language" size={22} color={colors.primary} />
            <Text style={styles.instructionText}>
              Select your preferred app interface language
            </Text>
          </View>

          {/* Info notice about consolidated language setting */}
          <View style={styles.infoNotice}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              💡 Tip: When you select "I speak" on the main screen, the app language will automatically change to match your native language.
            </Text>
          </View>
          
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.listContent}
            renderItem={renderLanguageItem}
            ItemSeparatorComponent={ItemSeparator}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            selectedLanguage === appLanguage && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={selectedLanguage === appLanguage || isLoading}
          accessibilityLabel="Save language selection"
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>{translate('button.save')}</Text>
              {selectedLanguage !== appLanguage && (
                <Ionicons name="checkmark" size={20} color="white" style={styles.saveIcon} />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    width: 40,
  },
  placeholderButton: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  animatedContent: {
    flex: 1,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  instructionText: {
    color: colors.gray800,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F4FD',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  selectedLanguageItem: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  flagContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  flagText: {
    fontSize: 28,
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
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  saveIcon: {
    marginLeft: 8,
  }
});

export default AppLanguageScreen;