// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
  User,
  UserCredential,
  Auth,
  AuthError,
  NextOrObserver,
  Unsubscribe
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

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
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user: User = userCredential.user;

    // Update the user's profile with displayName
    await updateProfile(user, { displayName });

    return { user };
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
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Sign out user
export const logoutUser = async (): Promise<AuthResponse> => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<AuthResponse> => {
  try {
    await sendPasswordResetEmail(auth, email);
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
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    const updateData: { displayName: string; photoURL?: string } = { displayName };
    if (photoURL) updateData.photoURL = photoURL;

    await updateProfile(user, updateData);
    return { success: true };
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
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in or email is not available');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    // Re-authenticate user before changing password
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);

    return { success: true };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Get ID token for the current user
export const getIdToken = async (user: User, forceRefresh: boolean = false): Promise<string> => {
  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Error getting ID token:', error);
    throw error;
  }
};

// Auth state observer
export const subscribeToAuthChanges = (callback: NextOrObserver<User>): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// Google Auth configuration
// These are example values - update with your actual values from Google Cloud Console
const ANDROID_CLIENT_ID = '205296109732-9j0a2h3b3qjvmf6gddd1t41rjt8a62p3.apps.googleusercontent.com';
const IOS_CLIENT_ID = '205296109732-p98kdu02d8jva57j5oef4m3hgv09ufv7.apps.googleusercontent.com';
const EXPO_CLIENT_ID = '205296109732-tiqvf6lkojlc2bj6gtp38h6p9v0a84rr.apps.googleusercontent.com';

// Initialize WebBrowser for authentication
WebBrowser.maybeCompleteAuthSession();

// Function to get Google Auth configuration
export const useGoogleAuth = () => {
  // Create the redirect URI
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'confluency',
    path: 'auth'
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    expoClientId: EXPO_CLIENT_ID,
    redirectUri: redirectUri
  });

  return { request, response, promptAsync };
};

// Sign in with Google
export const signInWithGoogle = async (accessToken: string): Promise<AuthResponse> => {
  try {
    // Create a Google credential with the token
    const credential = GoogleAuthProvider.credential(null, accessToken);

    // Sign in with the credential
    const userCredential = await signInWithCredential(auth, credential);
    return { user: userCredential.user };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { error: error as AuthError };
  }
};