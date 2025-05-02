// src/screens/EditProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, changePassword } from '../services/authService';
import { ProfileStackParamList } from '../types/navigation';
import colors from '../styles/colors';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  // Profile info states
  const [displayName, setDisplayName] = useState<string>(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Password states
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Password visibility states
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState<boolean>(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(15)).current;
  
  // Run entrance animations when component mounts
  useEffect(() => {
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

  // Update profile info
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
      setUpdateError('Name cannot be empty');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const { success, error } = await updateUserProfile(displayName);

      if (success) {
        Alert.alert('Success', 'Your profile has been updated');
        navigation.goBack();
      } else {
        setUpdateError(error?.message || 'Failed to update profile');
      }
    } catch (error) {
      setUpdateError('An unexpected error occurred');
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    // Validation
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { success, error } = await changePassword(currentPassword, newPassword);

      if (success) {
        Alert.alert('Success', 'Your password has been updated');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // Handle specific error types
        if (error && 'code' in error && error.code === 'auth/wrong-password') {
          setPasswordError('Current password is incorrect');
        } else {
          setPasswordError(error?.message || 'Failed to update password');
        }
      }
    } catch (error) {
      setPasswordError('An unexpected error occurred');
      console.error('Password change error:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toggle password visibility functions
  const toggleCurrentPasswordVisibility = () => {
    setCurrentPasswordVisible(prev => !prev);
  };

  const toggleNewPasswordVisibility = () => {
    setNewPasswordVisible(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(prev => !prev);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholderView} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              { opacity: fadeAnim, transform: [{ translateY }] }
            ]}
          >
            {/* Profile Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={22} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Profile Information</Text>
              </View>

              {updateError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                  <Text style={styles.errorText}>{updateError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Name</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                    placeholderTextColor={colors.gray500}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="mail-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Email</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.disabledInput]}
                    value={user?.email || ''}
                    editable={false}
                    placeholderTextColor={colors.gray500}
                  />
                </View>
                <Text style={styles.helperText}>
                  Email cannot be changed
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (isUpdating || !displayName.trim()) && styles.disabledButton
                ]}
                onPress={handleUpdateProfile}
                disabled={isUpdating || !displayName.trim()}
                accessibilityLabel="Update Profile"
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Update Profile</Text>
                    <Ionicons name="save-outline" size={20} color="white" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Password Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="lock-closed" size={22} color={colors.primary} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Change Password</Text>
              </View>

              {passwordError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                  <Text style={styles.errorText}>{passwordError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="key-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Current Password</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry={!currentPasswordVisible}
                    placeholderTextColor={colors.gray500}
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={toggleCurrentPasswordVisibility}
                    accessibilityLabel={currentPasswordVisible ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={currentPasswordVisible ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.gray600}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>New Password</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry={!newPasswordVisible}
                    placeholderTextColor={colors.gray500}
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={toggleNewPasswordVisibility}
                    accessibilityLabel={newPasswordVisible ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={newPasswordVisible ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.gray600}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Password must be at least 6 characters
                </Text>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={!confirmPasswordVisible}
                    placeholderTextColor={colors.gray500}
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={toggleConfirmPasswordVisibility}
                    accessibilityLabel={confirmPasswordVisible ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={confirmPasswordVisible ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.gray600}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (isChangingPassword || !currentPassword || !newPassword || !confirmPassword) && styles.disabledButton
                ]}
                onPress={handleChangePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                accessibilityLabel="Change Password"
              >
                {isChangingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Change Password</Text>
                    <Ionicons name="key" size={20} color="white" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Security reminder */}
            <View style={styles.securityReminder}>
              <Ionicons name="information-circle-outline" size={18} color={colors.gray600} style={{ marginRight: 8 }} />
              <Text style={styles.reminderText}>
                For security reasons, make sure your password is unique and not used on other websites.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backButton: {
    padding: 8,
    borderRadius: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
    flex: 1,
    textAlign: 'center',
  },
  placeholderView: {
    width: 40, // Match width of back button for center alignment
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
    marginLeft: 6,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.gray800,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 2,
  },
  disabledInput: {
    backgroundColor: colors.gray100,
    color: colors.gray600,
  },
  helperText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.gray500,
    paddingLeft: 4,
  },
  updateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#B71C1C',
    fontSize: 14,
    flex: 1,
  },
  securityReminder: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'flex-start',
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray600,
  },
});

export default EditProfileScreen;