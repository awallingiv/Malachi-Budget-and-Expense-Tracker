import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enableTitheTracking, setEnableTitheTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    console.log('🚀 handleRegister() called');
    console.log('📝 Form values:', { username, email, name, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });
    
    if (!username || !email || !password || !confirmPassword) {
      console.log('❌ Validation failed: missing required fields');
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('❌ Validation failed: passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8 || password.length > 16) {
      console.log('❌ Validation failed: password must be 8-16 characters');
      Alert.alert('Error', 'Password must be between 8 and 16 characters');
      return;
    }

    console.log('✅ Validation passed, calling register()...');
    setIsLoading(true);
    
    try {
      const result = await register(username, password, email, name, enableTitheTracking);
      console.log('📥 Register result:', result);
      setIsLoading(false);

      if (result.success) {
        console.log('✅ Registration successful, navigating to Validation screen');
        navigation.navigate('Validation', {
          usernameOrEmail: username,
          password: password,
          validationCode: result.validationCode
        });
      } else {
        console.log('❌ Registration failed:', result.message);
        Alert.alert('Registration Failed', result.message);
      }
    } catch (error) {
      console.error('💥 Unexpected error in handleRegister:', error);
      setIsLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              Create Malachi Account
            </Text>
            
            <TextInput
              label="Username *"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={17}
            />
            
            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              maxLength={45}
            />
            
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              maxLength={25}
            />
            
            <TextInput
              label="Password *"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              maxLength={16}
            />
            
            <TextInput
              label="Confirm Password *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              maxLength={16}
            />
            
            <Text variant="bodySmall" style={styles.note}>
              * Required fields. Password limited to 16 characters.
            </Text>

            {/* Tithe Tracking Opt-In */}
            <TouchableOpacity
              style={styles.titheOptIn}
              onPress={() => setEnableTitheTracking(!enableTitheTracking)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, enableTitheTracking && styles.checkboxChecked]}>
                {enableTitheTracking && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.titheOptInText}>
                <Text variant="bodyMedium" style={styles.titheOptInTitle}>
                  Track charitable giving
                </Text>
                <Text variant="bodySmall" style={styles.titheOptInDesc}>
                  Automatically calculate a percentage of your income and track it as an expense. You can change this anytime in Settings.
                </Text>
              </View>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              Create Account
            </Button>
            
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.linkButton}
            >
              Already have an account? Sign In
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#6200ee',
  },
  input: {
    marginBottom: 15,
  },
  note: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
  },
  linkButton: {
    marginTop: 10,
  },
  titheOptIn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0f0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6200ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#6200ee',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  titheOptInText: {
    flex: 1,
  },
  titheOptInTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  titheOptInDesc: {
    color: '#666',
    lineHeight: 18,
  },
});