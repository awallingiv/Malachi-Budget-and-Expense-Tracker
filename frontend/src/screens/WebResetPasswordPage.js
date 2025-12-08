import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput as RNTextInput, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { authService } from '../services/apiService';

// Modern color palette matching the login screen
const colors = {
  background: '#0a0f1a',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#00d4aa',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDim: 'rgba(255, 255, 255, 0.4)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputFocus: '#00d4aa',
  error: '#ff6b6b',
  success: '#00d4aa',
};

const WebResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || '';
    const codeParam = params.get('code') || '';
    setEmail(emailParam);
    setCode(codeParam);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    if (!email || !code) {
      setStatus('error');
      setMessage('Reset link is missing required information.');
      return;
    }
    if (!newPassword || newPassword.length < 8 || newPassword.length > 16) {
      setStatus('error');
      setMessage('Password must be between 8 and 16 characters.');
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
        setMessage('Password reset successful! Redirecting to login...');
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/?passwordReset=true';
          }
        }, 2000);
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

  const renderInput = (placeholder, value, onChangeText, field, secureTextEntry = false) => (
    <View style={[
      styles.inputContainer,
      focusedInput === field && styles.inputContainerFocused
    ]}>
      <RNTextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocusedInput(field)}
        onBlur={() => setFocusedInput(null)}
        maxLength={16}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background effects */}
      <View style={styles.backgroundGradient} />
      <View style={styles.backgroundOrb1} />
      <View style={styles.backgroundOrb2} />
      <View style={styles.backgroundOrb3} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💰</Text>
          </View>
          <Text style={styles.logoText}>ReactBudget</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reset Password</Text>
          <Text style={styles.cardSubtitle}>Enter a new password for your account</Text>

          {renderInput('New Password', newPassword, setNewPassword, 'newPassword', true)}
          {renderInput('Confirm Password', confirmPassword, setConfirmPassword, 'confirmPassword', true)}

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

          <TouchableOpacity
            style={[styles.primaryButton, status === 'submitting' && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={status === 'submitting'}
          >
            <Text style={styles.primaryButtonText}>
              {status === 'submitting' ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={goToHome}>
            <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  backgroundOrb1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    opacity: 0.5,
  },
  backgroundOrb2: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    opacity: 0.5,
  },
  backgroundOrb3: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
    opacity: 0.5,
    marginLeft: -100,
    marginTop: -100,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    padding: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    marginBottom: 16,
  },
  inputContainerFocused: {
    borderColor: colors.inputFocus,
    backgroundColor: 'rgba(0, 212, 170, 0.05)',
  },
  input: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: 'transparent',
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    color: colors.success,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  errorText: {
    color: colors.error,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WebResetPasswordPage;


