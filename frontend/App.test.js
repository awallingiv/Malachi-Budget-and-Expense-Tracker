import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#000' 
    }}>
      <Text style={{ color: '#fff', fontSize: 20 }}>
        ReactBudget Test - If you see this, React Native is working!
      </Text>
    </View>
  );
}