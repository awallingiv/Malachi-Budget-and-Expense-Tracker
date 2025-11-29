import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Resolve the API base URL with several fallbacks so Expo clients
 * running on devices/emulators can talk to the local backend.
 */
const resolveApiBaseUrl = () => {
  const envOverride =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.API_BASE_URL;

  if (envOverride) {
    return envOverride.replace(/\/$/, '');
  }

  if (!__DEV__) {
    return 'https://budget.austinwalling.dev/api';
  }

  // Try to infer the LAN IP from Expo/Metro host
  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.expoConfig?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (expoHost) {
    const host = expoHost.split(':')[0];
    return `http://${host}:3002/api`;
  }

  // Fallback to the current browser host (useful for web builds)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3002/api`;
  }

  // Last resort
  return 'http://localhost:3002/api';
};

const API_BASE_URL = resolveApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    let token;
    try {
      token = await AsyncStorage.getItem('token');
    } catch (error) {
      // Fallback to localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('token');
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // Could redirect to login screen
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (usernameOrEmail, password) => {
    console.log('🌐 apiService.login() called');
    console.log('📤 Request details:');
    console.log('  - URL: /auth/login');
    console.log('  - Method: POST');
    console.log('  - Username/Email:', usernameOrEmail);
    console.log('  - Password: [HIDDEN - ' + password.length + ' characters]');
    
    try {
      const response = await api.post('/auth/login', {
        usernameOrEmail,
        password
      });
      console.log('📥 API Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      return response.data;
    } catch (error) {
      console.error('💥 API Request failed:');
      console.error('  - Error:', error.message);
      console.error('  - Response:', error.response?.data);
      console.error('  - Status:', error.response?.status);
      throw error;
    }
  },

  register: async (username, password, email, name) => {
    console.log('🔐 apiService.register() called');
    console.log('📤 Request details:');
    console.log('  - URL:', API_BASE_URL + '/auth/register');
    console.log('  - Method: POST');
    console.log('  - Username:', username);
    console.log('  - Email:', email);
    console.log('  - Name:', name);
    console.log('  - Password: [HIDDEN - ' + password.length + ' characters]');
    
    try {
      const response = await api.post('/auth/register', {
        username,
        password,
        email,
        name
      });
      console.log('📥 Register API Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      return response.data;
    } catch (error) {
      console.error('💥 Register API Request failed:');
      console.error('  - Error:', error.message);
      console.error('  - Response:', error.response?.data);
      console.error('  - Status:', error.response?.status);
      throw error;
    }
  },

  validateUser: async (usernameOrEmail, password, validationCode) => {
    const response = await api.post('/auth/validate', {
      usernameOrEmail,
      password,
      validationCode
    });
    return response.data;
  },

  // Verify email via link (email + code in query string)
  verifyEmailLink: async (email, code) => {
    const response = await api.get('/auth/verify-email-link', {
      params: { email, code },
    });
    return response.data;
  },

  forgotPassword: async (usernameOrEmail) => {
    const response = await api.post('/auth/forgot-password', {
      usernameOrEmail
    });
    return response.data;
  },

  // Reset password using email + code from link
  resetPasswordWithCode: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password-link', {
      email,
      code,
      newPassword,
    });
    return response.data;
  }
};

