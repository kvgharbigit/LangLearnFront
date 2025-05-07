# User Data Initialization Guide

This guide explains how user data is initialized when a new account is created.

## Frontend Implementation

When a user creates a new account, their data needs to be initialized in both:
1. Supabase Authentication (automatic)
2. Your custom database tables (handled by our code)

The initialization process occurs in two places:

1. **RegisterScreen.tsx**: After successful registration
   ```typescript
   // Initialize user data in the backend
   if (user) {
     console.log('Initializing user data after registration...');
     initializeUserData(user.id).catch(err => {
       console.error('Error initializing user data after registration:', err);
     });
   }
   ```

2. **LoginScreen.tsx**: After successful login
   ```typescript
   // Success - initialize user data in backend
   if (user) {
     console.log('Login successful, initializing user data...');
     initializeUserData(user.id).catch(err => {
       console.error('Error initializing user data after login:', err);
     });
   }
   ```

## Backend API

The backend has a new endpoint to handle user data initialization:

```
POST /user/initialize-user
```

This endpoint is used when users register but haven't confirmed their email yet. It creates:
- An entry in the `users` table with default subscription values
- An entry in the `usage` table with default usage tracking

## Configuration

The backend URL is configured in `src/utils/initializeUserData.ts`. 

**IMPORTANT**: You need to update this URL to match your actual backend server:
```typescript
// Define the base URL of your backend
const backendUrl = 'http://localhost:8080';  // Change this to your actual backend URL
```

Make sure to update this URL to point to your actual backend server.

## Troubleshooting

If user data isn't being initialized:

1. Check the console logs for network errors or backend connection issues
2. Verify the backend is running and accessible
3. Check the Supabase dashboard to see if the auth user was created
4. Examine the backend logs for any errors during initialization
5. Verify the backend URL is correctly set in the code

## Manual Initialization

If needed, you can manually initialize a user by:

1. Logging in to Supabase dashboard
2. Copying the user ID from the Authentication section
3. Running SQL to insert records into users and usage tables:

```sql
INSERT INTO users (user_id, subscription_tier, subscription_start, billing_cycle_start, billing_cycle_end)
VALUES ('user-id-here', 'free', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW() + INTERVAL '30 days') * 1000);

-- Then run the appropriate SQL to insert a usage record
```