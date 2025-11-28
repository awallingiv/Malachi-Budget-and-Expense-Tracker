import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, SafeAreaView } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import ModernDashboard from './src/components/ModernDashboard';
import DashboardScreen from './src/screens/DashboardScreenNew';
import LoginScreen from './src/screens/LoginScreen';

function AppContent() {
  const { isDark } = useTheme();
  
  try {
    const authContext = useAuth();
    
    if (!authContext) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0f1a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'red', fontSize: 18 }}>Auth Context Error</Text>
        </SafeAreaView>
      );
    }
    
    const { user, isLoading } = authContext;
    
    if (isLoading) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0a0f1a' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: isDark ? 'white' : '#333', fontSize: 28, fontWeight: '700' }}>ReactBudget</Text>
          <Text style={{ color: '#666', fontSize: 14, marginTop: 10 }}>Loading...</Text>
        </SafeAreaView>
      );
    }
    
    // If not logged in, show login screen
    if (!user) {
      return <LoginScreen />;
    }
    
    // Platform-specific rendering (desktop view deprecated; always use modern view on web)
    if (Platform.OS === 'web') {
      return <ModernDashboard />;
    } else {
      return <DashboardScreen />;
    }
  } catch (error) {
    console.error('❌ AppContent error:', error);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0f1a', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18 }}>Error: {error.message}</Text>
      </SafeAreaView>
    );
  }
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
