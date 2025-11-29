import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const makeMerchantKey = (userId) => `merchantDefaults:${userId}`;

/**
 * Hook to manage per-user merchant → default category mapping
 * and provide simple autocomplete suggestions.
 */
export const useMerchantDefaults = (userId) => {
  const [mapping, setMapping] = useState({});

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(makeMerchantKey(userId));
        if (!isMounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setMapping(parsed || {});
          } catch {
            setMapping({});
          }
        } else {
          setMapping({});
        }
      } catch (err) {
        console.warn('Failed to load merchant defaults', err?.message || err);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const persist = useCallback(
    async (next) => {
      setMapping(next);
      if (!userId) return;
      try {
        await AsyncStorage.setItem(makeMerchantKey(userId), JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to persist merchant defaults', err?.message || err);
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
  };
};


