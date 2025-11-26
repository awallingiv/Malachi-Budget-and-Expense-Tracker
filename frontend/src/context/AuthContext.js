import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web fallback for AsyncStorage
const storage = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      // Fallback to localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      return await AsyncStorage.setItem(key, value);
    } catch (error) {
      // Fallback to localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.setItem(key, value);
      }
      throw error;
    }
  },
  removeItem: async (key) => {
    try {
      return await AsyncStorage.removeItem(key);
    } catch (error) {
      // Fallback to localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.removeItem(key);
      }
      throw error;
    }
  }
};
import { authService } from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await storage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // Don't fail completely, just continue without user
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    console.log('🔑 AuthContext.login() called');
    console.log('🌐 API Configuration:');
    console.log('  - Base URL: http://localhost:3002/api');
    console.log('  - Endpoint: /auth/login');
    console.log('  - Full URL: http://localhost:3002/api/auth/login');
    
    try {
      console.log('📡 Making API call to authService.login...');
      const response = await authService.login(usernameOrEmail, password);
      console.log('📡 Raw API response received:', response);
      
      if (response.Success) {
        console.log('✅ API response indicates success');
        const userData = {
          UserId: response.UserId,
          Username: response.Username,
          Name: response.Name,
          Email: response.Email
        };
        console.log('💾 Storing user data in storage:', userData);
        await storage.setItem('user', JSON.stringify(userData));
        await storage.setItem('token', response.token);
        console.log('🔄 Setting user in context...');
        setUser(userData);
        console.log('✅ Login process completed successfully');
        return { success: true, message: response.Message };
      } else {
        console.log('❌ API response indicates failure:', response.Message);
        return { success: false, message: response.Message };
      }
    } catch (error) {
      console.error('💥 Error during login API call:');
      console.error('  - Error message:', error.message);
      console.error('  - Error code:', error.code);
      console.error('  - Error response:', error.response?.data);
      console.error('  - Error status:', error.response?.status);
      console.error('  - Full error object:', error);
      
      let errorMessage = 'Network error. ';
      if (error.code === 'ECONNREFUSED') {
        errorMessage += 'Backend server not responding on port 3002.';
      } else if (error.response?.status) {
        errorMessage += `Server responded with status ${error.response.status}.`;
      } else {
        errorMessage += 'Please check your connection.';
      }
      
      return { success: false, message: errorMessage };
    }
  };

  const register = async (username, password, email, name) => {
    try {
      const response = await authService.register(username, password, email, name);
      if (response.Success) {
        return { 
          success: true, 
          message: response.Message,
          userId: response.UserId,
          validationCode: response.ValidationCode
        };
      } else {
        return { success: false, message: response.Message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const validateUser = async (usernameOrEmail, password, validationCode) => {
    try {
      const response = await authService.validateUser(usernameOrEmail, password, validationCode);
      if (response.Success) {
        return { success: true, message: response.Message };
      } else {
        return { success: false, message: response.Message };
      }
    } catch (error) {
      console.error('Validation error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
    await storage.removeItem('user');
    await storage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    validateUser,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};