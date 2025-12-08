import { useState, useEffect } from 'react';

/**
 * Hook to provide category autocomplete suggestions based on previously used categories
 * within a specific grouping
 * 
 * @param {Array} transactions - All transactions for the user
 * @param {string} groupingId - UUID of the grouping to filter by
 * @param {string} inputValue - Current value in the category input field
 * @returns {Object} { suggestions: Array, loading: boolean }
 */
export const useCategoryAutocomplete = (transactions, groupingId, inputValue) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!groupingId || !inputValue || inputValue.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    // Filter transactions by grouping and extract unique categories
    const uniqueCategories = [...new Set(
      transactions
        .filter(t => 
          t.GroupingID === groupingId && 
          t.Category && 
          t.Category.trim().length > 0
        )
        .map(t => t.Category.trim())
    )];

    // Filter categories that match the input (case-insensitive)
    const filtered = uniqueCategories
      .filter(cat => 
        cat.toLowerCase().includes(inputValue.toLowerCase())
      )
      .sort()
      .slice(0, 8); // Limit to 8 suggestions

    setSuggestions(filtered);
    setLoading(false);
  }, [transactions, groupingId, inputValue]);

  return { suggestions, loading };
};
