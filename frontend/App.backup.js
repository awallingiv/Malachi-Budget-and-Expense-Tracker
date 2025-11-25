import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

function AppContent() {
  const { user, isLoading } = useAuth();
  const { theme, isDark, paperTheme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Add loading spinner here if needed */}
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: theme.primary,
            background: theme.background,
            card: theme.surface,
            text: theme.text,
            border: theme.border,
            notification: theme.accent,
          },
        }}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {user ? <MainNavigator /> : <AuthNavigator />}
          <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.background} />
        </View>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}