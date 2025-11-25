import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure base URL - update this to match your backend server
const API_BASE_URL = 'http://localhost:5000/api';

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
    const response = await api.post('/auth/login', {
      usernameOrEmail,
      password
    });
    return response.data;
  },

  register: async (username, password, email, name) => {
    const response = await api.post('/auth/register', {
      username,
      password,
      email,
      name
    });
    return response.data;
  },

  validateUser: async (usernameOrEmail, password, validationCode) => {
    const response = await api.post('/auth/validate', {
      usernameOrEmail,
      password,
      validationCode
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

  getTransactions: async (userId) => {
    const response = await api.get(`/budget/transactions/${userId}`);
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
    const response = await api.delete(`/budget/transactions/${transactionId}`, {
      data: { userId }
    });
    return response.data;
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
    const response = await api.delete(`/budget/income/${incomeId}`, {
      data: { userId }
    });
    return response.data;
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

  updateWindowPositions: async (userId, windowUpdates) => {
    const response = await api.post('/budget/windows/positions', {
      UserID: userId,
      WindowUpdates: windowUpdates
    });
    return response.data;
  }
};

export default api;