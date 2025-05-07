// src/supabase/config.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = 'https://iwgfkptyqgsjwomzzimk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Z2ZrcHR5cWdzandvbXp6aW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MDE5NzUsImV4cCI6MjA2MjE3Nzk3NX0.VQDr7WJ-m9UKlszdZ5Xhx294wgQD6WNrto1DIlp61ag';

// Create Supabase client with AsyncStorage for persistence
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web'
  }
});

export { supabase };
export default supabase;