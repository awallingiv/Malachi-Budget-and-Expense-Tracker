import { useState, useEffect, useCallback, useMemo } from 'react';
import { budgetService, groupingService } from '../services/apiService';

/**
 * Custom hook for managing dashboard data fetching and state
 * Centralizes all data loading logic from ModernDashboard
 * 
 * @param {string} userId - The user ID to fetch data for
 * @param {Date} selectedMonth - The selected month for filtering data
 * @param {Object} customDateRange - Optional custom date range { start, end }
 * @returns {Object} Dashboard data and utilities
 */
export const useDashboardData = (userId, selectedMonth, customDateRange = null) => {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [groupings, setGroupings] = useState([]);

  /**
   * Get date range based on selected month or custom range
   */
  const getDateRange = useCallback(() => {
    if (customDateRange) {
      return customDateRange;
    }

    const now = selectedMonth || new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [selectedMonth, customDateRange]);

  /**
   * Load all dashboard data
   */
  const loadAllData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const { start, end } = getDateRange();

      const [stats, txnsResponse, incomeResponse, cats, budgetRows, userGroupings] = await Promise.all([
        budgetService.getDashboardStats(userId).catch((err) => {
          console.error('Failed to load dashboard stats:', err);
          return null;
        }),
        budgetService.getTransactions(userId, {
          startDate: start,
          endDate: end,
          page: 1,
          limit: 50
        }).catch((err) => {
          console.error('Failed to load transactions:', err);
          return { data: [], pagination: { total: 0 } };
        }),
        budgetService.getIncome(userId, start, end, 1, 50).catch((err) => {
          console.error('Failed to load income:', err);
          return { data: [], pagination: { total: 0 } };
        }),
        budgetService.getUserCategories(userId).catch((err) => {
          console.error('Failed to load categories:', err);
          return [];
        }),
        budgetService.getBudgets(userId, { startDate: start, endDate: end }).catch((err) => {
          console.error('Failed to load budgets:', err);
          return [];
        }),
        groupingService.getUserGroupings(userId).catch((err) => {
          console.error('Failed to load groupings:', err);
          return [];
        }),
      ]);

      setDashboardStats(stats);
      // Extract data arrays from paginated responses
      setTransactions(txnsResponse?.data || txnsResponse || []);
      setIncome(incomeResponse?.data || incomeResponse || []);
      setCategories(cats || []);
      setBudgets(budgetRows || []);
      setGroupings(userGroupings || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, getDateRange]);

  /**
   * Refresh data (with refreshing state)
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
  }, [loadAllData]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  /**
   * Filter transactions by date range
   */
  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange();
    return transactions.filter((t) => {
      const date = t.Date || t.CreationTime;
      if (!date) return false;
      const txDate = date.split('T')[0];
      return txDate >= start && txDate <= end;
    });
  }, [transactions, getDateRange]);

  /**
   * Filter income by date range
   */
  const filteredIncome = useMemo(() => {
    const { start, end } = getDateRange();
    return income.filter((i) => {
      const date = i.Date || i.PaycheckDate;
      if (!date) return false;
      const incDate = date.split('T')[0];
      return incDate >= start && incDate <= end;
    });
  }, [income, getDateRange]);

  /**
   * Calculate totals from transactions grouped by category
   */
  const categoryTotals = useMemo(() => {
    const totals = {};
    filteredTransactions.forEach((t) => {
      const category = t.TableName || t.Category || 'Uncategorized';
      if (!totals[category]) {
        totals[category] = { totalAmount: 0, transactionCount: 0 };
      }
      totals[category].totalAmount += t.Amount || 0;
      totals[category].transactionCount += 1;
    });
    return Object.entries(totals).map(([Category, data]) => ({
      Category,
      ...data,
    }));
  }, [filteredTransactions]);

  /**
   * Calculate totals from transactions grouped by grouping
   */
  const groupingTotals = useMemo(() => {
    const totals = {};
    filteredTransactions.forEach((t) => {
      const groupingId = t.GroupingID || 'ungrouped';
      if (!totals[groupingId]) {
        totals[groupingId] = { totalAmount: 0, transactionCount: 0, transactions: [] };
      }
      totals[groupingId].totalAmount += t.Amount || 0;
      totals[groupingId].transactionCount += 1;
      totals[groupingId].transactions.push(t);
    });
    return totals;
  }, [filteredTransactions]);

  /**
   * Calculate income totals
   */
  const incomeTotals = useMemo(() => {
    return filteredIncome.reduce(
      (acc, i) => ({
        totalGross: acc.totalGross + (i.Gross || 0),
        totalNet: acc.totalNet + (i.Net || 0),
        totalTithe: acc.totalTithe + (i.Tithe || 0),
        count: acc.count + 1,
      }),
      { totalGross: 0, totalNet: 0, totalTithe: 0, count: 0 }
    );
  }, [filteredIncome]);

  /**
   * Calculate expense totals
   */
  const expenseTotals = useMemo(() => {
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.Amount || 0), 0);
    return {
      totalAmount,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  /**
   * Calculate net position (income - expenses)
   */
  const netPosition = useMemo(() => {
    return incomeTotals.totalNet - expenseTotals.totalAmount;
  }, [incomeTotals, expenseTotals]);

  /**
   * Calculate savings rate
   */
  const savingsRate = useMemo(() => {
    if (incomeTotals.totalNet <= 0) return 0;
    return ((incomeTotals.totalNet - expenseTotals.totalAmount) / incomeTotals.totalNet) * 100;
  }, [incomeTotals, expenseTotals]);

  return {
    // Loading states
    loading,
    refreshing,
    error,

    // Raw data
    dashboardStats,
    transactions,
    income,
    categories,
    budgets,
    groupings,

    // Filtered data
    filteredTransactions,
    filteredIncome,

    // Computed totals
    categoryTotals,
    groupingTotals,
    incomeTotals,
    expenseTotals,
    netPosition,
    savingsRate,

    // Actions
    refresh,
    loadAllData,

    // Setters for CRUD operations
    setTransactions,
    setIncome,
    setCategories,
    setBudgets,
    setGroupings,
  };
};

export default useDashboardData;
