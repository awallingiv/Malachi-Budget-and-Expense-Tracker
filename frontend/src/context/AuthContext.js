import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    try {
      const response = await authService.login(usernameOrEmail, password);
      if (response.Success) {
        const userData = {
          UserId: response.UserId,
          Username: response.Username,
          Name: response.Name,
          Email: response.Email
        };
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('token', response.token);
        setUser(userData);
        return { success: true, message: response.Message };
      } else {
        return { success: false, message: response.Message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
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
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
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