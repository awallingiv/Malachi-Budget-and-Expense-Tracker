import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function ValidationScreen({ route, navigation }) {
  const [validationCode, setValidationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { validateUser } = useAuth();
  
  const { usernameOrEmail, password } = route.params;

  const handleValidation = async () => {
    if (!validationCode) {
      Alert.alert('Error', 'Please enter the validation code');
      return;
    }

    setIsLoading(true);
    const result = await validateUser(usernameOrEmail, password, validationCode);
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        'Success', 
        'Your account has been validated! Please log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert('Validation Failed', result.message);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Verify Your Email
          </Text>
          
          <Text variant="bodyMedium" style={styles.instructions}>
            We've sent a validation code to your email address. 
            Please enter it below to activate your account.
          </Text>
          
          <Text variant="bodySmall" style={styles.note}>
            The validation code expires in 15 minutes.
          </Text>
          
          <TextInput
            label="Validation Code"
            value={validationCode}
            onChangeText={setValidationCode}
            mode="outlined"
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          
          <Button
            mode="contained"
            onPress={handleValidation}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
          >
            Verify Account
          </Button>
          
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
          >
            Back to Login
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#6200ee',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  note: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontStyle: 'italic',
  },
  input: {
    marginBottom: 20,
  },
  button: {
    marginBottom: 10,
  },
  linkButton: {
    marginTop: 10,
  },
});