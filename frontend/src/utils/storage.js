/**
 * Platform-aware storage utility
 * Uses AsyncStorage on native platforms and localStorage on web
 */

import { Platform } from 'react-native';

// Dynamically import AsyncStorage only on native platforms
let AsyncStorage = null;
if (Platform.OS !== 'web') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

const storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } else {
        // Use AsyncStorage on native
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } else {
        // Use AsyncStorage on native
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  },

  async removeItem(key) {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        // Use AsyncStorage on native
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  },

  async clear() {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
        }
      } else {
        // Use AsyncStorage on native
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }
};

export default storage;
