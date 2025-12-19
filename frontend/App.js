import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, SafeAreaView } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import ModernDashboard from './src/components/ModernDashboard';
import MobileNavigator from './src/navigation/MobileNavigator';
import LoginScreen from './src/screens/LoginScreen';
import WebVerifyEmailPage from './src/screens/WebVerifyEmailPage';
import WebResetPasswordPage from './src/screens/WebResetPasswordPage';

function AppContent() {
  const { isDark, syncWithBackend } = useTheme();
  const hasSyncedRef = useRef(false);
  const authContext = useAuth();
  const user = authContext?.user;
  const isLoading = authContext?.isLoading;

  // Sync theme preferences from backend when user logs in
  useEffect(() => {
    if (user?.UserId && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncWithBackend(user.UserId);
    }
    // Reset sync flag when user logs out
    if (!user) {
      hasSyncedRef.current = false;
    }
  }, [user?.UserId, syncWithBackend]);

  if (!authContext) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0f1a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18 }}>Auth Context Error</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0f1a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: isDark ? 'white' : '#333', fontSize: 28, fontWeight: '700' }}>Malachi: Budget, Expense, and Tithe Tracking</Text>
        <Text style={{ color: '#666', fontSize: 14, marginTop: 10 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Platform-specific rendering
  if (Platform.OS === 'web') {
    // Handle special web-only routes for email verification and password reset
    const path =
      typeof window !== 'undefined' && window.location && window.location.pathname
        ? window.location.pathname
        : '/';

    if (path.startsWith('/verify-email')) {
      return <WebVerifyEmailPage />;
    }

    if (path.startsWith('/reset-password')) {
      return <WebResetPasswordPage />;
    }

    // If not logged in, show login screen
    if (!user) {
      return <LoginScreen />;
    }

    // Default web dashboard
    return <ModernDashboard />;
  }

  // Native (mobile) flow
  if (!user) {
    return <LoginScreen />;
  }

  return <MobileNavigator />;
}

const App = () => {
  return (
    <ThemeProvider>
      <PaperProvider>
        <AuthProvider>
          <AppContent />
          <StatusBar style="auto" />
        </AuthProvider>
      </PaperProvider>
    </ThemeProvider>
  );
};

export default App;
