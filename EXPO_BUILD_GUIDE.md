# Expo EAS Build Guide

## Prerequisites
```bash
npm install -g eas-cli
eas login
```

## Build Commands

### iOS Builds
```bash
# Production build for App Store
eas build --platform ios --profile production

# Preview build for TestFlight
eas build --platform ios --profile preview

# Development build with dev client
eas build --platform ios --profile development
```

### Android Builds
```bash
# Production build for Google Play
eas build --platform android --profile production

# Preview APK for testing
eas build --platform android --profile preview

# Development build with dev client
eas build --platform android --profile development
```

### Build Both Platforms
```bash
# Production builds for both iOS and Android
eas build --platform all --profile production

# Preview builds for both platforms
eas build --platform all --profile preview
```

## Submit to Stores

### Submit iOS to App Store
```bash
eas submit --platform ios
```

### Submit Android to Google Play
```bash
eas submit --platform android
```

## Check Build Status
```bash
# View build history and status
eas build:list

# View specific build details
eas build:view [BUILD_ID]
```

## Update Over-the-Air (OTA)
```bash
# Publish JS bundle update without rebuilding
eas update --branch production --message "Bug fixes"
```

## Configuration Files
- `eas.json` - Build profiles and environment variables
- `app.config.js` - App configuration and API URL
- All profiles configured with: `API_URL=https://budget.austinwalling.dev/api`

## Notes
- Production builds automatically increment version numbers
- API URL is set to production for all build profiles
- Development profile includes dev client for debugging
- Preview builds are for internal testing (not store submission)
