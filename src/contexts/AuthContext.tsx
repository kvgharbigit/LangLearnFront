// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { subscribeToAuthChanges, initializeUser } from '../services/supabaseAuthService';
import { useUserInitialization } from './UserInitializationContext';
import { captureDiagnostics, DiagnosticType } from '../utils/diagnostics';

// Define the shape of our context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  authError: Error | null;
  isVerifyingUser: boolean; // Added to track user verification state
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  authError: null,
  isVerifyingUser: false
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
  
  // Access the user initialization context
  const { 
    initializeUser: initUserData,
    verifyAndInitUser,
    isInitialized,
    hasInitFailed
  } = useUserInitialization();

  useEffect(() => {
    // First initialize the user (important for initial load)
    const init = async () => {
      try {
        console.log('AuthContext: Initializing user...');
        const initialUser = await initializeUser();
        setUser(initialUser);
        
        // If we have a user, verify they exist in tables and initialize if needed
        if (initialUser) {
          console.log('AuthContext: User authenticated, verifying user data in tables...');
          try {
            // Set verification in progress flag to true
            setVerificationInProgress(true);
            
            // First verify the user exists in database tables and re-initialize if needed
            const dataExists = await verifyAndInitUser(initialUser.id);
            
            // Clear verification flag
            setVerificationInProgress(false);
            
            if (!dataExists) {
              console.error('AuthContext: User data verification failed, signing out user');
              
              // Record this critical error before signing out
              await captureDiagnostics(
                DiagnosticType.AUTH_FAILURE,
                initialUser.id,
                {
                  reason: 'data_verification_failed',
                  action: 'sign_out',
                  timestamp: new Date().toISOString()
                }
              );
              
              // If verification failed and re-initialization failed, sign out
              const { supabase } = await import('../supabase/config');
              await supabase.auth.signOut();
              setUser(null);
              setAuthError(new Error('User data cannot be initialized. Please contact support.'));
            } else {
              console.log('AuthContext: User data verified or re-initialized successfully');
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
            
            // Consider signing out user here too if critical
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorType = error instanceof Error ? error.name : 'Unknown error type';
        
        console.error('AuthContext: Error initializing user:', {
          message: errorMessage,
          type: errorType
        });
        
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
      
      // Update user state
      setUser(supabaseUser);
      
      // Skip verification during app startup - only verify for actual sign-in events
      // If this is the initial session (when user was null and now is populated), skip verification
      // since init() already handled it
      if (!user || !supabaseUser) {
        console.log('AuthContext: Skipping verification during initial session or sign-out');
        return;
      }
      
      // If this is a real sign-in after app is running (different user), verify the data
      if (user.id !== supabaseUser.id) {
        console.log('AuthContext: New user authenticated, verifying user data tables...');
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
    isVerifyingUser: verificationInProgress
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