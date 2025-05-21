// src/services/authService.ts
// Unified authentication service that centralizes all auth functionality

import {
  AuthResponse,
  DeleteAccountResponse,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  changePassword,
  getCurrentUser,
  getIdToken,
  subscribeToAuthChanges,
  deleteAccount,
  updateCachedUser,
  clearCachedUser,
  initializeUser
} from './supabaseAuthService';

// Export all core auth functions
export {
  AuthResponse,
  DeleteAccountResponse,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  changePassword,
  getCurrentUser,
  getIdToken,
  subscribeToAuthChanges,
  deleteAccount,
  updateCachedUser,
  clearCachedUser,
  initializeUser
};

// Create and export the default auth service object
const authService = {
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updateUserProfile,
  changePassword,
  getCurrentUser,
  getIdToken,
  subscribeToAuthChanges,
  deleteAccount,
  updateCachedUser,
  clearCachedUser,
  initializeUser
};

export default authService;