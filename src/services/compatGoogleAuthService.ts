// src/services/compatGoogleAuthService.ts
import { Platform } from 'react-native';
import { auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure WebBrowser for web-based authentication
WebBrowser.maybeCompleteAuthSession();

// Your client IDs
const IOS_CLIENT_ID = '984417336702-dhfmjetmjmn5lrp91erart3ouopipthc.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '984417336702-7ip4lcla4elk558ednu4ljnr1o68vkgg.apps.googleusercontent.com';
const WEB_CLIENT_ID = '205296109732-tiqvf6lkojlc2bj6gtp38h6p9v0a84rr.apps.googleusercontent.com';

// Create Google provider for discovery
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Function to initialize Google Sign-In
export const configureGoogleSignIn = () => {
  console.log("Google Sign-In configured for:", Platform.OS);
};

// Google Sign-In function using Expo AuthSession
export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google Sign-In flow");
    
    // Choose the appropriate client ID based on platform
    const clientId = Platform.OS === 'ios' 
      ? IOS_CLIENT_ID 
      : Platform.OS === 'android' 
        ? ANDROID_CLIENT_ID 
        : WEB_CLIENT_ID;
        
    // Create redirect URL
    const redirectUri = AuthSession.makeRedirectUri({ 
      scheme: 'confluency',
      useProxy: true
    });
    
    console.log("Using client ID:", clientId);
    console.log("Redirect URI:", redirectUri);
    
    // Create auth request
    const authRequest = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      responseType: 'token',
      scopes: ['profile', 'email'],
      usePKCE: false,
    });

    // Prompt the user to authenticate
    console.log("Prompting for authentication...");
    const result = await authRequest.promptAsync(discovery);
    console.log("Auth result type:", result.type);
    
    if (result.type === 'success') {
      // Extract access token from response parameters
      const { access_token } = result.params;
      
      if (!access_token) {
        console.error("No access token received");
        return { error: new Error("No access token received") };
      }
      
      console.log("Access token received, creating credential");
      
      // Create a Google credential with the token
      const credential = GoogleAuthProvider.credential(null, access_token);
      
      // Sign in with Firebase
      console.log("Signing in with Firebase...");
      const userCredential = await signInWithCredential(auth, credential);
      console.log("Firebase sign-in successful");
      
      return { user: userCredential.user };
    } else if (result.type === 'cancel') {
      console.log("Auth cancelled by user");
      return { cancelled: true };
    } else {
      console.error("Auth error:", result);
      return { error: new Error(`Authentication failed: ${result.type}`) };
    }
  } catch (error) {
    console.error("Google sign in error:", error);
    return { error };
  }
};

// Sign out function
export const signOutFromGoogle = async () => {
  try {
    // Sign out from Firebase
    await auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};