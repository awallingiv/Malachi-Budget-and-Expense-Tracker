import { useState, useEffect, useCallback } from 'react';
import { preferencesService } from '../services/apiService';

/**
 * Unified Merchant Defaults Hook - Works for both Web and Mobile
 * Stores merchant-to-category mappings in backend database
 * instead of localStorage/AsyncStorage
 */
export const useMerchantDefaults = (userId) => {
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadMerchantDefaults = async () => {
      try {
        const preferences = await preferencesService.getPreferences(userId);

        if (!isMounted) return;

        if (preferences.MerchantDefaults) {
          setMapping(preferences.MerchantDefaults);
        }
      } catch (err) {
        console.warn('Failed to load merchant defaults from API:', err?.message || err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMerchantDefaults();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const persist = useCallback(
    async (next) => {
      if (!userId) return;

      // Optimistic update
      setMapping(next);

      try {
        await preferencesService.updateMerchantDefaults(userId, next);
      } catch (err) {
        console.warn('Failed to persist merchant defaults to API:', err?.message || err);
        // Could revert the optimistic update here if needed
      }
    },
    [userId]
  );

  const recordMerchant = useCallback(
    async (merchantRaw, category) => {
      const merchant = (merchantRaw || '').trim();
      if (!merchant || !category) return;

      const current = mapping[merchant] || { category, uses: 0 };
      const next = {
        ...mapping,
        [merchant]: {
          category,
          uses: current.uses + 1,
        },
      };

      await persist(next);
    },
    [mapping, persist]
  );

  const getDefaultCategory = useCallback(
    (merchantRaw) => {
      const merchant = (merchantRaw || '').trim();
      if (!merchant) return '';
      return mapping[merchant]?.category || '';
    },
    [mapping]
  );

  const getSuggestions = useCallback(
    (queryRaw, max = 5) => {
      const query = (queryRaw || '').trim().toLowerCase();
      const names = Object.keys(mapping);
      if (!query) {
        // Return top merchants by usage when query is empty
        return names
          .sort((a, b) => (mapping[b]?.uses || 0) - (mapping[a]?.uses || 0))
          .slice(0, max);
      }
      return names
        .filter((name) => name.toLowerCase().includes(query))
        .sort((a, b) => (mapping[b]?.uses || 0) - (mapping[a]?.uses || 0))
        .slice(0, max);
    },
    [mapping]
  );

  return {
    recordMerchant,
    getDefaultCategory,
    getSuggestions,
    loading,
  };
};
