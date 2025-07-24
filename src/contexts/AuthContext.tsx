// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { subscribeToAuthChanges, initializeUser, checkEmailVerification } from '../services/authService';
import { supabase } from '../supabase/config';
import NavigationService from '../navigation/NavigationService';
import { useUserInitialization } from './UserInitializationContext';
import { captureDiagnostics, DiagnosticType } from '../utils/diagnostics';
import { initializeRevenueCat } from '../services/revenueCatService';

// Define the shape of our context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  authError: Error | null;
  isVerifyingUser: boolean; // Added to track user verification state
  isEmailVerified: boolean; // Tracks if user's email is verified
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  authError: null,
  isVerifyingUser: false,
  isEmailVerified: false
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create provider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [verificationInProgress, setVerificationInProgress] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  
  // Access the user initialization context
  const { 
    initializeUser: initUserData,
    verifyAndInitUser,
    isInitialized,
    hasInitFailed
  } = useUserInitialization();

  // Handle auth state changes and update navigation with debouncing
  useEffect(() => {
    console.log('AuthContext: Auth state changed - isAuthenticated:', !!user);
    if (user) {
      console.log('AuthContext: User authenticated with ID:', user.id);
      
      // Check if email is verified whenever user changes
      const verifyEmail = async () => {
        const verified = await checkEmailVerification(user.id);
        setIsEmailVerified(verified);
        
        console.log('AuthContext: Email verification status:', verified);
      };
      
      verifyEmail();
    } else {
      // Reset email verification status when user is null
      setIsEmailVerified(false);
    }
    
    // Use NavigationService to update navigation based on auth state with debouncing
    // This prevents multiple rapid navigation updates during auth state changes
    if (!loading) {
      // Debounce navigation updates to prevent race conditions and wait for navigation container to mount
      const timeoutId = setTimeout(() => {
        console.log('AuthContext: Updating navigation - isAuthenticated:', !!user);
        NavigationService.navigateByAuthState(!!user);
      }, 350); // 350ms debounce to ensure navigation container is ready and avoid rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading]);
  
  // Single session check on startup - trust Supabase's auth observer for updates
  useEffect(() => {
    // Only do a single check if we don't have a user but think we might have a session
    if (!user && !loading) {
      console.log('AuthContext: Performing single session check on startup');
      
      const checkInitialSession = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            console.log('AuthContext: Found existing session, getting user data');
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              console.log('AuthContext: Updating user from existing session:', userData.user.id);
              setUser(userData.user);
            }
          }
        } catch (error) {
          console.error('AuthContext: Error in initial session check:', error);
        }
      };
      
      // Only run once when we transition from loading to not loading without a user
      checkInitialSession();
    }
  }, [user, loading]);
  
  useEffect(() => {
    // First initialize the user (important for initial load)
    const init = async () => {
      try {
        console.log('AuthContext: Initializing user...');
        const initialUser = await initializeUser();
        setUser(initialUser);
        
        // If we have a user, verify they exist in tables
        if (initialUser) {
          console.log('AuthContext: User authenticated, verifying user data in tables...');
          
          // Initialize RevenueCat for the authenticated user
          console.log('AuthContext: Initializing RevenueCat for user:', initialUser.id);
          try {
            await initializeRevenueCat(initialUser.id);
            console.log('AuthContext: RevenueCat initialized successfully');
          } catch (revenueCatError) {
            console.error('AuthContext: Failed to initialize RevenueCat:', revenueCatError);
            // Continue with user initialization even if RevenueCat fails
          }
          
          // Perform user data verification
          try {
            // Set verification in progress flag to true
            setVerificationInProgress(true);
            
            // First verify the user exists in database tables and re-initialize if needed
            const dataExists = await verifyAndInitUser(initialUser.id);
            
            // Clear verification flag
            setVerificationInProgress(false);
            
            if (!dataExists) {
              console.error('AuthContext: User data verification failed, but keeping user authenticated');
              
              // Record this error but don't sign out - let user retry initialization
              await captureDiagnostics(
                DiagnosticType.AUTH_FAILURE,
                initialUser.id,
                {
                  reason: 'data_verification_failed',
                  action: 'keep_authenticated_allow_retry',
                  timestamp: new Date().toISOString()
                }
              );
              
              // Keep user authenticated but set error state for UI to handle
              setAuthError(new Error('User data initialization failed. The app will attempt to retry automatically.'));
              console.log('AuthContext: User remains authenticated, InitializationGate will handle retry');
            } else {
              console.log('AuthContext: User data verified or re-initialized successfully');
              // Clear any previous auth errors on successful verification
              setAuthError(null);
            }
          } catch (initError) {
            const errorMessage = initError instanceof Error ? initError.message : 'Unknown error';
            const errorName = initError instanceof Error ? initError.name : 'Unknown error type';
            
            console.error('AuthContext: Error in user data verification:', {
              message: errorMessage,
              type: errorName
            });
            
            // Capture detailed diagnostics for this critical error
            await captureDiagnostics(
              DiagnosticType.AUTH_FAILURE,
              initialUser.id,
              {
                reason: 'verification_exception',
                error: {
                  message: errorMessage,
                  type: errorName
                },
                timestamp: new Date().toISOString()
              }
            );
            
            // Clear verification flag even on error
            setVerificationInProgress(false);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorType = error instanceof Error ? error.name : 'Unknown error type';
        
        // Handle auth session missing error gracefully
        if (errorType === 'AuthSessionMissingError' || errorMessage.includes('session missing')) {
          console.log('AuthContext: No active session - user needs to log in');
        } else {
          console.error('AuthContext: Error initializing user:', {
            message: errorMessage,
            type: errorType
          });
        }
        
        // Capture diagnostics for this auth error
        await captureDiagnostics(
          DiagnosticType.AUTH_FAILURE,
          null, // We don't have a user ID at this point
          {
            stage: 'initialization',
            error: {
              message: errorMessage,
              type: errorType
            },
            timestamp: new Date().toISOString()
          }
        );
        
        setAuthError(error instanceof Error ? error : new Error('Unknown authentication error'));
      } finally {
        // Set loading to false even if initialization fails
        setLoading(false);
      }
    };
    
    // Start initialization
    init();

    // Subscribe to auth state changes for future updates
    const unsubscribe = subscribeToAuthChanges((supabaseUser) => {
      console.log('AuthContext: Auth state changed', supabaseUser?.id);
      
      // When user signs out, update state immediately to trigger navigation
      if (!supabaseUser) {
        console.log('AuthContext: User signed out, updating auth state');
        setUser(null);
        return; // No further verification needed
      }
      
      // Update user state which should trigger navigation due to isAuthenticated change
      console.log('AuthContext: Updating user state to authenticated user:', supabaseUser.id);
      setUser(supabaseUser);
      
      // Log that navigation should now happen due to isAuthenticated becoming true
      console.log('AuthContext: isAuthenticated is now true, navigation should update');
      
      // Only verify if we already have a different user (user switching case)
      // This means we've already gone through startup initialization
      // and are switching users
      if (user && user.id !== supabaseUser.id) {
        console.log('AuthContext: New user authenticated, verifying user data tables...');
        
        // Initialize RevenueCat for the new user
        console.log('AuthContext: Re-initializing RevenueCat for new user:', supabaseUser.id);
        (async () => {
          try {
            await initializeRevenueCat(supabaseUser.id);
            console.log('AuthContext: RevenueCat re-initialized successfully');
          } catch (revenueCatError) {
            console.error('AuthContext: Failed to re-initialize RevenueCat:', revenueCatError);
            // Continue with user verification even if RevenueCat fails
          }
        })();
        
        // Set verification in progress flag to true
        setVerificationInProgress(true);
        
        verifyAndInitUser(supabaseUser.id)
          .catch(error => {
            console.error('AuthContext: Error verifying user data after auth change:', error);
          })
          .finally(() => {
            // Clear verification flag when done
            setVerificationInProgress(false);
          });
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Value to be provided by context
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    authError,
    isVerifyingUser: verificationInProgress,
    isEmailVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};