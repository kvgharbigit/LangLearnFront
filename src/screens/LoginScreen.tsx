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
  Image,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginUser, resetPassword } from '../services/authService';
import { AuthStackParamList } from '../types/navigation';
import { signInWithGoogle, configureGoogleSignIn } from '../services/compatGoogleAuthService';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  // Form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(30)).current;
  
  // Initialize Google Auth and start animations
  useEffect(() => {
    configureGoogleSignIn();
    
    // Start entrance animations
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
            {/* Logo and title section */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/transparent_background_mascot_icon.png')}
                style={styles.logoImage}
              />
              <View>
                <Text style={styles.title}>Confluency</Text>
                <Text style={styles.tagline}>AI-powered language learning</Text>
              </View>
            </View>

            <View style={styles.welcomeContainer}>
              <Text style={styles.subtitle}>Welcome Back</Text>
              <Text style={styles.welcomeText}>
                Sign in to continue your language learning journey
              </Text>
            </View>

            {/* Error message display */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Form container */}
            <View style={styles.formContainer}>
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
                    accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.gray600}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot password link */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordButton}
                accessibilityLabel="Forgot Password"
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (!email || !password || isLoading) && styles.disabledButton
                ]}
                onPress={handleLogin}
                disabled={!email || !password || isLoading}
                accessibilityLabel="Log In"
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

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider}></View>
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider}></View>
            </View>

            {/* Social login buttons */}
            <View style={styles.socialLoginContainer}>
              <TouchableOpacity 
                style={[styles.socialButton, googleLoading && styles.socialButtonLoading]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                accessibilityLabel="Continue with Google"
              >
                {googleLoading ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.socialButtonText}>Signing in...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={colors.gray800} />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialButton}
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={20} color={colors.gray800} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Sign up link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.signupLink}
                accessibilityLabel="Sign Up"
              >
                <Text style={styles.signupLinkText}>Sign Up</Text>
              </TouchableOpacity>
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
  },
  logoImage: {
    width: 70,
    height: 70,
    marginRight: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray600,
    letterSpacing: 0.2,
  },
  welcomeContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: '85%',
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
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
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 16,
    fontSize: 16,
    color: colors.gray800,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 2,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
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
    fontSize: 17,
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
    color: colors.gray600,
    fontSize: 14,
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray300,
    gap: 12,
    flex: 1,
    maxWidth: 150,
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
    fontSize: 15,
  },
  signupLink: {
    paddingVertical: 4,
  },
  signupLinkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
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

