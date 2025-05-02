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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { registerUser } from '../services/authService';
import { AuthStackParamList } from '../types/navigation';
import colors from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

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

  const handleRegister = async () => {
    // Clear previous errors
    setErrorMessage(null);

    // Basic validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = await registerUser(email, password, name);

      if (error) {
        // Handle specific error codes
        if (error.code === 'auth/email-already-in-use') {
          setErrorMessage('This email is already in use');
        } else if (error.code === 'auth/invalid-email') {
          setErrorMessage('Invalid email address');
        } else if (error.code === 'auth/weak-password') {
          setErrorMessage('Password is too weak');
        } else {
          setErrorMessage(error.message || 'Failed to register');
        }
        return;
      }

      // Success - navigation will be handled by the auth state observer
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Background decorations */}
      <View style={styles.backgroundContainer}>
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>
      
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.navigate('Login')}
        accessibilityLabel="Go back to login"
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      
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
              <Text style={styles.title}>Confluency</Text>
            </View>

            <Text style={styles.subtitle}>Create Your Account</Text>
            <Text style={styles.descText}>Sign up to start your language learning journey</Text>

            {/* Error message display */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Form container */}
            <View style={styles.formContainer}>
              {/* Name input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="person-outline" size={18} color={colors.gray600} />
                  <Text style={styles.inputLabel}>Name</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
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
                  (!name || !email || !password || !confirmPassword || isLoading) &&
                    styles.disabledButton,
                ]}
                onPress={handleRegister}
                disabled={
                  !name || !email || !password || !confirmPassword || isLoading
                }
                accessibilityLabel="Create Account"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Login link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login')}
                accessibilityLabel="Log In"
              >
                <Text style={styles.loginLink}>Log In</Text>
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
  backgroundContainer: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  bgGradient1: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.4,
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
    height: height * 0.25,
    backgroundColor: '#EEF1FF',
    top: -height * 0.12,
    right: -width * 0.2,
    borderBottomLeftRadius: 300,
    transform: [{ rotate: '-5deg' }],
    opacity: 0.7,
  },
  bgCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryLight,
    bottom: -80,
    left: -80,
    opacity: 0.5,
  },
  bgCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primaryLight,
    top: height * 0.65,
    right: -70,
    opacity: 0.3,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 90,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 70,
    height: 70,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 10,
  },
  descText: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 24,
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
  registerButton: {
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
    marginTop: 8,
    flexDirection: 'row',
  },
  buttonIcon: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  loginText: {
    color: colors.gray600,
    fontSize: 15,
  },
  loginLink: {
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

export default RegisterScreen;