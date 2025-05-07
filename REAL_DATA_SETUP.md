# Real Data Setup for Development

This guide explains how to configure the LangLearnFront application to use real Supabase data in development environments, with special considerations for RevenueCat functionality.

## Overview

By default, the application is now configured to use **real data** from Supabase in development mode, which matches the behavior in production. This ensures consistent behavior and proper testing of authentication and usage tracking.

### Special Note on RevenueCat

**Important:** RevenueCat functionality will always use mock data in development mode due to SDK limitations. This is intended behavior and cannot be changed. Only authentication and usage data will use real Supabase data in development.

## Configuration

The application's data mode is controlled by the `dataMode.ts` utility file:

```typescript
// src/utils/dataMode.ts
// Set this to true to force mock data, false to use real data
const USE_MOCK_DATA = false;
```

### Available Modes

You can easily toggle between real and mock data by changing the `USE_MOCK_DATA` constant:

1. **Real Data Mode** (`USE_MOCK_DATA = false`)
   - Uses actual Supabase authentication and data
   - Connects to the real backend API
   - Provides a production-like experience in development
   - **This is the default and recommended setting**

2. **Mock Data Mode** (`USE_MOCK_DATA = true`)
   - Uses mock users, subscriptions, and usage data
   - No actual backend connectivity required
   - Useful for UI development or when backend services are unavailable

## Setting Up Real Data Development

To ensure your development environment uses real Supabase data:

1. **Verify Configuration**
   - Check that `USE_MOCK_DATA = false` in `src/utils/dataMode.ts`

2. **Set Up Supabase**
   - Ensure your Supabase project is set up correctly
   - Verify your project URL and API keys are correctly configured in `src/supabase/config.ts`

3. **Start the Backend Server**
   - Make sure your backend server is running
   - Update the API_URL in `src/services/supabaseUsageService.ts` if needed

4. **Create a Test User**
   - Sign up for a new account or use an existing one
   - Real authentication data will be used

## API Endpoints

When using real data, the application will connect to these backend endpoints:

- `/user/subscription` - Get subscription details
- `/user/usage` - Get usage statistics
- `/verify-subscription` - Verify active subscription
- Other API endpoints as needed

## Monitoring Real Data Usage

When the application is using real data, you'll see log messages like:

```
[AuthService] Using real data from Supabase
[UsageService] Using real data from Supabase
[SubscriptionService] Using real data from Supabase
```

If you see messages about mock data, it means you're still using mock data:

```
⚠️ Using mock subscription packages
⚠️ Using mock premium subscription
⚠️ Returning mock usage data
```

## Testing Both Modes

For comprehensive testing, it's recommended to test your features in both modes:

1. **Real Data Testing** (`USE_MOCK_DATA = false`)
   - Verifies connectivity with backend services
   - Tests actual authentication flows
   - Validates subscription and usage tracking

2. **Mock Data Testing** (`USE_MOCK_DATA = true`)
   - Tests UI behavior with predictable data
   - Verifies edge cases with mock data
   - Allows development without backend connectivity

## Implementing New Features

When adding new features:

1. Always implement both real and mock data paths
2. Ensure mock data closely mimics the real data structure
3. Use the `shouldUseMockData()` function to determine which path to use
4. Add appropriate logging with `logDataSource()`

## Troubleshooting

If you encounter issues with real data in development:

1. **Authentication Problems**
   - Check that you're properly signed in to Supabase
   - Verify your Supabase configuration is correct

2. **Backend Connectivity**
   - Ensure the backend server is running
   - Check that API_URL is correctly configured

3. **Mock Data Appearing**
   - Verify `USE_MOCK_DATA = false` in `dataMode.ts`
   - Check for fallback logic that might be triggering 

4. **Reset Your Environment**
   - Clear local storage and restart the application
   - Re-authenticate to get fresh tokens