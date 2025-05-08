// src/firebase/config.ts
// This file is now a compatibility layer that re-exports from supabase/config.ts
// It allows existing code to import from firebase/config without breaking changes

import { supabase } from '../supabase/config';

// Create placeholders for Firebase objects that were used
const auth = {
  currentUser: null,
  onAuthStateChanged: () => {
    console.warn('Firebase auth is no longer used. Update imports to use supabase.');
    return () => {}; // Return dummy unsubscribe function
  }
};

// Create placeholder for Firestore db
const db = {
  collection: () => {
    console.warn('Firebase Firestore is no longer used. Update imports to use supabase.');
    return {
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => {},
        update: async () => {}
      })
    };
  }
};

// Create placeholder app
const app = {
  name: '[DEFAULT]'
};

export { auth, db };
export default app;