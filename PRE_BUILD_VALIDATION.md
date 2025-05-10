# Pre-Build Validation Steps

Use these steps to validate your iOS build configuration before starting a real build (which would use build credits).

## Step 1: Validate Configuration Locally

Run the validation script:
```
cd C:\Users\kvgha\PycharmProjects\LangLearnFront
./validate-ios-build.sh
```

Or run these commands manually:

```
# Check your EAS login status
npx eas whoami

# Validate app.json and dependencies
npx expo-doctor

# Check EAS configuration
npx eas build:configure --platform ios

# Check credentials
npx eas credentials --platform ios
```

## Step 2: Fix Any Errors

If any errors are found:
1. Fix the issues in your configuration files
2. Run the validation again
3. Repeat until all checks pass

## Step 3: Preview the Build Process Without Building

You can use:
```
npx eas build --platform ios --profile production --clear
```

This command will perform all the build preparation steps, but stop before actually submitting the build. Use the `CTRL+C` command to cancel when it asks for confirmation.

## Step 4: Alternative Way to Check Configuration

If you want to see how EAS would prepare your project:
```
npx eas-cli build:prepare --platform ios --profile production
```

## Step 5: Proceed to GitHub Actions

Only after validating the configuration:
1. Commit and push your changes
2. Go to GitHub Actions and trigger the workflow

## Common Issues to Watch For:

1. Package version mismatches
2. Invalid app.json schema properties
3. Missing credentials
4. Invalid Expo configuration

Remember that each actual build (successful or failed) will use your build credits.