// src/services/nativeGoogleAuthService.ts
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Platform } from 'react-native';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  const IOS_CLIENT_ID = '205296109732-3ctpj05dak8imp6mllko8r213avmsecr.apps.googleusercontent.com';
  const WEB_CLIENT_ID = '205296109732-tiqvf6lkojlc2bj6gtp38h6p9v0a84rr.apps.googleusercontent.com';

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined,
    offlineAccess: true,
  });
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Check if play services are available
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Sign in with Google
    const { idToken } = await GoogleSignin.signIn();
    
    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);
    
    // Sign in with Firebase using the Google credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    
    return { user: userCredential.user };
  } catch (error) {
    console.error('Native Google sign in error:', error);
    
    // Handle specific error states
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { cancelled: true };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { error: new Error('Google Sign-In operation is in progress') };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { error: new Error('Google Play Services are not available') };
    }
    
    return { error };
  }
};

// Sign out from Google
export const signOutFromGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error) {
    console.error('Google sign out error:', error);
    return { error };
  }
};

// Get current user info
export const getCurrentGoogleUser = async () => {
  try {
    const userInfo = await GoogleSignin.getCurrentUser();
    return { userInfo };
  } catch (error) {
    console.error('Error getting current Google user:', error);
    return { error };
  }
};

// Check if user is signed in with Google
export const isGoogleSignedIn = async () => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    return { isSignedIn };
  } catch (error) {
    console.error('Error checking Google sign in status:', error);
    return { error };
  }
};