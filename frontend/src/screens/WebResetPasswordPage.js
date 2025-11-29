import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { authService } from '../services/apiService';

const WebResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || '';
    const codeParam = params.get('code') || '';
    setEmail(emailParam);
    setCode(codeParam);
  }, []);

  const handleSubmit = async () => {
    if (!email || !code) {
      setStatus('error');
      setMessage('Reset link is missing required information.');
      return;
    }
    if (!newPassword || newPassword.length > 16) {
      setStatus('error');
      setMessage('Password must be between 1 and 16 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    try {
      setStatus('submitting');
      setMessage('');
      const result = await authService.resetPasswordWithCode(email, code, newPassword);
      if (result.Success) {
        setStatus('success');
        setMessage(result.Message || 'Your password has been reset. You can now log in.');
      } else {
        setStatus('error');
        setMessage(result.Message || 'Failed to reset password. The link may be invalid or expired.');
      }
    } catch (error) {
      console.error('Reset password (web) error:', error);
      setStatus('error');
      setMessage(
        error.response?.data?.Message ||
          error.message ||
          'An error occurred while resetting your password.'
      );
    }
  };

  const goToHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Reset Password
          </Text>

          <Text style={styles.instructions}>
            Enter a new password for your ReactBudget account.
          </Text>

          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            maxLength={16}
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            maxLength={16}
          />

          {message ? (
            <Text
              style={[
                styles.message,
                status === 'success' ? styles.successText : styles.errorText,
              ]}
            >
              {message}
            </Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={status === 'submitting'}
            disabled={status === 'submitting'}
            style={styles.button}
          >
            Update Password
          </Button>

          <Button mode="text" onPress={goToHome} style={styles.linkButton}>
            Back to App
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 20,
    maxWidth: 500,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#444',
  },
  input: {
    marginBottom: 12,
  },
  message: {
    textAlign: 'center',
    marginVertical: 12,
  },
  successText: {
    color: '#2e7d32',
  },
  errorText: {
    color: '#c62828',
  },
  button: {
    marginTop: 8,
    marginBottom: 8,
  },
  linkButton: {
    marginTop: 4,
  },
});

export default WebResetPasswordPage;


