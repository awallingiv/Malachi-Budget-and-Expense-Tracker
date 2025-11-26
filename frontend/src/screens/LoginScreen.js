import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Modern color palette matching the dashboard
const colors = {
  background: '#0a0f1a',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#00d4aa',
  secondary: '#667eea',
  accent: '#764ba2',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDim: 'rgba(255, 255, 255, 0.4)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputFocus: '#00d4aa',
  error: '#ff6b6b',
};

export default function LoginScreen({ navigation }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const { login, register } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!usernameOrEmail || !password) {
      Alert.alert('Missing Information', 'Please enter both username/email and password');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(usernameOrEmail, password);
      setIsLoading(false);

      if (!result.success) {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleRegister = async () => {
    const { username, email, password, confirmPassword, name } = registerData;
    
    if (!username || !email || !password || !name) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await register(username, password, email, name);
      setIsLoading(false);

      if (result.success) {
        Alert.alert('Success', 'Account created! Please check your email for validation code.', [
          { text: 'OK', onPress: () => setShowRegister(false) }
        ]);
      } else {
        Alert.alert('Registration Failed', result.message || 'Could not create account');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const renderInput = (placeholder, value, onChangeText, field, options = {}) => (
    <View style={[
      styles.inputContainer,
      focusedInput === field && styles.inputContainerFocused
    ]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={options.secureTextEntry}
        autoCapitalize={options.autoCapitalize || 'none'}
        autoCorrect={false}
        keyboardType={options.keyboardType || 'default'}
        onFocus={() => setFocusedInput(field)}
        onBlur={() => setFocusedInput(null)}
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

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.logoText}>ReactBudget</Text>
            <Text style={styles.logoSubtext}>Take control of your finances</Text>
          </Animated.View>

          {/* Card */}
          <View style={styles.card}>
            {!showRegister ? (
              <>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSubtitle}>Sign in to continue</Text>

                {renderInput('Username or Email', usernameOrEmail, setUsernameOrEmail, 'username')}
                {renderInput('Password', password, setPassword, 'password', { secureTextEntry: true })}

                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => setShowRegister(true)}
                >
                  <Text style={styles.secondaryButtonText}>Create Account</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Create Account</Text>
                <Text style={styles.cardSubtitle}>Start your financial journey</Text>

                {renderInput('Full Name', registerData.name, (text) => setRegisterData(prev => ({ ...prev, name: text })), 'name', { autoCapitalize: 'words' })}
                {renderInput('Username', registerData.username, (text) => setRegisterData(prev => ({ ...prev, username: text })), 'regUsername')}
                {renderInput('Email', registerData.email, (text) => setRegisterData(prev => ({ ...prev, email: text })), 'email', { keyboardType: 'email-address' })}
                {renderInput('Password', registerData.password, (text) => setRegisterData(prev => ({ ...prev, password: text })), 'regPassword', { secureTextEntry: true })}
                {renderInput('Confirm Password', registerData.confirmPassword, (text) => setRegisterData(prev => ({ ...prev, confirmPassword: text })), 'confirmPassword', { secureTextEntry: true })}

                <TouchableOpacity 
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setShowRegister(false)}
                >
                  <Text style={styles.backButtonText}>← Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Secure • Private • Your Data
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

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
    height: screenHeight * 0.5,
    background: Platform.OS === 'web' 
      ? 'linear-gradient(180deg, rgba(102, 126, 234, 0.15) 0%, transparent 100%)'
      : undefined,
    backgroundColor: Platform.OS !== 'web' ? 'rgba(102, 126, 234, 0.1)' : undefined,
  },
  backgroundOrb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  backgroundOrb2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.secondary,
    opacity: 0.05,
  },
  backgroundOrb3: {
    position: 'absolute',
    top: '40%',
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.06,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    maxWidth: 450,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
  },
  logoEmoji: {
    fontSize: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined,
  },
  logoSubtext: {
    fontSize: 16,
    color: colors.textMuted,
  },
  card: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } : {}),
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 16,
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: colors.inputFocus,
    backgroundColor: 'rgba(0, 212, 170, 0.05)',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    fontFamily: Platform.OS === 'web' ? 'system-ui, -apple-system, sans-serif' : undefined,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 14px rgba(0, 212, 170, 0.4)',
    } : {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 8,
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.inputBorder,
  },
  dividerText: {
    color: colors.textDim,
    paddingHorizontal: 16,
    fontSize: 14,
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
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footer: {
    marginTop: 32,
    color: colors.textDim,
    fontSize: 12,
  },
});
