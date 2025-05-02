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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { logoutUser } from '../services/authService';
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
      translate('profile.logout.confirm.title'),
      translate('profile.logout.confirm.message'),
      [
        {
          text: translate('profile.logout.confirm.cancel'),
          style: 'cancel',
        },
        {
          text: translate('profile.logout.confirm.logout'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await logoutUser();
              // Navigation will be handled by the auth state change
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  // Format email for display (truncate if too long)
  const formatEmail = (email: string | null | undefined): string => {
    if (!email) return '';
    if (email.length > 28) {
      return email.substring(0, 25) + '...';
    }
    return email;
  };

  // Helper function to generate a gradient color based on the first letter of name
  const getAvatarColor = (name: string | null | undefined): string => {
    if (!name || name.length === 0) return colors.primary;
    
    const letter = name.charAt(0).toLowerCase();
    const position = letter.charCodeAt(0) - 97; // a is 0, b is 1, etc.
    
    const gradientColors = [
      '#5468FF', // primary blue
      '#FF6B6B', // red
      '#06D6A0', // green
      '#FFD166', // yellow
      '#9C27B0', // purple
      '#3F51B5', // indigo
      '#2196F3', // blue
      '#00BCD4', // cyan
      '#009688', // teal
      '#4CAF50'  // green
    ];
    
    const index = Math.abs(position) % gradientColors.length;
    return gradientColors[index];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translate('profile.title')}</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[
            { opacity: fadeAnim, transform: [{ translateY }] }
          ]}
        >
          {/* User Info Section */}
          <View style={styles.profileCard}>
            <View style={styles.userSection}>
              <View 
                style={[
                  styles.avatarContainer, 
                  { backgroundColor: getAvatarColor(user?.displayName) }
                ]}
              >
                <Text style={styles.avatarText}>
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                <Text style={styles.userEmail}>{formatEmail(user?.email)}</Text>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfile')}
                accessibilityLabel="Edit profile"
              >
                <Ionicons name="pencil" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Subscription Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{translate('profile.section.subscription')}</Text>
            </View>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Subscription')}
              accessibilityLabel="Manage subscription"
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="card-outline" size={20} color="#FFB300" style={styles.menuIcon} />
                <Text style={styles.menuItemTitle}>{translate('profile.manage.subscription')}</Text>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Preferences Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{translate('profile.section.preferences')}</Text>
            </View>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('AppLanguage')}
              accessibilityLabel="App language settings"
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="language" size={20} color="#4CAF50" style={styles.menuIcon} />
                <Text style={styles.menuItemTitle}>{translate('profile.app.language')}</Text>
              </View>
              <View style={styles.menuItemRight}>
                <Text style={styles.menuItemValue}>{getLanguageName(appLanguage)}</Text>
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('AudioTest')}
              accessibilityLabel="Audio test"
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="mic-outline" size={20} color="#2196F3" style={styles.menuIcon} />
                <Text style={styles.menuItemTitle}>Audio Test</Text>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Support Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{translate('profile.section.support')}</Text>
            </View>

            <TouchableOpacity 
              style={styles.menuItem}
              accessibilityLabel="Contact support"
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="mail-outline" size={20} color="#2196F3" style={styles.menuIcon} />
                <Text style={styles.menuItemTitle}>{translate('profile.contact.support')}</Text>
              </View>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={22} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>{translate('profile.section.account')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutMenuItem]}
              onPress={handleLogout}
              disabled={isLoading}
              accessibilityLabel="Log out"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color={colors.danger} style={styles.menuIcon} />
                  <Text style={[styles.menuItemTitle, styles.logoutText]}>{translate('profile.logout')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
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
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    backgroundColor: colors.primary,
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    color: colors.gray800,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    color: colors.gray600,
    marginRight: 8,
  },
  chevronContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
    justifyContent: 'flex-start',
  },
  logoutText: {
    color: colors.danger,
  },
  versionContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    color: colors.gray500,
  },
});

export default ProfileScreen;