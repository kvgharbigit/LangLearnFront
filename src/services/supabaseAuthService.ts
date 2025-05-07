// src/services/supabaseAuthService.ts
import { supabase } from '../supabase/config';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { User, AuthError } from '@supabase/supabase-js';

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName
        }
      }
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
  cachedUser = null;
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