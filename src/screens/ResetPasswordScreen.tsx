import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TextInput, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase/config';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import colors from '../styles/colors';

interface ResetPasswordScreenProps {
  hash?: string;
  onResetComplete?: () => void;
}

const ResetPasswordScreen = ({ hash: propHash, onResetComplete }: ResetPasswordScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [sessionRecovered, setSessionRecovered] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState<NodeJS.Timeout | null>(null);
  const [errorHandled, setErrorHandled] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    handlePasswordResetToken();
    
    // Cleanup timer on unmount
    return () => {
      if (autoRedirectTimer) {
        clearTimeout(autoRedirectTimer);
      }
    };
  }, []);

  const handleRedirectToLogin = () => {
    // Clear the reset password flag and navigate to login
    if (onResetComplete) {
      onResetComplete();
    }
    navigation.navigate('Login' as never);
  };

  const showErrorAndRedirect = (title: string, message: string, autoRedirectDelay: number = 5000) => {
    // Mark that we've handled an error to prevent showing the error screen
    setErrorHandled(true);
    
    // Set up auto-redirect timer
    const timer = setTimeout(() => {
      handleRedirectToLogin();
    }, autoRedirectDelay);
    
    setAutoRedirectTimer(timer);
    
    // Show alert with manual redirect option
    Alert.alert(
      title,
      `${message}\n\nYou will be redirected to login in ${autoRedirectDelay / 1000} seconds.`,
      [
        {
          text: 'Go to Login Now',
          onPress: () => {
            // Clear the auto-redirect timer
            if (timer) {
              clearTimeout(timer);
            }
            handleRedirectToLogin();
          }
        }
      ],
      { cancelable: false }
    );
  };

  const handlePasswordResetToken = async () => {
    try {
      console.log('=== PASSWORD RESET TOKEN HANDLER ===');
      
      // First check if we have route params with token info
      const params = route.params as any;
      console.log('Route params:', params);
      
      let hash = '';
      
      // Check if we have the hash from props first (most reliable)
      if (propHash) {
        console.log('Found hash from props:', propHash);
        hash = propHash;
      }
      // Check if we have the hash directly from route params (from deep link)
      else if (params?.hash) {
        console.log('Found hash from route params:', params.hash);
        hash = params.hash;
      }
      // React Navigation automatically parses URL parameters
      // Check for direct URL parameters (React Navigation will parse these)
      else if (params?.access_token && params?.type === 'recovery') {
        console.log('Found parsed token params from React Navigation:', {
          access_token: params.access_token?.substring(0, 20) + '...',
          type: params.type
        });
        hash = `#access_token=${params.access_token}&expires_in=${params.expires_in || 3600}&refresh_token=${params.refresh_token || ''}&token_type=${params.token_type || 'bearer'}&type=recovery`;
      }
      // Fallback: check if we can get the initial URL that opened the app
      else {
        console.log('Checking initial URL...');
        const initialUrl = await Linking.getInitialURL();
        console.log('Initial URL:', initialUrl);
        
        if (initialUrl && initialUrl.includes('#')) {
          // Extract hash from the URL
          const urlParts = initialUrl.split('#');
          if (urlParts.length > 1) {
            hash = '#' + urlParts[1];
            console.log('Extracted hash from initial URL:', hash);
          }
        }
        
        // Fallback: check current URL (for web platform)
        if (!hash && typeof window !== 'undefined' && window.location?.hash) {
          hash = window.location.hash;
          console.log('Found hash in window.location:', hash);
        }
      }
      
      console.log('Final hash to process:', hash);
      
      if (!hash) {
        console.error('No recovery token found anywhere');
        showErrorAndRedirect(
          'No Reset Token',
          'No password reset token was found. Please use the reset link from your email.'
        );
        setLoading(false);
        return;
      }

      await processResetToken(hash);
    } catch (error) {
      console.error('Password reset handling error:', error);
      showErrorAndRedirect(
        'Error',
        'Failed to process password reset. Please try again.'
      );
      setLoading(false);
    }
  };

  const processResetToken = async (hash: string) => {
    try {
      console.log('=== PROCESSING RESET TOKEN ===');
      console.log('Hash received:', hash);
      
      // Parse the hash to extract token details
      const params = new URLSearchParams(hash.replace('#', ''));
      const access_token = params.get('access_token');
      const token_type = params.get('token_type');
      const type = params.get('type');
      
      console.log('Parsed token params:', {
        access_token: access_token?.substring(0, 20) + '...',
        token_type,
        type,
        full_hash_length: hash.length
      });
      
      // Validate that this is a recovery token
      if (type !== 'recovery') {
        console.error('Token type is not recovery:', type);
        Alert.alert('Error', 'Invalid reset token type');
        setLoading(false);
        return;
      }
      
      // For recovery tokens, we need to set the session directly
      // But we don't want to trigger full authentication until password is changed
      console.log('Setting session from recovery token...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: access_token!,
        refresh_token: params.get('refresh_token') || ''
      });
      
      if (error) {
        console.error('Recovery token session error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        if (error.message.includes('expired')) {
          showErrorAndRedirect(
            'Link Expired',
            'This password reset link has expired. Please request a new one.'
          );
        } else if (error.message.includes('invalid')) {
          showErrorAndRedirect(
            'Invalid Link',
            'This password reset link is invalid. Please request a new one.'
          );
        } else {
          Alert.alert('Error', `Token setup failed: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      console.log('Session setup response:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        sessionExpiry: data.session?.expires_at
      });

      if (data.session && data.user) {
        console.log('✅ Recovery session established successfully');
        setSessionRecovered(true);
      } else {
        console.error('No session returned from recovery token setup');
        showErrorAndRedirect(
          'Session Error',
          'Failed to establish session from reset token. Please request a new reset link.'
        );
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Token processing error:', error);
      showErrorAndRedirect(
        'Processing Error',
        'Failed to process reset token. Please request a new reset link.'
      );
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success', 
        'Your password has been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear the reset password flag to allow normal navigation
              if (onResetComplete) {
                onResetComplete();
              }
              // The App.tsx will automatically navigate to Main since user is authenticated
              // No need to manually navigate since the flag will be cleared
            }
          }
        ]
      );
    } catch (error) {
      console.error('Password update error:', error);
      
      // Handle specific password validation errors
      if (error instanceof Error) {
        if (error.message.includes('New password should be different from the old password')) {
          Alert.alert(
            'Choose a Different Password', 
            'Your new password must be different from your current password. Please choose a new password.'
          );
        } else if (error.message.includes('Password should be at least')) {
          Alert.alert(
            'Password Too Short', 
            'Your password must be at least 6 characters long. Please choose a longer password.'
          );
        } else if (error.message.includes('Password is too weak')) {
          Alert.alert(
            'Password Too Weak', 
            'Please choose a stronger password with a mix of letters, numbers, and symbols.'
          );
        } else {
          Alert.alert('Error', `Failed to update password: ${error.message}`);
        }
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again.');
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Processing reset link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionRecovered && !errorHandled) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Reset Link Invalid</Text>
          <Text style={styles.errorText}>
            The password reset link is invalid or has expired. Please request a new one.
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              if (onResetComplete) {
                onResetComplete();
              }
              navigation.navigate('Login' as never);
            }}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Please enter your new password below
        </Text>

        <TextInput
          style={styles.input}
          placeholder="New Password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={[styles.button, updatingPassword && styles.buttonDisabled]}
          onPress={handlePasswordUpdate}
          disabled={updatingPassword}
        >
          {updatingPassword ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray600,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: colors.gray400,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;