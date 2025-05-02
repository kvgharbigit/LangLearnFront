// Enhanced LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginUser, resetPassword } from '../services/authService';
import { AuthStackParamList } from '../types/navigation';
import { signInWithGoogle, configureGoogleSignIn } from '../services/compatGoogleAuthService';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  
  // Initialize Google Auth
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleLogin = async () => {
    // Clear previous errors
    setErrorMessage(null);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = await loginUser(email, password);

      if (error) {
        // Handle specific error codes
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          setErrorMessage('Invalid email or password');
        } else if (error.code === 'auth/too-many-requests') {
          setErrorMessage('Too many attempts. Please try again later');
        } else {
          setErrorMessage(error.message || 'Failed to login');
        }
        return;
      }

      // Success - navigation will be handled by the auth state observer
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password');
      return;
    }

    try {
      setIsLoading(true);
      const { success, error } = await resetPassword(email);

      if (success) {
        Alert.alert(
          'Password Reset Email Sent',
          'Check your email for instructions to reset your password'
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to send password reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(prev => !prev);
  };
  
  // Handle Google Sign-In using native implementation
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage(null);
      
      // Use the native Google Sign-In
      const { user, error, cancelled } = await signInWithGoogle();
      
      if (cancelled) {
        console.log('Google sign in was cancelled');
        return;
      }
      
      if (error) {
        console.error('Google sign in error:', error);
        setErrorMessage('Failed to sign in with Google. Please try again.');
      }
      
      // Auth state observer in AuthContext will handle navigation on successful sign-in
    } catch (error) {
      console.error('Google sign in error:', error);
      setErrorMessage('An unexpected error occurred during Google sign in');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.backgroundContainer}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconContainer}>
              <Text style={styles.logoIcon}>🌎</Text>
            </View>
            <Text style={styles.title}>LangLearn</Text>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.subtitle}>Welcome Back!</Text>
            <Text style={styles.welcomeText}>Log in to continue your language learning journey</Text>
          </View>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#B71C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="mail-outline" size={18} color={colors.gray600} />
                <Text style={styles.inputLabel}>Email</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  autoComplete="email"
                  placeholderTextColor={colors.gray500}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.gray600} />
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholderTextColor={colors.gray500}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={togglePasswordVisibility}
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.gray600}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!email || !password || isLoading) && styles.disabledButton
              ]}
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Log In</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" style={styles.loginIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider}></View>
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider}></View>
          </View>

          <View style={styles.socialLoginContainer}>
            <TouchableOpacity 
              style={[styles.socialButton, googleLoading && styles.socialButtonLoading]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.socialButtonText}>Signing in...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color={colors.gray800} />
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={20} color={colors.gray800} />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.signupLink}
            >
              <Text style={styles.signupLinkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Enhanced color palette
const colors = {
  primary: '#5D6AF8',
  primaryLight: '#E8EAFF',
  primaryDark: '#3A46CF',
  secondary: '#FF6B6B',
  accent: '#FFD166',
  success: '#06D6A0',
  gray50: '#f8f9fa',
  gray100: '#f1f3f5',
  gray200: '#e9ecef',
  gray300: '#dee2e6',
  gray400: '#ced4da',
  gray500: '#adb5bd',
  gray600: '#868e96',
  gray700: '#495057',
  gray800: '#343a40',
  gray900: '#212529',
  white: '#ffffff',
  background: '#f8f9fa',
  cardBackground: '#ffffff',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backgroundContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  bgCircle1: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: colors.primaryLight,
    top: -width * 0.8,
    left: -width * 0.2,
    opacity: 0.7,
  },
  bgCircle2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: colors.primaryLight,
    top: -width * 0.6,
    right: -width * 0.3,
    opacity: 0.5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(93, 106, 248, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  welcomeContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: '80%',
  },
  formContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputContainer: {
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
    backgroundColor: colors.gray50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 16,
    fontSize: 16,
    color: colors.gray800,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
  },
  loginIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray300,
  },
  dividerText: {
    paddingHorizontal: 16,
    color: colors.gray500,
    fontSize: 14,
  },
  socialLoginContainer: {
    marginBottom: 30,
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.gray300,
    gap: 10,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  socialButtonText: {
    color: colors.gray800,
    fontSize: 15,
    fontWeight: '500',
  },
  socialButtonLoading: {
    backgroundColor: colors.gray100,
    borderColor: colors.primary,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  signupText: {
    color: colors.gray600,
    fontSize: 14,
  },
  signupLink: {
    paddingVertical: 4,
  },
  signupLinkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
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
});

export default LoginScreen;

