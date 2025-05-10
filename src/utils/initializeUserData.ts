// src/utils/initializeUserData.ts
import { supabase } from '../supabase/config';

/**
 * Initializes user data in the backend by making an API call to the subscription endpoint.
 * This ensures that database tables are created for the user.
 * 
 * @param userId The Supabase user ID
 * @returns A promise that resolves when initialization is complete
 */
export const initializeUserData = async (userId: string): Promise<boolean> => {
  console.log('Initializing user data for ID:', userId);
  
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Define the base URL of your backend
    const backendUrl = 'https://language-tutor-984417336702.asia-east1.run.app';
    console.log('Using backend URL:', backendUrl);
    
    // First try the new user-data initialization endpoint
    if (session && session.access_token) {
      try {
        console.log('Calling new user-data initialization endpoint...');
        const response = await fetch(`${backendUrl}/user-data/initialize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('User data initialized successfully:', result);
          return true;
        } else {
          const errorText = await response.text();
          console.warn('Failed to initialize via new endpoint:', errorText);
          // Log detailed error for debugging
          console.error(`Main endpoint initialization failed with status ${response.status}: ${errorText}`);
          // Continue to fallback methods
        }
      } catch (error) {
        console.warn('Error calling new initialization endpoint:', error);
        // Continue to fallback methods
      }
    }
    
    // If the new endpoint fails or session isn't available, try the existing methods
    console.log('Falling back to previous initialization methods...');
    
    // First check if the user record already exists in our database
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    // If the user record exists, no need to initialize
    if (existingUser) {
      console.log('User data already exists in database, skipping initialization');
      return true;
    }
    
    console.log('User data not found, proceeding with legacy initialization...');
    
    // Define the user data
    // Use seconds instead of milliseconds to avoid integer overflow
    const timestamp = Math.floor(Date.now() / 1000);
    const userData = {
      user_id: userId,
      subscription_tier: 'free',
      subscription_start: timestamp,
      billing_cycle_start: timestamp,
      billing_cycle_end: timestamp + (30 * 24 * 60 * 60), // 30 days in seconds
    };
    
    // Try existing endpoints for backward compatibility
    if (session && session.access_token) {
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
        return true;
      } else {
        console.log('Authenticated initialization failed, falling back to direct method');
      }
    }
    
    // Final fallback: direct initialization
    console.log('Using direct initialization endpoint');
    
    // Make a direct POST request to initialize the user
    const response = await fetch(`${backendUrl}/user/initialize-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Initialize-User': 'true',
        'X-User-Id': userId
      },
      body: JSON.stringify(userData)
    });
    
    if (response.ok) {
      console.log('User data initialized successfully via direct endpoint');
      const result = await response.json();
      console.log('Initialization result:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('User initialization failed:', errorText);
      throw new Error(`Initialization failed: ${errorText}`);
    }
  } catch (error) {
    console.error('Error initializing user data:', error);
    throw error; // Re-throw to ensure calling code knows initialization failed
  }
  
  // If execution reaches here, all initialization attempts failed
  return false;
};

export default initializeUserData;