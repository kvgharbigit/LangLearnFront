// src/services/authService.ts
// This file is now a compatibility layer that re-exports all auth functions
// from the supabaseAuthService to maintain backward compatibility

import {
  AuthResponse,
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
} from './supabaseAuthService';

// Re-export all auth functions
export {
  AuthResponse,
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

// Export the default object as well
import supabaseAuthService from './supabaseAuthService';
export default supabaseAuthService;