import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, SafeAreaView } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import WebDashboard from './src/components/WebDashboard';
import DashboardScreen from './src/screens/DashboardScreenNew';

const App = () => {
  console.log('App starting, platform:', Platform.OS);
  
  try {
    return (
      <PaperProvider>
        <SafeAreaView style={{ flex: 1 }}>
          {Platform.OS === 'web' ? (
            <WebDashboard />
          ) : (
            <DashboardScreen />
          )}
          <StatusBar style="auto" />
        </SafeAreaView>
      </PaperProvider>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <PaperProvider>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
          <Text style={{ color: 'white', fontSize: 18 }}>
            App Error: {error.message}
          </Text>
        </SafeAreaView>
      </PaperProvider>
    );
  }
};

export default App;