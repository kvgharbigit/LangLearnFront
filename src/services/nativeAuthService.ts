// src/services/nativeAuthService.ts
// This file is now a compatibility layer using Supabase auth
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from '../supabase/config';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth credentials
// Get from Constants.expoConfig.extra
import Constants from 'expo-constants';
const extraConfig = Constants.expoConfig?.extra || {};

// Your iOS Client ID 
const GOOGLE_IOS_CLIENT_ID = extraConfig.googleIosClientId || '205296109732-3ctpj05dak8imp6mllko8r213avmsecr.apps.googleusercontent.com';
// Web and Android client IDs from app.json
const GOOGLE_WEB_CLIENT_ID = extraConfig.googleExpoClientId || 'YOUR_WEB_CLIENT_ID'; 
const GOOGLE_ANDROID_CLIENT_ID = extraConfig.googleAndroidClientId || 'YOUR_ANDROID_CLIENT_ID';

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

        // Sign in with Supabase using the Google token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: id_token,
        });

        if (error) throw error;
        
        return { user: data.user };
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

    // Get the identity token from Apple
    const { identityToken } = credential;
    if (!identityToken) {
      throw new Error('No identity token provided');
    }

    // Sign in with Supabase using the Apple identity token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });

    if (error) throw error;

    // If this is a new user, update their profile with the name from Apple
    // Apple only provides the name on the first sign-in
    if (credential.fullName && credential.fullName.givenName && data.user) {
      const displayName = [
        credential.fullName.givenName,
        credential.fullName.familyName
      ].filter(Boolean).join(' ');

      if (displayName) {
        // Update user metadata in Supabase
        await supabase.auth.updateUser({
          data: { full_name: displayName }
        });
      }
    }

    return { user: data.user };
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