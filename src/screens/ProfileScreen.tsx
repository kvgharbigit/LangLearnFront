// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
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

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { appLanguage, translate, getLanguageName } = useLanguage();

  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    if (email.length > 25) {
      return email.substring(0, 22) + '...';
    }
    return email;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translate('profile.title')}</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.avatarContainer}>
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
          >
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translate('profile.section.subscription')}</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // Ensure correct navigation to nested screen
              navigation.navigate('Subscription');
            }}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="star" size={22} color="#FFB300" style={styles.menuIcon} />
              <Text style={styles.menuItemTitle}>{translate('profile.manage.subscription')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translate('profile.section.preferences')}</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('AppLanguage')}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="language" size={22} color="#4CAF50" style={styles.menuIcon} />
              <Text style={styles.menuItemTitle}>{translate('profile.app.language')}</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemValue}>{getLanguageName(appLanguage)}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translate('profile.section.support')}</Text>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="mail" size={22} color="#2196F3" style={styles.menuIcon} />
              <Text style={styles.menuItemTitle}>{translate('profile.contact.support')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{translate('profile.section.account')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutMenuItem]}
            onPress={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="log-out" size={22} color={colors.danger} style={styles.menuIcon} />
                <Text style={[styles.menuItemTitle, styles.logoutText]}>{translate('profile.logout')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
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
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
    marginBottom: 8,
  },
  editButton: {
    padding: 8,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray200,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  subMenuItem: {
    paddingLeft: 50,
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
  menuIconPlaceholder: {
    width: 24,
    marginRight: 16,
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
  logoutMenuItem: {
    borderBottomWidth: 0,
    justifyContent: 'flex-start',
  },
  logoutText: {
    color: colors.danger,
  },
  versionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: colors.gray500,
  },
});

export default ProfileScreen;