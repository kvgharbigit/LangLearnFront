#!/bin/bash
# Script to validate iOS build configuration without starting a build
# This won't use build credits or cost money

echo "Starting iOS build validation..."
echo "This will validate your configuration without starting an actual build"
echo "--------------------------------------------------------------------------------"

# Check if logged in to EAS
npx eas whoami || (echo "You need to log in first with: npx eas login" && exit 1)

# Check app.json schema
echo "Checking app.json schema..."
npx expo-doctor

# Validate the project
echo "Validating EAS configuration..."
npx eas build:configure --platform ios

# Check that credentials are properly set up
echo "Checking credentials..."
npx eas credentials --platform ios

echo "--------------------------------------------------------------------------------"
echo "Validation complete! Review any errors above before starting a real build."
echo "To start a real build in GitHub Actions, go to your GitHub repository's Actions tab."

# Keep terminal open until user presses a key
echo ""
echo "Press any key to exit..."
read -n 1 -s