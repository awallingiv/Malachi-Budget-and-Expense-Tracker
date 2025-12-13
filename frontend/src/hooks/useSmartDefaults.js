import { useState, useEffect, useCallback } from 'react';
import { preferencesService } from '../services/apiService';

/**
 * Unified Smart Defaults Hook - Works for both Web and Mobile
 * Stores preferences in backend database instead of localStorage/AsyncStorage
 */
export const useSmartDefaults = (userId) => {
  const [lastExpenseCategory, setLastExpenseCategory] = useState('');
  const [lastIncomeTemplate, setLastIncomeTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load preferences from API on mount
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const preferences = await preferencesService.getPreferences(userId);

        if (!isMounted) return;

        if (preferences.LastExpenseCategory) {
          setLastExpenseCategory(preferences.LastExpenseCategory);
        }

        if (preferences.LastIncomeTemplate) {
          setLastIncomeTemplate(preferences.LastIncomeTemplate);
        }
      } catch (err) {
        console.warn('Failed to load smart defaults from API:', err?.message || err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const today = new Date().toISOString().split('T')[0];

  const defaultStatusForDate = useCallback((dateStr) => {
    if (!dateStr) return 'paid';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'paid';
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d > todayDate ? 'pending' : 'paid';
  }, []);

  const updateLastExpenseCategory = useCallback(
    async (categoryName) => {
      if (!userId || !categoryName) return;

      // Optimistic update
      setLastExpenseCategory(categoryName);

      try {
        await preferencesService.updateLastExpenseCategory(userId, categoryName);
      } catch (err) {
        console.warn('Failed to persist last expense category to API:', err?.message || err);
        // Could revert the optimistic update here if needed
      }
    },
    [userId]
  );

  const updateLastIncomeTemplate = useCallback(
    async (template) => {
      if (!userId || !template) return;

      // Optimistic update
      setLastIncomeTemplate(template);

      try {
        await preferencesService.updateLastIncomeTemplate(userId, template);
      } catch (err) {
        console.warn('Failed to persist last income template to API:', err?.message || err);
        // Could revert the optimistic update here if needed
      }
    },
    [userId]
  );

  return {
    today,
    lastExpenseCategory,
    updateLastExpenseCategory,
    lastIncomeTemplate,
    updateLastIncomeTemplate,
    defaultStatusForDate,
    loading,
  };
};
