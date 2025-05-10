// src/components/InitializationGate.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { useUserInitialization, InitializationStatus } from '../contexts/UserInitializationContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/config';
import colors from '../styles/colors';
import { Ionicons } from '@expo/vector-icons';

interface InitializationGateProps {
  children: React.ReactNode;
}

const { width } = Dimensions.get('window');

/**
 * A component that acts as a gate, only allowing children to render
 * if user data has been properly initialized
 */
const InitializationGate: React.FC<InitializationGateProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { 
    initStatus, 
    isInitialized, 
    isInitializing, 
    hasInitFailed, 
    initError, 
    initializeUser,
    isOffline,
    resetInitStatus
  } = useUserInitialization();
  
  const [retryCount, setRetryCount] = useState(0);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  
  // Animate the component when it mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  // Attempt initialization when authenticated
  useEffect(() => {
    const attemptInitialization = async () => {
      if (isAuthenticated && user && initStatus === InitializationStatus.UNKNOWN) {
        console.log('InitializationGate: Attempting to initialize user data');
        try {
          await initializeUser(user.id);
        } catch (error) {
          console.error('InitializationGate: Error initializing user data:', error);
        }
      }
    };
    
    attemptInitialization();
  }, [isAuthenticated, user, initStatus]);
  
  // Handle retry
  const handleRetry = async () => {
    if (!user) return;
    
    setRetryCount(prev => prev + 1);
    resetInitStatus();
    
    try {
      await initializeUser(user.id);
    } catch (error) {
      console.error('InitializationGate: Retry error:', error);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      resetInitStatus();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('InitializationGate: Error signing out:', error);
    }
  };
  
  // If not authenticated or already initialized, render children
  if (!isAuthenticated || isInitialized) {
    return <>{children}</>;
  }
  
  // Render loading or error states
  return (
    <View style={styles.container}>
      <View style={styles.backgroundContainer}>
        <View style={styles.bgGradient1} />
        <View style={styles.bgGradient2} />
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
      </View>
      
      <Animated.View 
        style={[
          styles.contentContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Image
          source={require('../../assets/transparent_background_icon.png')}
          style={styles.logo}
        />
        
        <Text style={styles.title}>Confluency</Text>
        
        {isInitializing ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.message}>Initializing your account...</Text>
            <Text style={styles.submessage}>Please wait while we set up your account</Text>
          </>
        ) : hasInitFailed ? (
          <>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={36} color="#B71C1C" />
              <Text style={styles.errorTitle}>Initialization Failed</Text>
              <Text style={styles.errorMessage}>
                {isOffline 
                  ? "You're offline. Please check your internet connection and try again." 
                  : "We couldn't set up your account data. Please try again."}
              </Text>
              {initError && showDebugInfo && (
                <Text style={styles.errorDetails}>{initError}</Text>
              )}
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={handleRetry}
                disabled={isOffline}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.logoutButton]} 
                onPress={handleLogout}
              >
                <Ionicons name="exit-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => setShowDebugInfo(!showDebugInfo)}
            >
              <Text style={styles.debugButtonText}>
                {showDebugInfo ? "Hide Details" : "Show Details"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
            <Text style={styles.message}>Preparing your experience...</Text>
          </>
        )}
      </Animated.View>
    </View>
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
    height: '100%',
    overflow: 'hidden',
  },
  bgGradient1: {
    position: 'absolute',
    width: width * 1.5,
    height: '60%',
    backgroundColor: '#F0F4FF',
    top: -100,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
    transform: [{ rotate: '-10deg' }],
    opacity: 0.7,
  },
  bgGradient2: {
    position: 'absolute',
    width: width * 1.8,
    height: '35%',
    backgroundColor: '#EEF1FF',
    top: -100,
    right: -100,
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
    top: '60%',
    right: -70,
    opacity: 0.3,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: '80%',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B71C1C',
    marginTop: 10,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.gray800,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    gap: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButton: {
    backgroundColor: colors.primary,
  },
  logoutButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  debugButton: {
    marginTop: 30,
    padding: 10,
  },
  debugButtonText: {
    color: colors.gray500,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default InitializationGate;