// src/services/nativeAuthService.ts
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../firebase/config';

WebBrowser.maybeCompleteAuthSession();

// Firebase Google credentials
// Your iOS Client ID from the provided GoogleService-Info.plist
const GOOGLE_IOS_CLIENT_ID = '205296109732-3ctpj05dak8imp6mllko8r213avmsecr.apps.googleusercontent.com';
// You'll need to get these from your Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID'; // Get this from Google Cloud Console
const GOOGLE_ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID'; // Get this from Google Cloud Console

// Google Sign In
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const { id_token } = result.params;

        // Create a Google credential with the token
        const googleCredential = GoogleAuthProvider.credential(id_token);

        // Sign in with the credential
        const userCredential = await signInWithCredential(auth, googleCredential);
        return { user: userCredential.user };
      } else {
        return { cancelled: true };
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  };

  return {
    signInWithGoogle,
    request,
    response,
  };
};

// Apple Sign In (iOS only)
export const signInWithApple = async () => {
  try {
    // Check if Apple authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple authentication is not available on this device');
    }

    // Perform the Apple sign in
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create an Apple provider credential
    const { identityToken } = credential;
    if (!identityToken) {
      throw new Error('No identity token provided');
    }

    const provider = new OAuthProvider('apple.com');
    const authCredential = provider.credential({
      idToken: identityToken,
      rawNonce: '', // If you're using a nonce, provide it here
    });

    // Sign in with Firebase
    const userCredential = await signInWithCredential(auth, authCredential);

    // If this is a new user, update their profile with the name from Apple
    // Apple only provides the name on the first sign-in
    if (credential.fullName && credential.fullName.givenName) {
      const displayName = [
        credential.fullName.givenName,
        credential.fullName.familyName
      ].filter(Boolean).join(' ');

      if (displayName && userCredential.user) {
        await userCredential.user.updateProfile({
          displayName
        });
      }
    }

    return { user: userCredential.user };
  } catch (error) {
    console.error('Apple sign in error:', error);

    // Handle specific Apple Sign In errors
    if (error.code === 'ERR_CANCELED') {
      return { cancelled: true };
    }

    return { error };
  }
};

// Check if Apple Sign In is available on this device
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    return false;
  }
};