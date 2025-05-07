// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { subscribeToAuthChanges, initializeUser } from '../services/supabaseAuthService';

// Define the shape of our context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create provider
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // First initialize the user (important for initial load)
    const init = async () => {
      try {
        console.log('AuthContext: Initializing user...');
        const initialUser = await initializeUser();
        setUser(initialUser);
      } catch (error) {
        console.error('AuthContext: Error initializing user:', error);
      } finally {
        // Set loading to false even if initialization fails
        setLoading(false);
      }
    };
    
    // Start initialization
    init();

    // Subscribe to auth state changes for future updates
    const unsubscribe = subscribeToAuthChanges((supabaseUser) => {
      console.log('AuthContext: Auth state changed', supabaseUser?.id);
      setUser(supabaseUser);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  // Value to be provided by context
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};