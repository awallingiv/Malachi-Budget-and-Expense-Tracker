import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Card } from 'react-native-paper';
import { authService } from '../services/apiService';

const WebVerifyEmailPage = () => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  console.log('🔗 WebVerifyEmailPage component mounted');

  useEffect(() => {
    console.log('🔗 WebVerifyEmailPage useEffect running');
    
    const run = async () => {
      console.log('🔗 WebVerifyEmailPage run() called');
      
      if (typeof window === 'undefined') {
        console.log('❌ Window is undefined');
        setStatus('error');
        setMessage('This verification link can only be used in a browser.');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const code = params.get('code');

      console.log('🔗 Verification params:', { email, code });

      if (!email || !code) {
        console.log('❌ Missing email or code');
        setStatus('error');
        setMessage('Verification link is missing required information.');
        return;
      }

      try {
        console.log('🔗 Calling authService.verifyEmailLink...');
        const result = await authService.verifyEmailLink(email, code);
        console.log('🔗 Verification result:', result);
        
        if (result.Success) {
          setStatus('success');
          setMessage(result.Message || 'Email verified successfully. You can now log in.');
        } else {
          setStatus('error');
          setMessage(result.Message || 'Verification failed. The link may be invalid or expired.');
        }
      } catch (error) {
        console.error('❌ Verify email (web) error:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.Message ||
            error.message ||
            'An error occurred while verifying your email.'
        );
      }
    };

    run();
  }, []);

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
            Email Verification
          </Text>

          {status === 'loading' && (
            <View style={styles.centerContent}>
              <ActivityIndicator />
              <Text style={styles.message}>Verifying your email, please wait...</Text>
            </View>
          )}

          {status !== 'loading' && (
            <>
              <Text
                style={[
                  styles.message,
                  status === 'success' ? styles.successText : styles.errorText,
                ]}
              >
                {message}
              </Text>
              <Button mode="contained" onPress={goToHome} style={styles.button}>
                Go to App
              </Button>
            </>
          )}
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
  centerContent: {
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  successText: {
    color: '#2e7d32',
  },
  errorText: {
    color: '#c62828',
  },
  button: {
    marginTop: 8,
  },
});

export default WebVerifyEmailPage;


