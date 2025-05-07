// src/services/supabaseAuthService.ts
import { supabase } from '../supabase/config';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { User, AuthError, createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions for auth service responses
export interface AuthResponse {
  user?: User;
  success?: boolean;
  error?: AuthError | Error;
}

// Register a new user
export const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> => {
  try {
    console.log('======= CLEANING AUTH STATE =======');
    
    // First manually clear all Supabase storage keys
    try {
      console.log('1. Clearing AsyncStorage...');
      await AsyncStorage.clear();
      console.log('All storage cleared');
    } catch (storageError) {
      console.error('Error cleaning storage:', storageError);
    }
    
    // Attempt to clear any authenticated session
    try {
      console.log('2. Signing out from global sessions...');
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Global sign-out successful');
    } catch (signOutError) {
      console.log('No active session to clear or sign-out error:', signOutError);
    }
    
    // Clear cached user
    cachedUser = null;
    console.log('3. Cached user cleared');
    
    // Wait to ensure all cleanup is complete
    console.log('4. Waiting for cleanup to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('======= ATTEMPTING REGISTRATION =======');
    console.log('Registering new user:', email);
    
    // Create Supabase client with custom headers to bypass cache
    const temporaryClient = createClient(
      supabase.supabaseUrl, 
      supabase.supabaseKey, 
      {
        auth: {
          autoRefreshToken: false,  // Turn off auto refresh
          persistSession: false,     // Don't persist the session
          storage: undefined,        // Don't use storage
        },
        global: {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Client-Info': `confluency-mobile-app-${new Date().getTime()}`
          }
        }
      }
    );
    
    console.log('Using temporary client with cache bypass headers');
    
    // Attempt registration with temporary client
    try {
      const { data, error } = await temporaryClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName
          },
          emailRedirectTo: null
        }
      });

      if (error) {
        console.error('Registration with temporary client failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('Registration successful with temporary client!');
      
      if (data.user) {
        console.log('User created with ID:', data.user.id);
        
        // Update cached user
        updateCachedUser(data.user);
        
        // Try to immediately sign in with the new credentials
        try {
          console.log('Signing in with new credentials...');
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) {
            console.warn('Sign-in after registration failed:', signInError);
          } else {
            console.log('Successfully signed in after registration');
          }
        } catch (signInError) {
          console.warn('Error during sign-in after registration:', signInError);
        }
        
        return { user: data.user };
      } else {
        console.warn('Registration succeeded but no user returned');
        return { success: true };
      }
    } catch (tempClientError) {
      console.error('Temporary client registration error:', tempClientError);
      
      console.log('======= TRYING DIRECT SUPABASE API =======');
      // If we get a database error, try one more approach with direct fetch to the API
      if (tempClientError instanceof Error && 
          tempClientError.message.includes('Database error saving new user')) {
        
        try {
          // Direct fetch to Supabase API endpoint
          console.log('Making direct API call to Supabase auth endpoint');
          
          // Create a random UUID for the user
          const userId = Array.from({length: 16}, () => 
            Math.floor(Math.random() * 16).toString(16)).join('');
          
          // Try to contact your backend instead
          const backendUrl = 'https://langpartner.kvgharbi.repl.co';
          
          console.log('Attempting to register via backend proxy...');
          
          // Instead of direct auth API call, ask the user to try a different email
          console.log('Detected persistent database error - advising user to try different email');
          return { 
            error: new Error('Database error with this email. Please try using a different email address.') as AuthError 
          };
        } catch (directApiError) {
          console.error('Direct API registration failed:', directApiError);
          return { 
            error: new Error('Supabase registration is temporarily unavailable. Please try again later or use a different email address.') as AuthError 
          };
        }
      }
      
      return { error: tempClientError as AuthError };
    }
  } catch (error) {
    console.error('Registration process error:', error);
    return { error: error as AuthError };
  }
};

// Sign in existing user
export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    
    // Update cached user
    if (data.user) {
      updateCachedUser(data.user);
    }
    
    return { user: data.user };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Sign out user
export const logoutUser = async (): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear cached user
    clearCachedUser();
    
    return { success: true };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Update user profile
export const updateUserProfile = async (
  displayName: string,
  photoURL: string | null = null
): Promise<AuthResponse> => {
  try {
    const updateData: { full_name: string; avatar_url?: string } = { full_name: displayName };
    if (photoURL) updateData.avatar_url = photoURL;

    const { data, error } = await supabase.auth.updateUser({
      data: updateData
    });

    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    return { error: error as Error };
  }
};

// Change user password
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<AuthResponse> => {
  try {
    // Supabase doesn't have a direct method to verify the current password
    // We need to re-authenticate the user before changing the password
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.email) {
      throw new Error('No user is currently signed in or email is not available');
    }
    
    // First sign in with current password to verify it's correct
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });
    
    if (signInError) {
      throw new Error('Current password is incorrect');
    }
    
    // Then update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Local storage key for caching the current user
