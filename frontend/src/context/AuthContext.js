import React, { createContext, useState, useContext, useEffect } from 'react';
import storage from '../utils/storage';
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
    try {
      const response = await authService.login(usernameOrEmail, password);
      if (response.Success) {
        const userData = {
          UserId: response.UserId,
          Username: response.Username,
          Name: response.Name,
          Email: response.Email
        };
        await storage.setItem('user', JSON.stringify(userData));
        await storage.setItem('token', response.token);
        setUser(userData);
        return { success: true, message: response.Message };
      } else {
        return { success: false, message: response.Message };
      }
    } catch (error) {
      console.error('💥 Error during login API call:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });

      // Prefer backend-provided message (e.g., invalid credentials, not validated)
      const backendMessage =
        error.response?.data?.Message ||
        error.response?.data?.message ||
        error.response?.data?.error;

      const friendlyMessage =
        backendMessage ||
        (error.response?.status === 401
          ? 'Invalid username/email or password.'
          : error.response?.status
          ? `Login failed with status ${error.response.status}. Please try again.`
          : 'Network error. Please check your connection and try again.');

      return { success: false, message: friendlyMessage };
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
      console.error('💥 Registration error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });

      // Prefer backend-provided message when available (e.g., username/email already exists)
      const backendMessage =
        error.response?.data?.Message ||
        error.response?.data?.message ||
        error.response?.data?.error;

      const friendlyMessage =
        backendMessage ||
        (error.response?.status
          ? `Registration failed with status ${error.response.status}. Please try again.`
          : 'Network error. Please try again.');

      return { success: false, message: friendlyMessage };
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

  const forgotPassword = async (usernameOrEmail) => {
    try {
      const response = await authService.forgotPassword(usernameOrEmail);
      if (response.Success) {
        return { success: true, message: response.Message };
      } else {
        return { success: false, message: response.Message };
      }
    } catch (error) {
      console.error('Forgot password error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      });

      const backendMessage =
        error.response?.data?.Message ||
        error.response?.data?.message ||
        error.response?.data?.error;

      const friendlyMessage =
        backendMessage ||
        (error.response?.status
          ? `Password reset failed with status ${error.response.status}. Please try again.`
          : 'Network error. Please try again.');

      return { success: false, message: friendlyMessage };
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
    forgotPassword,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};