// src/utils/authErrors.ts
// Standardizes error handling for authentication flows

// Define error categories for better organization
export enum AuthErrorCategory {
  CREDENTIALS = 'credentials',
  NETWORK = 'network',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rateLimit',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

// Interface for standardized auth errors
export interface StandardAuthError {
  message: string;
  originalError?: any;
  category: AuthErrorCategory;
  code?: string;
  action?: string; // Suggested action to resolve the error
}

/**
 * Standardizes authentication error messages for consistent UI display
 * @param error The original error from the auth service
 * @returns A standardized error object with consistent message and category
 */
export function standardizeAuthError(error: any): StandardAuthError {
  // Default error with fallback message
  const standardError: StandardAuthError = {
    message: 'An unknown error occurred',
    originalError: error,
    category: AuthErrorCategory.UNKNOWN
  };

  // No error provided
  if (!error) {
    return standardError;
  }

  // Extract the error message if available
  const errorMessage = error.message || error.error_description || 
                      (typeof error === 'string' ? error : 'Unknown error');

  // Check for network connectivity issues
  if (errorMessage.includes('network') || 
      errorMessage.includes('connect') || 
      errorMessage.includes('timeout') ||
      errorMessage.includes('offline')) {
    return {
      message: 'Network error. Please check your internet connection and try again.',
      originalError: error,
      category: AuthErrorCategory.NETWORK,
      action: 'Check your internet connection'
    };
  }

  // Check for invalid credentials
  if (errorMessage.includes('Invalid login') || 
      errorMessage.includes('Invalid credentials') ||
      errorMessage.includes('incorrect') || 
      errorMessage.includes('password') ||
      errorMessage.includes('auth/wrong-password') ||
      errorMessage.includes('auth/user-not-found') ||
      errorMessage.includes('auth/invalid-email')) {
    return {
      message: 'Invalid email or password',
      originalError: error,
      category: AuthErrorCategory.CREDENTIALS,
      action: 'Check your email and password'
    };
  }

  // Check for rate limiting
  if (errorMessage.includes('rate limit') || 
      errorMessage.includes('too many') ||
      errorMessage.includes('auth/too-many-requests')) {
    return {
      message: 'Too many attempts. Please try again later.',
      originalError: error,
      category: AuthErrorCategory.RATE_LIMIT,
      action: 'Wait a moment before trying again'
    };
  }

  // Email already in use
  if (errorMessage.includes('email already in use') || 
      errorMessage.includes('already registered') ||
      errorMessage.includes('auth/email-already-in-use')) {
    return {
      message: 'This email is already registered',
      originalError: error,
      category: AuthErrorCategory.VALIDATION,
      action: 'Use a different email or try to sign in'
    };
  }

  // Weak password
  if (errorMessage.includes('weak password') || 
      errorMessage.includes('auth/weak-password')) {
    return {
      message: 'Password is too weak. Use at least 8 characters with a mix of letters, numbers, and symbols.',
      originalError: error,
      category: AuthErrorCategory.VALIDATION,
      action: 'Choose a stronger password'
    };
  }

  // Server errors
  if (errorMessage.includes('server') || 
      errorMessage.includes('internal') ||
      errorMessage.includes('Database error')) {
    return {
      message: 'Server error. Please try again later.',
      originalError: error, 
      category: AuthErrorCategory.SERVER,
      action: 'Try again later'
    };
  }

  // Default case - use the original error message but clean it up
  let cleanErrorMessage = errorMessage;
  
  // Remove common prefixes used by auth providers
  cleanErrorMessage = cleanErrorMessage
    .replace(/auth\//, '')
    .replace(/-/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

  return {
    message: cleanErrorMessage,
    originalError: error,
    category: AuthErrorCategory.UNKNOWN
  };
}

/**
 * Gets a user-friendly message for a standard auth error
 * @param error The standardized auth error
 * @returns A user-friendly error message
 */
export function getAuthErrorMessage(error: StandardAuthError): string {
  return error.message;
}

export default {
  standardizeAuthError,
  getAuthErrorMessage,
  AuthErrorCategory
};