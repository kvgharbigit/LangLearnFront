// src/utils/initializeUserData.ts
import { supabase } from '../supabase/config';

/**
 * Initializes user data in the backend by making an API call to the subscription endpoint.
 * This ensures that database tables are created for the user.
 * 
 * @param userId The Supabase user ID
 * @returns A promise that resolves when initialization is complete
 */
export const initializeUserData = async (userId: string): Promise<void> => {
  console.log('Initializing user data tables for ID:', userId);
  
  try {
    // First try to get the current session for signed-in users
    const { data: { session } } = await supabase.auth.getSession();
    
    // Define the user data
    const timestamp = Date.now();
    const userData = {
      user_id: userId,
      subscription_tier: 'free',
      subscription_start: timestamp,
      billing_cycle_start: timestamp,
      billing_cycle_end: timestamp + (30 * 24 * 60 * 60 * 1000), // 30 days
    };
    
    // Define the base URL of your backend
    const backendUrl = 'http://192.168.86.241:8004'; // Desktop WiFi IP address
    console.log('Using backend URL:', backendUrl);
    
    if (session && session.access_token) {
      // For signed-in users, we can use the normal endpoint
      console.log('Using authenticated endpoint for user initialization');
      const response = await fetch(`${backendUrl}/user/subscription`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('User data initialized successfully via authenticated endpoint');
        return;
      } else {
        console.log('Authenticated initialization failed, falling back to direct method');
      }
    }
    
    // IMPORTANT: For new registrations, we need to initialize without requiring a session
    // since Supabase requires email confirmation before login.
    console.log('Using direct initialization endpoint');
    
    // Make a direct POST request to initialize the user
    const response = await fetch(`${backendUrl}/user/initialize-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include a special header that your backend can verify
        'X-Initialize-User': 'true',
        'X-User-Id': userId
      },
      body: JSON.stringify(userData)
    });
    
    if (response.ok) {
      console.log('User data initialized successfully via direct endpoint');
      const result = await response.json();
      console.log('Initialization result:', result);
    } else {
      console.error('User initialization failed:', await response.text());
    }
  } catch (error) {
    console.error('Error initializing user data:', error);
  }
};

export default initializeUserData;