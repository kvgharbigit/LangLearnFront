// src/screens/RegisterScreen.tsx
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
  Dimensions,
  Image,
  Animated
} from 'react-native';
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { registerUser, logoutUser, clearCachedUser } from '../services/supabaseAuthService';
import { initializeUserData } from '../utils/initializeUserData';
import { supabase } from '../supabase/config';
import { AuthStackParamList } from '../types/navigation';
import colors from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { clearAllPreferences } from '../utils/userPreferences';
import { clearLanguagePreferences } from '../utils/languageStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const { width, height } = Dimensions.get('window');

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  // Form state
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(30)).current;
  
  // Run entrance animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Validate form fields
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setErrorMessage('Please enter your name');
      return false;
    }
    
    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      return false;
    }
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    
    if (!password.trim()) {
      setErrorMessage('Please enter a password');
      return false;
    }
    
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return false;
    }
    
    return true;
  };

  // Handle register action
  const handleRegister = async () => {
    setErrorMessage(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Clear app preferences first
      console.log('Clearing app preferences...');
      await clearAllPreferences();
      await clearLanguagePreferences();
      
      // This function handles the complete registration process
      // including clearing previous sessions, creating the account,
      // and establishing a new session
      console.log('Starting registration process...');
      const { user, error } = await registerUser(email, password, name);
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes('email already in use')) {
          setErrorMessage('This email is already registered');
        } else if (error.message.includes('weak-password')) {
          setErrorMessage('Password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols');
        } else if (error.message.includes('Database error saving new user')) {
          setErrorMessage('Account creation failed. Please try using a different email address.');
        } else if (error.message.includes('different email')) {
          setErrorMessage('Account creation failed. Please try using a different email address.');
        } else if (error.message.includes('security purposes') || error.message.includes('rate limit')) {
          // Handle rate limiting errors
          setErrorMessage('Too many registration attempts. Please wait a moment before trying again or use a different email address.');
        } else {
          setErrorMessage(error.message || 'Registration failed');
        }
        return;
      }
      
      console.log('Registration successful, user ID:', user?.id);
      
      // Initialize user data in the backend
      if (user) {
        console.log('Initializing user data after registration...');
        try {
          // Wait for initialization to complete before proceeding
          await initializeUserData(user.id);
          console.log('User data initialization completed after registration');
        } catch (err) {
          console.error('Error initializing user data after registration:', err);
          
          // Block registration completion if initialization fails
          setErrorMessage('Unable to initialize user data. Please try again or contact support.');
          // Sign out the user to prevent them from proceeding with incomplete data
          try {
            const { supabase } = await import('../supabase/config');
            await supabase.auth.signOut();
            console.log('Signed out user due to initialization failure');
          } catch (signOutError) {
            console.error('Error signing out after initialization failure:', signOutError);
          }
          
          setIsLoading(false);
          setSuccessMessage(null);
          return; // Stop the registration flow
        }
      }
      
      // Show success message to the user - now that email verification is disabled
      setIsLoading(false);
      setErrorMessage(null);
      setSuccessMessage('Registration successful! You can now sign in to your account.');
      
      // If we get here, everything worked - navigation will be handled by auth state observer
      
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setPasswordVisible(prev => !prev);
  };
  
  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(prev => !prev);
  };

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Background decorations */}
      <View style={styles.backgroundContainer}>
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContent,
              { opacity: fadeAnim, transform: [{ translateY }] }
            ]}
          >
            {/* Back button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={colors.gray800} />
            </TouchableOpacity>
            
            {/* Logo and title section */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/transparent_background_icon.png')}
                style={styles.logoImage}
              />
              <View>
                <Text style={styles.title}>Confluency</Text>
                <Text style={styles.tagline}>AI-powered language learning</Text>
              </View>
            </View>
            
            <View style={styles.welcomeContainer}>
              <Text style={styles.subtitle}>Create Account</Text>
              <Text style={styles.welcomeText}>
                Join our community of language learners
              </Text>
            </View>
            
            {/* Error message display */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            
            {/* Success message display */}
            {successMessage && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}
            
            {/* Form container */}
            <View style={styles.formContainer}>
              {/* Name input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Full Name</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    autoComplete="name"
                    placeholderTextColor={colors.gray500}
                  />
                </View>
              </View>
              
              {/* Email input */}
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
              
              {/* Password input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Password</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="next"
                    placeholderTextColor={colors.gray500}
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={togglePasswordVisibility}
                    accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.gray600}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>
                  Use at least 8 characters with a mix of letters, numbers, and symbols
                </Text>
              </View>
              
              {/* Confirm Password input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!confirmPasswordVisible}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
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
              
              {/* Register button */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (!name || !email || !password || !confirmPassword || isLoading) && styles.disabledButton
                ]}
                onPress={handleRegister}
                disabled={!name || !email || !password || !confirmPassword || isLoading}
                accessibilityLabel="Create Account"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Ionicons name="person-add" size={20} color="white" style={styles.registerIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Sign in link */}
            <View style={styles.signinContainer}>
              <Text style={styles.signinText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.signinLink}
                accessibilityLabel="Sign In"
              >
                <Text style={styles.signinLinkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
            
            {/* Terms and conditions */}
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  animatedContent: {
    flex: 1,
  },
  backgroundContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  bgGradient1: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.6,
    backgroundColor: '#F0F4FF',
    top: -height * 0.15,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
    transform: [{ rotate: '-10deg' }],
    opacity: 0.7,
  },
  bgGradient2: {
    position: 'absolute',
    width: width * 1.8,
    height: height * 0.35,
    backgroundColor: '#EEF1FF',
    top: -height * 0.15,
    right: -width * 0.2,
    borderBottomLeftRadius: 300,
    transform: [{ rotate: '-5deg' }],
    opacity: 0.7,
  },
  bgCircle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.primaryLight,
    bottom: -50,
    left: -100,
    opacity: 0.5,
  },
  bgCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primaryLight,
    top: height * 0.6,
    right: -70,
    opacity: 0.3,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  logoImage: {
    width: 60,
    height: 60,
    marginRight: 12,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 14,
    color: colors.gray600,
    letterSpacing: 0.2,
  },
  welcomeContainer: {
    marginBottom: 24,
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
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: '85%',
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 15,
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
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 16,
    fontSize: 16,
    color: colors.gray800,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 15,
    padding: 2,
  },
  passwordHint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.gray600,
    paddingHorizontal: 2,
  },
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    flexDirection: 'row',
  },
  registerIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  signinText: {
    color: colors.gray600,
    fontSize: 15,
  },
  signinLink: {
    paddingVertical: 4,
  },
  signinLinkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.gray500,
    paddingHorizontal: 20,
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
  successContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    flex: 1,
  },
});

export default RegisterScreen;