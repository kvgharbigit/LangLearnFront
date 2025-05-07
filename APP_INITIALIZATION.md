# App Initialization Guide

This guide explains how to properly initialize the app to ensure authentication and other services work correctly from startup.

## The Issue

If you're seeing logs like:
```
LOG  User not initialized yet - call initializeUser() during app startup
```

This indicates that the app is trying to access user data before proper initialization.

## Solution

### 1. Import the App Initializer in App.tsx

At the top of your `App.tsx` (or equivalent main app component):

```typescript
import { initializeApp } from './src/utils/appInitializer';
```

### 2. Call the Initializer in useEffect

Add this to your main App component:

```typescript
useEffect(() => {
  // Initialize app on startup
  initializeApp()
    .then(() => console.log('App initialization complete'))
    .catch(err => console.error('App initialization failed:', err));
}, []);
```

### 3. Full Example

```typescript
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { initializeApp } from './src/utils/appInitializer';
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  useEffect(() => {
    // Initialize app on startup
    initializeApp()
      .then(() => console.log('App initialization complete'))
      .catch(err => console.error('App initialization failed:', err));
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

## What the Initializer Does

The `initializeApp()` function:

1. Sets up Supabase authentication listeners
2. Initializes the user from existing sessions
3. Configures any needed environment-specific behavior
4. Logs initialization details for debugging

## Verification

After implementing this, you should:

1. No longer see "User not initialized yet" errors
2. See proper authentication state in logs
3. See "✅ App initialized with user" in logs when signed in

## Additional Considerations

### For Splash Screens

If you're using a splash screen, you may want to hide it after initialization:

```typescript
useEffect(() => {
  const init = async () => {
    await initializeApp();
    // Hide splash screen
    SplashScreen.hideAsync();
  };
  
  init();
}, []);
```

### For Deep Links

If you need to handle deep links, make sure initialization completes first:

```typescript
useEffect(() => {
  let isMounted = true;
  
  const handleDeepLinks = async () => {
    // Wait for initialization first
    await initializeApp();
    
    if (isMounted) {
      // Now set up deep link handlers
      // ...
    }
  };
  
  handleDeepLinks();
  
  return () => {
    isMounted = false;
  };
}, []);
```