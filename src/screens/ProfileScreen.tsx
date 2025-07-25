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
  Dimensions,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logoutUser, deleteAccount } from '../services/supabaseAuthService';
import { ProfileStackParamList } from '../types/navigation';
import colors from '../styles/colors';
import { DEBUG_TOOLS_TOGGLE } from '../constants/debug';
import SubscriptionCancelledBanner from '../components/SubscriptionCancelledBanner';
import useSubscriptionStatus from '../hooks/useSubscriptionStatus';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { appLanguage, translate, getLanguageName } = useLanguage();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [debugOptions, setDebugOptions] = useState<{
    debugMode: boolean;
    simulateRevenueCat: boolean;
  }>({ debugMode: false, simulateRevenueCat: false });
  
  // Delete account confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [confirmationAcknowledged, setConfirmationAcknowledged] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  // Get subscription status from hook
  const subscription = useSubscriptionStatus();
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(15)).current;
  
  // Load debug settings
  const loadDebugSettings = async () => {
    try {
      const { getUISettings } = await import('../utils/userPreferences');
      const settings = await getUISettings();
      setDebugOptions({
        debugMode: settings.debugMode,
        simulateRevenueCat: settings.simulateRevenueCat
      });
    } catch (error) {
      console.error('Error loading debug settings:', error);
    }
  };

  // Toggle debug options
  const toggleDebugOption = async (option: 'debugMode' | 'simulateRevenueCat') => {
    try {
      const { saveUISettings, getUISettings } = await import('../utils/userPreferences');
      const currentSettings = await getUISettings();
      
      // Create updated settings with the toggled option
      const updatedSettings = {
        ...currentSettings,
        [option]: !currentSettings[option]
      };
      
      // Save the updated settings
      await saveUISettings(updatedSettings);
      
      // Update local state
      setDebugOptions(prev => ({
        ...prev,
        [option]: !prev[option]
      }));
      
      // Special handling for RevenueCat simulation to ensure it updates everywhere
      if (option === 'simulateRevenueCat') {
        try {
          const { setUseSimulatedRevenueCat } = await import('../utils/revenueCatConfig');
          // Also update the RevenueCat config setting to keep in sync
          await setUseSimulatedRevenueCat(updatedSettings.simulateRevenueCat);
          
          console.log(`RevenueCat simulation ${updatedSettings.simulateRevenueCat ? 'enabled' : 'disabled'}`);
          
          // Show special message for RevenueCat toggling
          Alert.alert(
            'RevenueCat Setting Updated',
            `RevenueCat simulation has been ${updatedSettings.simulateRevenueCat ? 'enabled' : 'disabled'}.\n\nThis will take effect the next time you restart the app or attempt a purchase.`,
            [{ text: 'OK' }]
          );
          return; // Skip the generic alert below
        } catch (err) {
          console.error('Error updating RevenueCat config:', err);
        }
      }
      
      // Show feedback for other options
      Alert.alert(
        'Setting Updated',
        `${option === 'debugMode' ? 'Debug mode' : 'Setting'} has been ${updatedSettings[option] ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error(`Error toggling ${option}:`, error);
      Alert.alert('Error', `Failed to update ${option} setting.`);
    }
  };

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
    
    // Load debug settings
    loadDebugSettings();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      translate('profile.logoutConfirmTitle'),
      translate('profile.logoutConfirmMessage'),
      [
        {
          text: translate('button.cancel'),
          style: 'cancel',
        },
        {
          text: translate('profile.logout'),
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
  
  // Handle delete account button press
  const handleDeleteAccount = () => {
    // Reset confirmation state
    setConfirmationAcknowledged(false);
    // Show confirmation dialog
    setShowDeleteConfirmation(true);
  };
  
  // Handle account deletion confirmation
  const confirmDeleteAccount = async () => {
    if (!confirmationAcknowledged) {
      Alert.alert(
        'Confirmation Required',
        'Please acknowledge that you understand this action cannot be undone.'
      );
      return;
    }
    
    setIsDeletingAccount(true);
    try {
      // Call the deleteAccount function
      const result = await deleteAccount();
      
      if (result.success) {
        // Account deleted successfully
        // Close the confirmation modal
        setShowDeleteConfirmation(false);
        setConfirmationAcknowledged(false);
        
        // Clear any cached user data
        const { clearCachedUser } = await import('../services/supabaseAuthService');
        clearCachedUser();
        
        // Clear AsyncStorage
        try {
          const AsyncStorage = await import('@react-native-async-storage/async-storage');
          await AsyncStorage.default.clear();
          console.log('AsyncStorage cleared after account deletion');
        } catch (storageError) {
          console.error('Error clearing storage after account deletion:', storageError);
        }
        
        // Explicitly navigate to the Auth stack
        const NavigationService = await import('../navigation/NavigationService');
        NavigationService.default.navigateByAuthState(false);
        
        // Show success message
        Alert.alert(
          'Account Deleted',
          'Your account and all data have been permanently deleted.'
        );
      } else {
        // Error deleting account
        Alert.alert(
          'Error',
          'Failed to delete your account. Please try again later.',
        );
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again later.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel={translate('button.back')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translate('profile.title')}</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Subscription Cancelled Banner */}
      {subscription.isCancelled && subscription.expirationDate && (
        <SubscriptionCancelledBanner
          expirationDate={subscription.expirationDate}
          tier={subscription.tier}
        />
      )}
      
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
            
            {/* App Language Selection - Temporarily Disabled
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
            */}
            
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
              accessibilityLabel={translate('profile.contactUs')}
              onPress={() => Linking.openURL('mailto:confluencyapp@gmail.com')}
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
              onPress={() => Linking.openURL('https://persistent-lychee-e09.notion.site/Confluency-Privacy-Policy-1e4282c115ae80ed8f27ce8c8cfb2e9e?pvs=4')}
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
              onPress={() => Linking.openURL('https://persistent-lychee-e09.notion.site/Confluency-Terms-of-Service-EULA-1f2282c115ae804ba5aec1f6239b6962?pvs=4')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>{translate('profile.termsOfService')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
              accessibilityLabel="Delete Account"
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="trash-outline" size={22} color={colors.gray800} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.deleteAccountText}>Delete Account</Text>
                <Text style={styles.deleteAccountSubtext}>Permanently delete your account and all data</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Developer Section - Only visible if DEBUG_TOOLS_TOGGLE is true */}
          {DEBUG_TOOLS_TOGGLE && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Developer Options</Text>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => toggleDebugOption('debugMode')}
                accessibilityLabel="Toggle Debug Mode"
              >
                <View style={[
                  styles.menuIconContainer,
                  debugOptions.debugMode ? { backgroundColor: colors.primaryLight } : { backgroundColor: colors.gray200 }
                ]}>
                  <Ionicons name="bug-outline" size={22} color={debugOptions.debugMode ? colors.primary : colors.gray500} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>Debug Mode</Text>
                  <Text style={styles.menuSubtext}>
                    {debugOptions.debugMode ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                <View style={[
                  styles.toggleContainer,
                  debugOptions.debugMode ? styles.toggleActive : styles.toggleInactive
                ]}>
                  <View style={[
                    styles.toggleCircle,
                    debugOptions.debugMode ? styles.toggleCircleActive : styles.toggleCircleInactive
                  ]} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => toggleDebugOption('simulateRevenueCat')}
                accessibilityLabel="Toggle RevenueCat Simulation"
              >
                <View style={[
                  styles.menuIconContainer,
                  debugOptions.simulateRevenueCat ? { backgroundColor: colors.primaryLight } : { backgroundColor: colors.gray200 }
                ]}>
                  <Ionicons name="card-outline" size={22} color={debugOptions.simulateRevenueCat ? colors.primary : colors.gray500} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>Simulate RevenueCat</Text>
                  <Text style={styles.menuSubtext}>
                    {debugOptions.simulateRevenueCat ? 'Using simulated purchases' : 'Using real purchases'}
                  </Text>
                </View>
                <View style={[
                  styles.toggleContainer,
                  debugOptions.simulateRevenueCat ? styles.toggleActive : styles.toggleInactive
                ]}>
                  <View style={[
                    styles.toggleCircle,
                    debugOptions.simulateRevenueCat ? styles.toggleCircleActive : styles.toggleCircleInactive
                  ]} />
                </View>
              </TouchableOpacity>
              
              <Text style={styles.developerNote}>
                Changes to these settings will take effect immediately.
              </Text>
            </View>
          )}
          
          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
            accessibilityLabel={translate('profile.logout')}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <Text style={styles.logoutText}>{translate('profile.logout')}</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* App Version */}
          <Text style={styles.versionText}>
            {translate('profile.version')} 1.0.0
          </Text>
        </Animated.View>
      </ScrollView>
      
      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            
            <Text style={styles.modalDescription}>
              This action is permanent and cannot be undone. All your data will be deleted.
            </Text>
            
            <Text style={styles.warningText}>
              Important: Your email address cannot be used to register a new account for 6 months after deletion.
            </Text>
            
            <TouchableOpacity
              style={styles.confirmationCheckbox}
              onPress={() => setConfirmationAcknowledged(!confirmationAcknowledged)}
              disabled={isDeletingAccount}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox, 
                confirmationAcknowledged && styles.checkboxChecked
              ]}>
                {confirmationAcknowledged && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I understand this action is permanent and cannot be undone
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteConfirmation(false);
                  setConfirmationAcknowledged(false);
                }}
                disabled={isDeletingAccount}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  confirmationAcknowledged ? styles.confirmButtonEnabled : styles.confirmButtonDisabled
                ]}
                onPress={confirmDeleteAccount}
                disabled={!confirmationAcknowledged || isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: colors.danger,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.gray500,
  },
  toggleContainer: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleInactive: {
    backgroundColor: colors.gray300,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    top: 2,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  toggleCircleActive: {
    right: 2,
  },
  toggleCircleInactive: {
    left: 2,
  },
  developerNote: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    fontSize: 13,
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Delete account styles
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  deleteAccountText: {
    fontSize: 16,
    color: colors.gray800,
    marginBottom: 2,
  },
  deleteAccountSubtext: {
    fontSize: 13,
    color: colors.gray500,
  },
  // Modal styles
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
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: colors.gray700,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningText: {
    fontSize: 15,
    color: colors.danger,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  confirmText: {
    fontSize: 14,
    color: colors.gray800,
    marginBottom: 10,
  },
  confirmationCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.gray400,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.gray200,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButtonText: {
    color: colors.gray800,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmButtonEnabled: {
    backgroundColor: '#22c55e', // Green color
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)', // Faded red
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default ProfileScreen;