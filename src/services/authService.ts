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
  User,
  UserCredential,
  Auth,
  AuthError,
  NextOrObserver,
  Unsubscribe
} from 'firebase/auth';
import { auth } from '../firebase/config';

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

// Auth state observer
export const subscribeToAuthChanges = (callback: NextOrObserver<User>): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};