export const budgetService = {
  getDashboardStats: async (userId, startDate, endDate) => {
    const response = await api.get(`/budget/dashboard/${userId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  getUserCategories: async (userId) => {
    const response = await api.get(`/budget/categories/${userId}`);
    return response.data;
  },

  getRecentTransactions: async (userId, limit = 5) => {
    const response = await api.get(`/budget/transactions/${userId}`, {
      params: { limit }
    });
    return response.data;
  },

  getTransactions: async (userId, params = {}) => {
    const response = await api.get(`/budget/transactions/${userId}`, {
      params,
    });
    return response.data;
  },

  createTransaction: async (transactionData) => {
    const response = await api.post('/budget/transactions', transactionData);
    return response.data;
  },

  updateTransaction: async (transactionId, transactionData) => {
    const response = await api.put(`/budget/transactions/${transactionId}`, transactionData);
    return response.data;
  },

  deleteTransaction: async (transactionId, userId) => {
    try {
      const response = await api.delete(`/budget/transactions/${transactionId}`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      // If axios throws an error but we have response data, return it
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  getIncome: async (userId, startDate, endDate) => {
    const response = await api.get(`/budget/income/${userId}`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  createIncome: async (incomeData) => {
    const response = await api.post('/budget/income', incomeData);
    return response.data;
  },

  updateIncome: async (incomeId, incomeData) => {
    const response = await api.put(`/budget/income/${incomeId}`, incomeData);
    return response.data;
  },

  deleteIncome: async (incomeId, userId) => {
    try {
      const response = await api.delete(`/budget/income/${incomeId}`, {
        params: { userId }
      });
      return response.data;
    } catch (error) {
      // If axios throws an error but we have response data, return it
      if (error.response && error.response.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  // Category Windows Management
  getCategoryWindows: async (userId) => {
    const response = await api.get(`/budget/windows/${userId}`);
    return response.data;
  },

  createCategoryWindow: async (windowData) => {
    const response = await api.post('/budget/windows', windowData);
    return response.data;
  },

  updateCategoryWindow: async (windowId, windowData) => {
    const response = await api.put(`/budget/windows/${windowId}`, windowData);
    return response.data;
  },

  deleteCategoryWindow: async (windowId, userId) => {
    const response = await api.delete(`/budget/windows/${windowId}`, {
      data: { userId }
    });
    return response.data;
  },

  getWindowTransactions: async (userId, categoryName, params = {}) => {
    const response = await api.get(`/budget/windows/${userId}/transactions/${categoryName}`, {
      params
    });
    return response.data;
  },

  getTransactionsByCategory: async (userId, category) => {
    console.log('📡 getTransactionsByCategory called:', { userId, category });
    const response = await api.get(`/budget/transactions/${userId}`, {
      params: { category }
    });
    console.log('📡 Category response:', response.data);
    return response.data;
  },

  updateWindowPositions: async (userId, windowUpdates) => {
    const response = await api.post('/budget/windows/positions', {
      UserID: userId,
      WindowUpdates: windowUpdates
    });
    return response.data;
  },

  // Budgets (planned vs actual)
  getBudgets: async (userId, params = {}) => {
    const response = await api.get(`/budget/budgets/${userId}`, {
      params
    });
    return response.data;
  },

  upsertBudget: async (budgetData) => {
    const response = await api.post('/budget/budgets', budgetData);
    return response.data;
  },

  updateBudget: async (budgetId, budgetData) => {
    const response = await api.put(`/budget/budgets/${budgetId}`, budgetData);
    return response.data;
  },

  deleteBudget: async (budgetId, userId) => {
    const response = await api.delete(`/budget/budgets/${budgetId}`, {
      data: { userId }
    });
    return response.data;
  },

  // Recurring items (bills, subscriptions, recurring income)
  getRecurringItems: async (userId, params = {}) => {
    const response = await api.get(`/budget/recurring/${userId}`, {
      params,
    });
    return response.data;
  },

  createRecurringItem: async (data) => {
    const response = await api.post('/budget/recurring', data);
    return response.data;
  },

  updateRecurringItem: async (recurringId, data) => {
    const response = await api.put(`/budget/recurring/${recurringId}`, data);
    return response.data;
  },

  deleteRecurringItem: async (recurringId, userId) => {
    const response = await api.delete(`/budget/recurring/${recurringId}`, {
      data: { userId },
    });
    return response.data;
  },

  // Saved views for transactions
  getSavedViews: async (userId) => {
    const response = await api.get(`/budget/views/${userId}`);
    return response.data;
  },

  createSavedView: async (viewData) => {
    const response = await api.post('/budget/views', viewData);
    return response.data;
  },

  updateSavedView: async (viewId, viewData) => {
    const response = await api.put(`/budget/views/${viewId}`, viewData);
    return response.data;
  },

  deleteSavedView: async (viewId, userId) => {
    const response = await api.delete(`/budget/views/${viewId}`, {
      data: { userId },
    });
    return response.data;
  },

  // Category summary
  getCategorySummary: async (userId, params = {}) => {
    const response = await api.get(`/budget/category-summary/${userId}`, {
      params,
    });
    return response.data;
  },

  // Category trends
  getCategoryTrends: async (userId, params = {}) => {
    const response = await api.get(`/budget/category-trends/${userId}`, {
      params,
    });
    return response.data;
  }
};

export const categoryService = {
  // Get all table names/categories for a user
  getUserTables: async (userId) => {
    console.log('📊 Getting user tables for:', userId);
    const response = await api.get(`/category/tables/${userId}`);
    console.log('📊 User tables:', response.data);
    return response.data;
  },

  // Get category windows for a user
  getCategoryWindows: async (userId) => {
    console.log('🪟 Getting category windows for:', userId);
    const response = await api.get(`/category/windows/${userId}`);
    console.log('🪟 Category windows:', response.data);
    return response.data;
  },

  // Create a new category window
  createCategoryWindow: async (windowData) => {
    console.log('🏗️ Creating category window:', windowData);
    const response = await api.post('/category/windows', windowData);
    console.log('🏗️ Window created:', response.data);
    return response.data;
  },

  // Update category window (position, size, etc.)
  updateCategoryWindow: async (windowId, updateData) => {
    console.log('🔄 Updating category window:', windowId, updateData);
    const response = await api.put(`/category/windows/${windowId}`, updateData);
    console.log('🔄 Window updated:', response.data);
    return response.data;
  },

  // Delete category window
  deleteCategoryWindow: async (windowId, userId) => {
    console.log('🗑️ Deleting category window:', windowId);
    const response = await api.delete(`/category/windows/${windowId}`, {
      data: { userId }
    });
    console.log('🗑️ Window deleted:', response.data);
    return response.data;
  }
};

export default api;