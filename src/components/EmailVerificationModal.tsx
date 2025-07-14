import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { supabase } from '../supabase/config';
import { standardizeAuthError } from '../utils/authErrors';
import NetInfo from '@react-native-community/netinfo';
import { useLanguage } from '../contexts/LanguageContext';

interface EmailVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
  password?: string;
  fromRegistration?: boolean;
  onVerificationComplete?: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  visible,
  onClose,
  email,
  password,
  fromRegistration = false,
  onVerificationComplete
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Get translation function
  const { translate } = useLanguage();

  // When the modal becomes visible, show instructions alert
  useEffect(() => {
    if (visible) {
      Alert.alert(
        translate('email.verification.title'),
        translate('email.verification.message'),
        [{ text: translate('email.verification.ok') }]
      );
    }
  }, [visible]);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected || state.isInternetReachable === false);
    });
    
    // Add deep link handler for when user returns to the app after verification
    const handleDeepLink = async (event: { url: string }) => {
      console.log('Deep link detected:', event.url);
      
      // Handle callbacks from verification
      if (event.url && event.url.includes('auth/callback')) {
        console.log('Verification callback link detected, attempting to verify and sign in');
        // User clicked the verification link, attempt sign in
        await handleCheckVerification();
      }
    };
    
    // Set up listeners
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check if app was opened from a deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with initial URL:', url);
        if (url.includes('auth/callback')) {
          console.log('Initial URL contains auth callback, handling verification');
          handleCheckVerification();
        }
      }
    });
    
    return () => {
      unsubscribe();
      // Clean up event listeners
      subscription.remove();
    };
  }, []);

  // Countdown timer effect for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  // Handle resend verification email
  const handleResend = async () => {
    if (resendDisabled || isOffline) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Using the Notion URL as the redirect page after verification
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          // For Supabase JS v2, use redirectTo
          redirectTo: 'https://confluency.org/email-verified.html'
        }
      });
      
      if (error) {
        const standardError = standardizeAuthError(error);
        setError(standardError.message);
      } else {
        // Start countdown for resend button (60 seconds)
        setResendDisabled(true);
        setCountdown(60);
        
        // Show success message
        Alert.alert(
          translate('email.verification.emailSent'),
          translate('email.verification.emailSentMessage'),
          [{ text: translate('email.verification.ok') }]
        );
      }
    } catch (err) {
      setError(translate('error.auth.generic'));
      console.error('Error resending verification email:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle checking if email is verified and signing in
  const handleCheckVerification = async () => {
    if (isCheckingVerification || isOffline) return;
    
    setIsCheckingVerification(true);
    setError(null);
    
    try {
      // If we have a password, try to login - if successful, the email is verified
      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          // Check for various error message patterns related to email verification
          if (error.message?.includes('email confirmation') || 
              error.message?.includes('Email not confirmed') ||
              error.message?.includes('not confirmed') ||
              error.message?.includes('not verified') ||
              error.message?.includes('Email verification required')) {
            setError(translate('email.verification.notVerified') || 'Your email is not verified yet. Please check your inbox and click the verification link.');
          } else {
            // For other errors, show the original error message
            const standardError = standardizeAuthError(error);
            setError(standardError.message);
          }
        } else if (data?.user) {
          // Email is verified and user is now logged in
          console.log('Email verified and user logged in successfully');
          if (onVerificationComplete) {
            onVerificationComplete();
          }
          onClose();
        }
      } else {
        // If we don't have a password (coming from auth refresh), just check status
        // Open email app or suggest user to check email
        setError(translate('email.verification.checkEmail') || 'Please check your email and click the verification link to activate your account.');
        
        // Show alert to guide user
        Alert.alert(
          translate('email.verification.checkEmailTitle') || 'Check Your Email',
          translate('email.verification.checkEmailMessage') || 'Please check your email inbox and click the verification link to activate your account. After verification, you\'ll be automatically signed in.',
          [{ text: translate('email.verification.ok') }]
        );
      }
    } catch (err) {
      setError(translate('error.auth.generic'));
      console.error('Error checking verification:', err);
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Handle opening email app
  const handleOpenEmail = () => {
    let url = '';
    
    // Attempt to open email client based on platform
    if (Platform.OS === 'ios') {
      url = 'message:';
    } else if (Platform.OS === 'android') {
      url = 'mailto:';
    }
    
    // Try to open email app
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          translate('email.verification.cannotOpenEmail') || 'Cannot Open Email',
          translate('email.verification.cannotOpenEmailMessage') || 'Unable to open your email app. Please check your email inbox manually.',
          [{ text: translate('email.verification.ok') }]
        );
      }
    });
  };
  
  // This function is no longer needed since we're not providing a direct button

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close verification screen"
          >
            <Ionicons name="close" size={24} color={colors.gray800} />
          </TouchableOpacity>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Email verification illustration */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="mail" size={60} color={colors.primary} />
              </View>
            </View>
            
            {/* Title and instructions */}
            <Text style={styles.title}>{translate('email.verification.verifyTitle') || 'Verify Your Email'}</Text>
            <Text style={styles.description}>
              {translate('email.verification.sentTo') || 'We\'ve sent a verification email to:'}
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.instructions}>
              {translate('email.verification.instructions') || 'Please check your inbox and click the verification link to activate your account. Don\'t forget to check your spam or junk folder.'}
            </Text>
            
            {/* Show error message if any */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            {/* Network status warning */}
            {isOffline && (
              <View style={styles.warningContainer}>
                <Ionicons name="cloud-offline" size={20} color="#F57C00" />
                <Text style={styles.warningText}>
                  {translate('email.verification.offlineWarning') || 'You are offline. Please connect to the internet to verify your email.'}
                </Text>
              </View>
            )}
            
            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              {/* Open email app button */}
              <TouchableOpacity
                style={styles.emailButton}
                onPress={handleOpenEmail}
                disabled={isLoading || isCheckingVerification}
                accessibilityLabel="Open Email App"
              >
                <Ionicons name="mail-open" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{translate('email.verification.openEmailApp') || 'Open Email App'}</Text>
              </TouchableOpacity>
              
              {/* Resend verification email button */}
              <TouchableOpacity
                style={[
                  styles.resendButton,
                  (resendDisabled || isLoading || isOffline) && styles.disabledButton
                ]}
                onPress={handleResend}
                disabled={resendDisabled || isLoading || isOffline}
                accessibilityLabel="Resend Email"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color={colors.primary} style={styles.buttonIcon} />
                    <Text style={styles.resendButtonText}>
                      {resendDisabled 
                        ? `${translate('email.verification.resendEmail')} (${countdown}s)` 
                        : translate('email.verification.resendEmail')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Check verification status button */}
              <TouchableOpacity
                style={[
                  styles.checkButton,
                  (isCheckingVerification || isOffline) && styles.disabledButton
                ]}
                onPress={handleCheckVerification}
                disabled={isCheckingVerification || isOffline}
                accessibilityLabel="I've Verified My Email"
              >
                {isCheckingVerification ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>{translate('email.verification.verifiedButton') || 'I\'ve Verified My Email'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Help text */}
            <Text style={styles.helpText}>
              {translate('email.verification.helpText') || 'Having trouble? Check your spam folder or contact our support team for assistance.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  iconContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(84, 104, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  emailButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  // Removed verificationPageButton style
  resendButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  checkButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.successDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  helpText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 16,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    width: '100%',
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
  warningContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    width: '100%',
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
});

export default EmailVerificationModal;