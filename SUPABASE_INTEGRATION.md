# Supabase Integration Guide for Frontend

This guide explains how to set up and use the Supabase integration that has replaced Firebase for authentication and data storage.

## Overview

The frontend now uses Supabase instead of Firebase for:
1. User authentication (email/password and social logins)
2. User data storage
3. Usage tracking and subscription management

## Setup Instructions

### 1. Install Dependencies

First, install the required packages:

```bash
npm install @supabase/supabase-js react-native-url-polyfill
# or
yarn add @supabase/supabase-js react-native-url-polyfill
```

### 2. Initialize Supabase

The Supabase client has been set up in `src/supabase/config.ts`. Make sure the file exists and contains the correct project URL and API keys.

### 3. URL Polyfill

Supabase requires the URL polyfill for React Native. This is included in App.tsx with:

```javascript
import 'react-native-url-polyfill/auto';
```

## Authentication Methods

### Email/Password Authentication

```javascript
// Sign up
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'Test User'
    }
  }
});

// Sign in
const { user, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
const { error } = await supabase.auth.signOut();
```

### Social Authentication

```javascript
// Google sign-in
const { user, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

## Key Changes from Firebase

### 1. Authentication

- Firebase: `auth.currentUser.uid`
- Supabase: `user.id`

### 2. Auth State Changes

- Firebase: `onAuthStateChanged(auth, callback)`
- Supabase: `supabase.auth.onAuthStateChange((event, session) => {})`

### 3. Token Management

- Firebase: `user.getIdToken()`
- Supabase: `(await supabase.auth.getSession()).data.session?.access_token`

### 4. Database Access

- Firebase: Firestore collections
- Supabase: PostgreSQL tables via `supabase.from('table_name')`

## Data Schema

The Supabase database has the following tables:

1. `profiles` - User profile information
2. `usage` - User usage tracking
3. `subscriptions` - User subscription details

## Migrating Existing Users

If you have existing users in Firebase, you'll need to migrate them to Supabase:

1. Export user data from Firebase Authentication
2. Import users into Supabase Auth
3. Migrate user data from Firestore to Supabase PostgreSQL tables

## Troubleshooting

### Authentication Issues

- If login fails, check that the Supabase URL and API keys are correct
- Ensure URL polyfill is imported properly
- Check network connectivity

### Data Access Issues

- Verify that database tables exist in the Supabase project
- Check SQL permissions in Supabase for the anonymous and authenticated roles
- Ensure the token is being passed correctly in API calls

## Testing the Integration

Run the following command to test the integration:

```bash
npx expo start --go
```

Try the following functions:
- User registration
- User login
- Social authentication
- Profile updates
- Subscription management

---

For more help with Supabase, refer to the [official documentation](https://supabase.com/docs).