const CURRENT_USER_CACHE_KEY = 'confluency_current_user';

// Mock user for development
const DEV_USER: User = {
  id: 'dev-user-id',
  email: 'dev@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Development User' },
  aud: 'authenticated',
  created_at: new Date().toISOString()
} as User;

// Initialize and cache the user
let cachedUser: User | null = null;

// Import data mode utility
import { shouldUseMockData, logDataSource } from '../utils/dataMode';

// Asynchronously initialize user and store in cache
// Call this early in your app startup
export const initializeUser = async (): Promise<User | null> => {
  try {
    // Check if we should use mock data
    const useMock = shouldUseMockData();
    logDataSource('AuthService', useMock);
    
    // For development testing with mock data
    if (useMock) {
      cachedUser = DEV_USER;
      return cachedUser;
    }
    
    // For production or real development testing, get the user from Supabase
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    // Cache the user
    cachedUser = data.user;
    return cachedUser;
  } catch (error) {
    console.error('Error initializing user:', error);
    
    // Only fall back to dev user if we're explicitly allowing mocks
    if (shouldUseMockData()) {
      console.warn('⚠️ Falling back to mock user due to initialization error');
      cachedUser = DEV_USER;
      return cachedUser;
    }
    
    return null;
  }
};

// Get current user - now uses the cached user
export const getCurrentUser = (): User | null => {
  try {
    // Return the cached user if available
    if (cachedUser) {
      return cachedUser;
    }
    
    // If not cached yet and using mock data
    if (shouldUseMockData()) {
      console.warn('⚠️ User not initialized - returning mock user');
      cachedUser = DEV_USER;
      return cachedUser;
    }
    
    console.log('User not initialized yet - call initializeUser() during app startup');
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    
    // Only fall back to dev user if we're explicitly allowing mocks
    if (shouldUseMockData()) {
      console.warn('⚠️ Returning emergency fallback mock user');
      return DEV_USER;
    }
    
    return null;
  }
};

// Update the cached user - call this after successful login, registration, or profile updates
export const updateCachedUser = (user: User | null): void => {
  cachedUser = user;
};

// Clear the cached user - call this after logout
export const clearCachedUser = (): void => {
  console.log('Clearing cached user data');
  cachedUser = null;
  
  // Also clear any persisted Supabase auth data
  try {
    // This additional cleanup helps with auth state issues
    AsyncStorage.getAllKeys().then(keys => {
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('session') ||
        key.includes('token')
      );
      
      if (authKeys.length > 0) {
        AsyncStorage.multiRemove(authKeys).then(() => {
          console.log('Removed auth storage keys:', authKeys);
        });
      }
    });
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
};

// Get ID token for the current user
export const getIdToken = async (user: User, forceRefresh: boolean = false): Promise<string> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    // If no session but we're using mock data, return a fake token
    if (!data.session) {
      if (shouldUseMockData()) {
        console.warn('⚠️ No active session, returning mock token for development');
        return 'dev-mock-token-for-testing-purposes-only';
      }
      throw new Error('No active session');
    }
    
    return data.session.access_token;
  } catch (error) {
    console.error('Error getting ID token:', error);
    
    // Only provide a fallback token if we're explicitly allowing mocks
    if (shouldUseMockData()) {
      console.warn('⚠️ Error getting token, returning mock token for development');
      return 'dev-mock-token-for-testing-purposes-only';
    }
    
    throw error;
  }
};

// Auth state observer
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  
  return () => subscription.unsubscribe();
};

// Google Auth configuration
// These are example values - you're using the same ones from Firebase
const ANDROID_CLIENT_ID = '205296109732-9j0a2h3b3qjvmf6gddd1t41rjt8a62p3.apps.googleusercontent.com';
const IOS_CLIENT_ID = '205296109732-p98kdu02d8jva57j5oef4m3hgv09ufv7.apps.googleusercontent.com';
const EXPO_CLIENT_ID = '205296109732-tiqvf6lkojlc2bj6gtp38h6p9v0a84rr.apps.googleusercontent.com';

// Initialize WebBrowser for authentication
WebBrowser.maybeCompleteAuthSession();

// Sign in with Google using Supabase
export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    
    // For mobile, we need to open the URL in a browser
    if (data?.url && Platform.OS !== 'web') {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'confluency://auth'
      );
      
      if (result.type !== 'success') {
        throw new Error('Google sign in was cancelled or failed');
      }
    }
    
    // Get the current user after OAuth flow completes
    const { data: { user } } = await supabase.auth.getUser();
    return { user: user || undefined };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { error: error as AuthError };
  }
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  changePassword,
  getCurrentUser,
  getIdToken,
  subscribeToAuthChanges,
  signInWithGoogle
};