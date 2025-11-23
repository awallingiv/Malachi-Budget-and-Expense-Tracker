# ReactBudget Frontend

React Native mobile and web application for personal finance management.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Expo CLI (if not already installed)**
   ```bash
   npm install -g @expo/cli
   ```

3. **Add Required Assets**
   - Add app icons and splash screens to `/assets/` directory
   - See `/assets/README.md` for requirements

## Development

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator  
npm run android

# Run on web
npm run web
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
│   └── AuthContext.js  # Authentication state management
├── navigation/         # Navigation configuration
│   └── AuthNavigator.js # Authentication flow navigation
├── screens/           # App screens
│   ├── auth/         # Authentication screens
│   └── main/         # Main app screens
└── services/         # API and external services
    └── apiService.js # Backend API integration
```

## Key Features

### Authentication Flow
- User registration with email validation
- Login with username or email
- JWT token-based authentication
- Account validation via email codes

### Budget Management
- Dashboard with financial overview
- Transaction tracking and categorization
- Income management with tithe tracking
- Monthly statistics and savings rate

### Cross-Platform Support
- **iOS**: Native iOS app via Expo
- **Android**: Native Android app via Expo  
- **Web**: Progressive web app via Expo Web

## Backend Integration

The frontend connects to the Node.js backend API:
- Base URL configured in `src/services/apiService.js`
- Automatic token management via AuthContext
- Error handling and offline support

## Configuration

### API Base URL
Update the API base URL in `src/services/apiService.js`:
```javascript
const API_BASE_URL = 'http://your-backend-url:3001/api';
```

### App Configuration
Modify `app.json` for:
- App name and description
- Bundle identifiers
- Permissions and capabilities
- Build configurations

## Deployment

### Mobile Apps
```bash
# Build for app stores
expo build:ios
expo build:android
```

### Web App
```bash
# Build for web deployment
expo build:web
```

## Assets Requirements

Before deployment, ensure these assets exist in `/assets/`:
- `icon.png` - App icon (1024x1024)
- `splash.png` - Splash screen
- `adaptive-icon.png` - Android adaptive icon
- `favicon.png` - Web favicon