import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const makeKey = (userId, type) => `smartDefaults:${userId}:${type}`;

export const useSmartDefaults = (userId) => {
  const [lastExpenseCategory, setLastExpenseCategory] = useState('');
  const [lastIncomeTemplate, setLastIncomeTemplate] = useState(null);

  // Load persisted values on mount
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const load = async () => {
      try {
        const [catRaw, incomeRaw] = await Promise.all([
          AsyncStorage.getItem(makeKey(userId, 'lastExpenseCategory')),
          AsyncStorage.getItem(makeKey(userId, 'lastIncomeTemplate')),
        ]);

        if (!isMounted) return;

        if (catRaw) {
          setLastExpenseCategory(catRaw);
        }

        if (incomeRaw) {
          try {
            const parsed = JSON.parse(incomeRaw);
            setLastIncomeTemplate(parsed);
          } catch {
            // ignore parse errors and treat as no template
          }
        }
      } catch (err) {
        console.warn('Failed to load smart defaults', err?.message || err);
      }
    };

    load();

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
      setLastExpenseCategory(categoryName);
      try {
        await AsyncStorage.setItem(
          makeKey(userId, 'lastExpenseCategory'),
          categoryName
        );
      } catch (err) {
        console.warn('Failed to persist last expense category', err?.message || err);
      }
    },
    [userId]
  );

  const updateLastIncomeTemplate = useCallback(
    async (template) => {
      if (!userId || !template) return;
      setLastIncomeTemplate(template);
      try {
        await AsyncStorage.setItem(
          makeKey(userId, 'lastIncomeTemplate'),
          JSON.stringify(template)
        );
      } catch (err) {
        console.warn('Failed to persist last income template', err?.message || err);
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
  };
};


