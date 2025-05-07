// src/supabase/config.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration
const supabaseUrl = 'https://hkanndmudvnjrvkisklp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYW5uZG11ZHZuanJ2a2lza2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2Mjc0MDMsImV4cCI6MjA2MjIwMzQwM30.OsnzQS5EBT31LYeloAvc80yaxJ70AVsTEC3atNjWn4o';

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