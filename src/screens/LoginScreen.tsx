// Enhanced LoginScreen.tsx with improved initialization handling
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
import SafeView from '../components/SafeView';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginUser, resetPassword } from '../services/authService';
import { AuthStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { useUserInitialization } from '../contexts/UserInitializationContext';
import { useAuth } from '../contexts/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import { standardizeAuthError } from '../utils/authErrors';
import EmailVerificationModal from '../components/EmailVerificationModal';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  // Form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  
  // Verification modal state
  const [verificationModalVisible, setVerificationModalVisible] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [verificationPassword, setVerificationPassword] = useState<string>('');
  const [fromRegistration, setFromRegistration] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(30)).current;
  
  // Access user initialization context and auth context
  const { verifyAndInitUser } = useUserInitialization();
  const { user } = useAuth();
  
  // Trust AuthContext to handle all navigation - no need for manual navigation from LoginScreen
  
  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected || state.isInternetReachable === false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Start animations
  useEffect(() => {
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
  
  // Handle user verification success
  const handleVerificationComplete = async () => {
    console.log('Email verification completed, proceeding with login');
    setVerificationModalVisible(false);
    // If we have both email and password, attempt login again
    if (verificationEmail && verificationPassword) {
      setIsLoading(true);
      try {
        const loginResult = await loginUser(verificationEmail, verificationPassword);
        if (loginResult.user) {
          // Login successful, don't need to handle navigation as AuthContext will do this
          console.log('Login successful after verification');
        } else if (loginResult.error) {
          setErrorMessage(standardizeAuthError(loginResult.error).message);
        }
      } catch (error) {
        console.error('Error logging in after verification:', error);
        setErrorMessage('Failed to log in after verification');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrorMessage(null);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password');
      return;
    }
    
    // Check network connectivity
    if (isOffline) {
      setErrorMessage('No internet connection. Please check your network settings and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error, emailConfirmationRequired, possiblyUnverifiedEmail } = await loginUser(email, password);

      // Handle login errors with standardized error handling
      if (error) {
        console.error('Login error:', error);
        
        // Handle definite email verification errors
        if (emailConfirmationRequired) {
          // Show the user the specific message about email verification
          if (error.message) {
            setErrorMessage(error.message);
          } else {
            setErrorMessage('Your email address has not been verified. Please verify your email to continue.');
          }
          
          // Show email verification modal
          setVerificationEmail(email);
          setVerificationPassword(password);
          setFromRegistration(false);
          setVerificationModalVisible(true);
          setIsLoading(false);
          return;
        }
        
        // Handle possible unverified email (not certain, just a heuristic)
        if (possiblyUnverifiedEmail) {
          // Show a clearer error that includes verification as a possible solution
          setErrorMessage('Login failed. If you have an account with this email, please make sure it has been verified. You can try to verify your email or check your password.');
          
          // Offer a button to go to verification
          Alert.alert(
            'Email Verification',
            'If you think your email might not be verified, you can verify it now.',
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Verify Email',
                onPress: () => {
                  // Show email verification modal
                  setVerificationEmail(email);
                  setVerificationPassword(password);
                  setFromRegistration(false);
                  setVerificationModalVisible(true);
                }
              }
            ]
          );
          
          setIsLoading(false);
          return;
        }
        
        const standardError = standardizeAuthError(error);
        setErrorMessage(standardError.message);
        setIsLoading(false);
        return;
      }
      
      // Check if email confirmation is required even if there's no error
      if (emailConfirmationRequired) {
        setIsLoading(false);
        // Show email verification modal
        setVerificationEmail(email);
        setVerificationPassword(password);
        setFromRegistration(false);
        setVerificationModalVisible(true);
        return;
      }

      // Success - verify user data exists in tables
      if (user) {
        console.log('Login successful, verifying user data existence...');
        try {
          // Verify user exists in tables and re-initialize if needed
          const verified = await verifyAndInitUser(user.id);
          console.log('User data verification result:', verified);
          
          if (!verified) {
            // Handle verification failure - keep user authenticated, let InitializationGate handle retry
            console.error('Failed to verify or initialize user data after login, but keeping user authenticated');
            console.log('User data verification failed, InitializationGate will handle retry');
            
            setIsLoading(false);
            // Allow AuthContext to handle navigation - InitializationGate will show retry UI
          }
          
          // Successful verification - all tables exist or were re-initialized
          console.log('User data verification/initialization completed successfully after login');
          
          // Login successful - let AuthContext handle all navigation
          setIsLoading(false);
          console.log('Login successful - AuthContext will handle navigation automatically');
        } catch (err) {
          console.error('Error verifying user data after login:', err);
          
          // Allow login to proceed - InitializationGate will handle retries
          console.log('User data verification failed, but user remains authenticated for retry');
          setIsLoading(false);
          // AuthContext will handle navigation, InitializationGate will show retry options
        }
      } else {
        // No user but no error - this shouldn't happen
        console.error('Login returned neither user nor error');
        setErrorMessage('Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Navigation will be handled by the auth state observer
      // AuthContext + InitializationGate will block access until ready
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password');
      return;
    }
    
    // Check network connectivity
    if (isOffline) {
      Alert.alert('Offline', 'Password reset requires an internet connection. Please check your network settings and try again.');
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

  return (
    <SafeView style={styles.container}>
      <StatusBar style="dark" />

      {/* Email Verification Modal */}
      <EmailVerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        email={verificationEmail}
        password={verificationPassword}
        fromRegistration={fromRegistration}
        onVerificationComplete={handleVerificationComplete}
      />

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
                source={require('../../assets/transparent_background_icon.png')}
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
            
            {/* Offline warning */}
            {isOffline && (
              <View style={styles.warningContainer}>
                <Ionicons name="cloud-offline" size={20} color="#F57C00" />
                <Text style={styles.warningText}>You are offline. Some features may not work.</Text>
              </View>
            )}

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
                  (isOffline || !email || !password || isLoading) && styles.disabledButton
                ]}
                onPress={handleLogin}
                disabled={isOffline || !email || !password || isLoading}
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
    marginBottom: 24,
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
  warningContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warningText: {
    color: '#E65100',
    fontSize: 14,
    flex: 1,
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