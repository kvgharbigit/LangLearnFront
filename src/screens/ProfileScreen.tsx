// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logoutUser } from '../services/supabaseAuthService';
import { ProfileStackParamList } from '../types/navigation';
import colors from '../styles/colors';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { appLanguage, translate, getLanguageName } = useLanguage();

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

  const handleLogout = async () => {
    Alert.alert(
      translate('profile.logoutConfirmTitle'),
      translate('profile.logoutConfirmMessage'),
      [
        {
          text: translate('common.cancel'),
          style: 'cancel',
        },
        {
          text: translate('common.logout'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Perform a global logout that clears all sessions
              console.log('Signing out user completely...');
              const { supabase } = await import('../supabase/config');
              await supabase.auth.signOut({ scope: 'global' });
              
              // Also clear any cached user data
              const { clearCachedUser } = await import('../services/supabaseAuthService');
              clearCachedUser();
              
              // Use reset navigation with a delay to ensure auth state updates first
              console.log('Logout successful');
              
              // Also clear AsyncStorage to ensure clean state
              try {
                const AsyncStorage = await import('@react-native-async-storage/async-storage');
                await AsyncStorage.default.clear();
                console.log('AsyncStorage cleared');
              } catch (storageError) {
                console.error('Error clearing storage:', storageError);
              }
              
              // Simply reload the app after logout - no need to navigate manually
              // The AuthContext will handle redirecting to the login screen
              console.log('App will restart to login screen automatically');
              
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(
                translate('common.error'),
                translate('profile.logoutError')
              );
            } finally {
              setIsLoading(false);
            }
          },
        }
      ]
    );
  };

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel={translate('common.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translate('profile.title')}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY }] }
          ]}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user && user.email ? user.email.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.user_metadata?.full_name || translate('profile.guest')}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityLabel={translate('profile.editProfile')}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              <Text style={styles.editProfileText}>{translate('profile.editProfile')}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translate('profile.settings')}</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('AppLanguage')}
              accessibilityLabel={translate('profile.appLanguage')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="language-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.appLanguage')}</Text>
                <Text style={styles.menuSubtext}>{getLanguageName(appLanguage)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Subscription')}
              accessibilityLabel={translate('profile.subscription')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="star-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.subscription')}</Text>
                <Text style={styles.menuSubtext}>{translate('profile.currentPlan')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          </View>
          
          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translate('profile.support')}</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              accessibilityLabel={translate('profile.helpCenter')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.helpCenter')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              accessibilityLabel={translate('profile.contactUs')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="mail-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.contactUs')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          </View>
          
          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{translate('profile.legal')}</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              accessibilityLabel={translate('profile.privacyPolicy')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="shield-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              accessibilityLabel={translate('profile.termsOfService')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.termsOfService')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
            accessibilityLabel={translate('common.logout')}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={colors.error} />
                <Text style={styles.logoutText}>{translate('common.logout')}</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* App Version */}
          <Text style={styles.versionText}>
            {translate('profile.version')} 1.0.0
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.gray600,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  editProfileText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 16,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    color: colors.gray800,
    marginBottom: 2,
  },
  menuSubtext: {
    fontSize: 13,
    color: colors.gray500,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.gray500,
  },
});

export default ProfileScreen;