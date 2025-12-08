import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the API base URL with several fallbacks so Expo clients
 * running on devices/emulators can talk to the local backend.
 */
const resolveApiBaseUrl = () => {
  // Mobile-only: Use EAS-configured API URL from app.config.js extra (for EAS builds)
  if (Platform.OS !== 'web') {
    const easApiUrl = Constants.expoConfig?.extra?.apiUrl;
    console.log('📱 Mobile detected, EAS apiUrl:', easApiUrl);
    if (easApiUrl) {
      return easApiUrl.replace(/\/$/, '');
    }
  }

  const envOverride =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    process.env.API_BASE_URL;

  if (envOverride) {
    console.log('🔧 Using env override:', envOverride);
    return envOverride.replace(/\/$/, '');
  }

  // Production builds (non-dev) use the production URL
  if (!__DEV__) {
    console.log('🚀 Production mode detected');
    return 'https://budget.austinwalling.dev/api';
  }

  // Try to infer the LAN IP from Expo/Metro host (works for local development)
  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.expoConfig?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  console.log('🔍 Expo host info:', expoHost);

  if (expoHost) {
    const host = expoHost.split(':')[0];
    console.log('🏠 Using LAN IP from Expo:', host);
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
console.log('🌐 Final API Base URL:', API_BASE_URL);

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
      params: { page: 1, limit }
    });
    // Return just the data array for backward compatibility
    return response.data.data || response.data;
  },

  getTransactions: async (userId, params = {}) => {
    // Support both old and new API response formats
    // If page/limit are specified, expect paginated response
    // Otherwise, use default pagination (page 1, limit 50)
    const response = await api.get(`/budget/transactions/${userId}`, {
      params: {
        page: params.page || 1,
        limit: params.limit || 50,
        ...params
      },
    });
    return response.data; // Returns { data: [...], pagination: {...} }
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

  getIncome: async (userId, startDate, endDate, page = 1, limit = 50) => {
    const response = await api.get(`/budget/income/${userId}`, {
      params: { startDate, endDate, page, limit }
    });
    return response.data; // Returns { data: [...], pagination: {...} }
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
  },

  // Budget comparison (budgeted vs actual)
  getBudgetComparison: async (userId, params = {}) => {
    const response = await api.get(`/budget/comparison/${userId}`, {
      params,
    });
    return response.data;
  },

  // Income vs expense summary by month
  getIncomeExpenseSummary: async (userId, params = {}) => {
    const response = await api.get(`/budget/income-expense-summary/${userId}`, {
      params,
    });
    return response.data;
  },

  // Copy last month's income to current month
  copyLastMonthIncome: async (userId) => {
    const response = await api.post('/budget/income/copy-from-last-month', {
      userId
    });
    return response.data;
  }
};

export const categoryService = {
  // Legacy category windows methods (for draggable windows UI)
  getUserTables: async (userId) => {
    console.log('📊 Getting user tables for:', userId);
    const response = await api.get(`/category/tables/${userId}`);
    console.log('📊 User tables:', response.data);
    return response.data;
  },

  getCategoryWindows: async (userId) => {
    console.log('🪟 Getting category windows for:', userId);
    const response = await api.get(`/category/windows/${userId}`);
    console.log('🪟 Category windows:', response.data);
    return response.data;
  },

  createCategoryWindow: async (windowData) => {
    console.log('🏗️ Creating category window:', windowData);
    const response = await api.post('/category/windows', windowData);
    console.log('🏗️ Window created:', response.data);
    return response.data;
  },

  updateCategoryWindow: async (windowId, updateData) => {
    console.log('🔄 Updating category window:', windowId, updateData);
    const response = await api.put(`/category/windows/${windowId}`, updateData);
    console.log('🔄 Window updated:', response.data);
    return response.data;
  },

  deleteCategoryWindow: async (windowId, userId) => {
    console.log('🗑️ Deleting category window:', windowId);
    const response = await api.delete(`/category/windows/${windowId}`, {
      data: { userId }
    });
    console.log('🗑️ Window deleted:', response.data);
    return response.data;
  },

  // New categories API (for groupings/categories structure)
  getUserCategories: async (userId) => {
    const response = await api.get(`/categories/${userId}`);
    return response.data;
  },

  getCategoriesInGrouping: async (groupingId) => {
    const response = await api.get(`/categories/grouping/${groupingId}`);
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  updateCategory: async (categoryId, updateData) => {
    const response = await api.put(`/categories/${categoryId}`, updateData);
    return response.data;
  },

  deleteCategory: async (categoryId, userId) => {
    const response = await api.delete(`/categories/${categoryId}`, {
      data: { userId }
    });
    return response.data;
  }
};

export const preferencesService = {
  // Get all user preferences
  getPreferences: async (userId) => {
    const response = await api.get(`/preferences/${userId}`);
    return response.data;
  },

  // Update user preferences (partial update)
  updatePreferences: async (userId, preferences) => {
    const response = await api.put(`/preferences/${userId}`, preferences);
    return response.data;
  },

  // Update last expense category
  updateLastExpenseCategory: async (userId, category) => {
    const response = await api.put(`/preferences/${userId}/last-expense-category`, {
      category
    });
    return response.data;
  },

  // Update last income template
  updateLastIncomeTemplate: async (userId, template) => {
    const response = await api.put(`/preferences/${userId}/last-income-template`, {
      template
    });
    return response.data;
  },

  // Update merchant defaults
  updateMerchantDefaults: async (userId, merchantDefaults) => {
    const response = await api.put(`/preferences/${userId}/merchant-defaults`, {
      merchantDefaults
    });
    return response.data;
  },

  // Reset preferences to default
  resetPreferences: async (userId) => {
    const response = await api.post(`/preferences/${userId}/reset`);
    return response.data;
  }
};

export const groupingService = {
  // Get all groupings for user
  getUserGroupings: async (userId) => {
    const response = await api.get(`/groupings/${userId}`);
    return response.data;
  },

  // Create new grouping
  createGrouping: async (groupingData) => {
    const response = await api.post('/groupings', groupingData);
    return response.data;
  },

  // Update grouping
  updateGrouping: async (groupingId, updateData) => {
    console.log('📤 Sending grouping update:', updateData);
    const response = await api.put(`/groupings/${groupingId}`, updateData);
    return response.data;
  },

  // Delete grouping
  deleteGrouping: async (groupingId, userId) => {
    const response = await api.delete(`/groupings/${groupingId}`, {
      data: { userId }
    });
    return response.data;
  },

  // Get categories within grouping
  getCategoriesInGrouping: async (userId, groupingId) => {
    const response = await api.get(`/groupings/${userId}/${groupingId}/categories`);
    return response.data;
  },

  // Reorder groupings - updates DisplayOrder for multiple groupings
  reorderGroupings: async (userId, orderedGroupings) => {
    // Update each grouping's DisplayOrder
    const updates = orderedGroupings.map((grouping, index) =>
      api.put(`/groupings/${grouping.GroupingID}`, {
        userId,
        displayOrder: index
      })
    );
    await Promise.all(updates);
    return orderedGroupings.map((g, i) => ({ ...g, DisplayOrder: i }));
  }
};

export default api;