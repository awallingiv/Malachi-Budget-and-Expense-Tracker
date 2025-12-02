import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  Modal,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import { useSmartDefaults } from '../hooks/useSmartDefaults';
import MonthSelector from './MonthSelector';

const { width: screenWidth } = Dimensions.get('window');

// Theme-aware color palette
const getColors = (isDark) => ({
  background: isDark ? '#0a0f1a' : '#f8fafc',
  cardBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
  cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
  primary: '#00d4aa',
  secondary: '#ff6b6b',
  accent: '#4ecdc4',
  purple: '#667eea',
  text: isDark ? '#ffffff' : '#1a1a2e',
  textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
  textDim: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
  success: '#00d4aa',
  warning: '#ffd93d',
  danger: '#ff6b6b',
  inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
  inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  modalBg: isDark ? '#0a0f1a' : '#ffffff',
  orbOpacity: isDark ? 0.05 : 0.08,
});

// Default colors for static styles (dark mode)
const defaultColors = getColors(true);

// Category colors for visual distinction
const categoryColors = ['#00d4aa', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff6b6b', '#a29bfe', '#fd79a8'];

// Animated card component
// Accepts an optional `cardStyle` so we can inject theme-aware colors (light/dark)
const AnimatedCard = ({ children, delay = 0, style, cardStyle }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        cardStyle,
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Input field component for modals
const ModalInput = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => (
  <View style={styles.modalInputContainer}>
    <Text style={styles.modalInputLabel}>{label}</Text>
    <TextInput
      style={[styles.modalInput, multiline && styles.modalInputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={defaultColors.textDim}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  </View>
);

// Select/Dropdown component
const ModalSelect = ({ label, value, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <View style={styles.modalInputContainer}>
      <Text style={styles.modalInputLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.modalSelect}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.modalSelectText}>{value || 'Select...'}</Text>
        <Text style={styles.modalSelectArrow}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.modalSelectOptions}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.modalSelectOption}
              onPress={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              <Text style={styles.modalSelectOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// Transaction row component
const TransactionRow = ({ transaction, onEdit, onDelete, colors }) => {
  // Fallback to default colors if not provided
  const c = colors || defaultColors;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.transactionRow}>
      <View style={styles.transactionIcon}>
        <Text style={styles.transactionIconText}>
          {transaction.TableName?.charAt(0)?.toUpperCase() || '💳'}
        </Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDesc, { color: c.text }]} numberOfLines={1}>
          {transaction.Description || 'Transaction'}
        </Text>
        <Text style={[styles.transactionCategory, { color: c.textDim }]}>
          {transaction.TableName || 'General'} • {formatDate(transaction.Date || transaction.CreationTime)}
        </Text>
      </View>
      <Text style={[styles.transactionAmount, { color: c.danger }]}>
        -${(transaction.Amount || 0).toFixed(2)}
      </Text>
      <TouchableOpacity onPress={() => onEdit(transaction)} style={styles.transactionAction}>
        <Text style={styles.transactionActionText}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
};

// Income row component
const IncomeRow = ({ income, onEdit, colors }) => {
  // Fallback to default colors if not provided
  const c = colors || defaultColors;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, { backgroundColor: 'rgba(0, 212, 170, 0.1)' }]}>
        <Text style={styles.transactionIconText}>💵</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDesc, { color: c.text }]} numberOfLines={1}>
          {income.Description || 'Income'}
        </Text>
        <Text style={[styles.transactionCategory, { color: c.textDim }]}>
          {formatDate(income.Date)} • Tithe: ${(income.Tithe || 0).toFixed(2)}
        </Text>
      </View>
      <View style={styles.incomeAmounts}>
        <Text style={[styles.transactionAmount, { color: c.success }]}>
          +${(income.Gross || 0).toFixed(2)}
        </Text>
        <Text style={[styles.incomeNet, { color: c.textDim }]}>
          Net: ${(income.Net || 0).toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onEdit(income)} style={styles.transactionAction}>
        <Text style={styles.transactionActionText}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
};

// Category breakdown card
const CategoryCard = ({ category, index, onPress }) => {
  const color = categoryColors[index % categoryColors.length];
  
  return (
    <TouchableOpacity 
      style={[styles.categoryCard, { borderLeftColor: color }]}
      onPress={() => onPress(category)}
    >
      <View style={styles.categoryCardHeader}>
        <Text style={styles.categoryCardName}>{category.TableName}</Text>
        <Text style={[styles.categoryCardAmount, { color }]}>
          ${(category.totalAmount || 0).toFixed(2)}
        </Text>
      </View>
      <Text style={styles.categoryCardCount}>
        {category.transactionCount || 0} transactions
      </Text>
    </TouchableOpacity>
  );
};

const ModernDashboard = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const colors = getColors(isDark);
  const {
    today,
    lastExpenseCategory,
    updateLastExpenseCategory,
    lastIncomeTemplate,
    updateLastIncomeTemplate,
    defaultStatusForDate,
  } = useSmartDefaults(user?.UserId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedCashflowMonth, setSelectedCashflowMonth] = useState(null);
  
  // Month/Date selection for filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [customDateRange, setCustomDateRange] = useState(null);
  
  // Modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [incomeForm, setIncomeForm] = useState({
    Description: '',
    Gross: '',
    Net: '',
    Tithe: '',
    Date: today,
    TitheStatus: 'unpaid',
    PaycheckStatus: 'received'
  });
  
  const [expenseForm, setExpenseForm] = useState({
    Description: '',
    Amount: '',
    TableName: lastExpenseCategory || '',
    Date: today,
    Notes: '',
    Category: '',
    Status: defaultStatusForDate(today)
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAllData = async () => {
    if (!user?.UserId) return;
    
    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [stats, txns, income, cats, budgetRows] = await Promise.all([
        budgetService.getDashboardStats(user.UserId).catch(() => null),
        budgetService.getTransactions(user.UserId).catch(() => []),
        budgetService.getIncome(user.UserId).catch(() => []),
        budgetService.getUserCategories(user.UserId).catch(() => []),
        budgetService
          .getBudgets(user.UserId, {
            startDate: startOfMonth.toISOString().split('T')[0],
            endDate: endOfMonth.toISOString().split('T')[0],
          })
          .catch(() => []),
      ]);
      
      setDashboardData(stats);
      setTransactions(txns || []);
      setIncomeList(income || []);
      setCategories(cats || []);
      setBudgets(budgetRows || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get date range based on selected month or custom range
  const getDateRange = () => {
    if (customDateRange) {
      return customDateRange;
    }
    
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange();
    return transactions.filter(t => {
      const date = t.Date || t.CreationTime;
      if (!date) return false;
      const txDate = date.split('T')[0];
      return txDate >= start && txDate <= end;
    });
  }, [transactions, selectedMonth, customDateRange]);

  // Filter income by date range
  const filteredIncome = useMemo(() => {
    const { start, end } = getDateRange();
    return incomeList.filter(i => {
      const date = i.Date || i.PaycheckDate;
      if (!date) return false;
      const incDate = date.split('T')[0];
      return incDate >= start && incDate <= end;
    });
  }, [incomeList, selectedMonth, customDateRange]);

  // Handle month change
  const handleMonthChange = (newDate) => {
    setCustomDateRange(null);
    setSelectedMonth(newDate);
  };

  // Handle custom date range
  const handleCustomRange = (start, end) => {
    setCustomDateRange({ start, end });
  };

  // Calculate totals from FILTERED data
  const totalGross = filteredIncome.reduce((sum, i) => sum + (parseFloat(i.Gross) || 0), 0);
  const totalNet = filteredIncome.reduce((sum, i) => sum + (parseFloat(i.Net) || 0), 0);
  const totalTithe = filteredIncome.reduce((sum, i) => sum + (parseFloat(i.Tithe) || 0), 0);
  const totalExpenses = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
  const netPosition = totalNet - totalExpenses;
  const savingsRate = totalNet > 0 ? ((totalNet - totalExpenses) / totalNet) * 100 : 0;

  // Group FILTERED transactions by TableName for category totals
  const categoryTotals = filteredTransactions.reduce((acc, txn) => {
    const table = txn.TableName || 'Other';
    if (!acc[table]) {
      acc[table] = { TableName: table, totalAmount: 0, transactionCount: 0 };
    }
    acc[table].totalAmount += parseFloat(txn.Amount) || 0;
    acc[table].transactionCount += 1;
    return acc;
  }, {});
  
  const categoryList = Object.values(categoryTotals).sort((a, b) => b.totalAmount - a.totalAmount);

  // Budgets summary: planned vs actual for current month
  const budgetsWithActuals = budgets.map((b) => {
    const planned = parseFloat(b.Amount) || 0;
    const actual = categoryTotals[b.CategoryName]?.totalAmount || 0;
    const remaining = planned - actual;
    const usedPct = planned > 0 ? actual / planned : 0;
    return {
      ...b,
      planned,
      actual,
      remaining,
      usedPct,
    };
  });

  const totalPlannedBudget = budgetsWithActuals.reduce((sum, b) => sum + b.planned, 0);
  const totalActualBudget = budgetsWithActuals.reduce((sum, b) => sum + b.actual, 0);
  const budgetNet = totalPlannedBudget - totalActualBudget;

  const atRiskBudgets = [...budgetsWithActuals]
    .filter((b) => b.planned > 0)
    .sort((a, b) => b.usedPct - a.usedPct)
    .slice(0, 3);

  // Monthly cashflow (income, expenses, net) by month
  const monthlyMap = transactions.reduce((acc, txn) => {
    const date = new Date(txn.Date || txn.CreationTime);
    if (isNaN(date.getTime())) return acc;
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        label: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
        income: 0,
        expenses: 0,
      };
    }
    acc[key].expenses += parseFloat(txn.Amount) || 0;
    return acc;
  }, {});

  incomeList.forEach((inc) => {
    const rawDate = inc.Date || inc.CreationTime;
    const date = rawDate ? new Date(rawDate) : null;
    if (!date || isNaN(date.getTime())) return;
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        key,
        label: date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
        income: 0,
        expenses: 0,
      };
    }
    const net = parseFloat(inc.Net) || parseFloat(inc.amount) || 0;
    monthlyMap[key].income += net;
  });

  const monthlyCashflowData = Object.values(monthlyMap)
    .map((m) => ({
      ...m,
      net: (m.income || 0) - (m.expenses || 0),
    }))
    .sort((a, b) => a.start - b.start);

  const lastMonths = monthlyCashflowData.slice(-6);
  const activeMonthKey =
    selectedCashflowMonth || (lastMonths.length ? lastMonths[lastMonths.length - 1].key : null);
  const activeMonth =
    lastMonths.find((m) => m.key === activeMonthKey) || lastMonths[lastMonths.length - 1] || null;

  let cashflowCategories = [];
  if (activeMonth) {
    const map = transactions.reduce((acc, txn) => {
      const date = new Date(txn.Date || txn.CreationTime);
      if (isNaN(date.getTime())) return acc;
      if (date < activeMonth.start || date > activeMonth.end) return acc;
      const table = txn.TableName || 'Other';
      if (!acc[table]) {
        acc[table] = { TableName: table, totalAmount: 0, transactionCount: 0 };
      }
      acc[table].totalAmount += parseFloat(txn.Amount) || 0;
      acc[table].transactionCount += 1;
      return acc;
    }, {});
    cashflowCategories = Object.values(map)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3);
  }

  // Auto-calculate tithe (10%)
  useEffect(() => {
    if (incomeForm.Gross) {
      const gross = parseFloat(incomeForm.Gross) || 0;
      const tithe = gross * 0.1;
      setIncomeForm(prev => ({ ...prev, Tithe: tithe.toFixed(2) }));
    }
  }, [incomeForm.Gross]);

  // CRUD Operations
  const handleSaveIncome = async () => {
    try {
      const data = {
        UserID: user.UserId,
        Username: user.Username,
        Description: incomeForm.Description,
        Gross: parseFloat(incomeForm.Gross) || 0,
        Net: parseFloat(incomeForm.Net) || 0,
        Tithe: parseFloat(incomeForm.Tithe) || 0,
        Date: incomeForm.Date,
        TitheStatus: incomeForm.TitheStatus,
        PaycheckStatus: incomeForm.PaycheckStatus
      };

      if (editingItem?.IncomeId) {
        await budgetService.updateIncome(editingItem.IncomeId, data);
      } else {
        await budgetService.createIncome(data);
        // Remember last paycheck template for quick reuse
        await updateLastIncomeTemplate({
          Description: data.Description,
          Gross: data.Gross,
          Net: data.Net,
          Tithe: data.Tithe,
          TitheStatus: data.TitheStatus,
          PaycheckStatus: data.PaycheckStatus,
        });
      }
      
      setShowIncomeModal(false);
      resetIncomeForm();
      loadAllData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save income: ' + error.message);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.TableName) {
      Alert.alert('Required', 'Please select or enter a category');
      return;
    }
    
    try {
      const data = {
        UserID: user.UserId,
        Username: user.Username,
        TableName: expenseForm.TableName,
        Description: expenseForm.Description,
        Amount: parseFloat(expenseForm.Amount) || 0,
        Date: expenseForm.Date,
        Notes: expenseForm.Notes,
        Category: expenseForm.Category,
        Status: expenseForm.Status
      };

      if (editingItem?.TransactionId) {
        await budgetService.updateTransaction(editingItem.TransactionId, data);
      } else {
        await budgetService.createTransaction(data);
        if (data.TableName) {
          await updateLastExpenseCategory(data.TableName);
        }
      }
      
      setShowExpenseModal(false);
      resetExpenseForm();
      loadAllData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense: ' + error.message);
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    const performDelete = async () => {
      try {
        console.log('🗑 Deleting income from ModernDashboard:', { incomeId, userId: user.UserId });
        const result = await budgetService.deleteIncome(incomeId, user.UserId);
        console.log('✅ Delete income result:', result);

        if (result && result.success) {
          loadAllData();
        } else {
          const msg = result?.error || result?.message || 'Failed to delete income';
          console.error('❌ Delete income failed:', msg);
          if (Platform.OS !== 'web') {
            Alert.alert('Error', msg);
          } else if (typeof window !== 'undefined') {
            window.alert(msg);
          }
        }
      } catch (error) {
        console.error('💥 Error deleting income:', error);
        const msg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to delete income';
        if (Platform.OS !== 'web') {
          Alert.alert('Error', msg);
        } else if (typeof window !== 'undefined') {
          window.alert(msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        // Fallback – just perform delete without confirm if window is not available
        performDelete();
        return;
      }
      const confirmed = window.confirm('Are you sure you want to delete this income?');
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Income', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]);
    }
  };

  const handleDeleteExpense = async (transactionId) => {
    const performDelete = async () => {
      try {
        console.log('🗑 Deleting expense from ModernDashboard:', {
          transactionId,
          userId: user.UserId,
        });
        const result = await budgetService.deleteTransaction(transactionId, user.UserId);
        console.log('✅ Delete expense result:', result);

        if (result && result.success) {
          loadAllData();
        } else {
          const msg = result?.error || result?.message || 'Failed to delete expense';
          console.error('❌ Delete expense failed:', msg);
          if (Platform.OS !== 'web') {
            Alert.alert('Error', msg);
          } else if (typeof window !== 'undefined') {
            window.alert(msg);
          }
        }
      } catch (error) {
        console.error('💥 Error deleting expense:', error);
        const msg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          'Failed to delete expense';
        if (Platform.OS !== 'web') {
          Alert.alert('Error', msg);
        } else if (typeof window !== 'undefined') {
          window.alert(msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        performDelete();
        return;
      }
      const confirmed = window.confirm('Are you sure you want to delete this expense?');
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Expense', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]);
    }
  };

  const resetIncomeForm = () => {
    setIncomeForm({
      Description: '',
      Gross: '',
      Net: '',
      Tithe: '',
      Date: today,
      TitheStatus: 'unpaid',
      PaycheckStatus: 'received'
    });
    setEditingItem(null);
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      Description: '',
      Amount: '',
      TableName: lastExpenseCategory || '',
      Date: today,
      Notes: '',
      Category: '',
      Status: defaultStatusForDate(today)
    });
    setEditingItem(null);
  };

  const openEditIncome = (income) => {
    setEditingItem(income);
    setIncomeForm({
      Description: income.Description || '',
      Gross: (income.Gross || 0).toString(),
      Net: (income.Net || 0).toString(),
      Tithe: (income.Tithe || 0).toString(),
      Date: income.Date || new Date().toISOString().split('T')[0],
      TitheStatus: income.TitheStatus || 'unpaid',
      PaycheckStatus: income.PaycheckStatus || 'received'
    });
    setShowIncomeModal(true);
  };

  const openEditExpense = (transaction) => {
    setEditingItem(transaction);
    setExpenseForm({
      Description: transaction.Description || '',
      Amount: (transaction.Amount || 0).toString(),
      TableName: transaction.TableName || '',
      Date: transaction.Date || new Date().toISOString().split('T')[0],
      Notes: transaction.Notes || '',
      Category: transaction.Category || '',
      Status: transaction.Status || 'paid'
    });
    setShowExpenseModal(true);
  };

  const openCategoryDetail = (category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  // Get unique category names for dropdown
  const existingCategories = [...new Set(transactions.map(t => t.TableName).filter(Boolean))];
  const defaultCategories = ['Utilities', 'Bills', 'Subscriptions', 'Food', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare'];
  const allCategories = [...new Set([...existingCategories, ...defaultCategories])].sort();

  // Filtered transactions for category modal
  const categoryTransactions = selectedCategory 
    ? transactions.filter(t => t.TableName === selectedCategory.TableName)
    : [];

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
    text: { color: colors.text },
    textMuted: { color: colors.textMuted },
    textDim: { color: colors.textDim },
    input: { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
    modalBg: { backgroundColor: colors.modalBg },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Background */}
      <View style={[styles.backgroundGradient, { opacity: isDark ? 1 : 0.5 }]} />
      <View style={[styles.backgroundOrb1, { opacity: colors.orbOpacity }]} />
      <View style={[styles.backgroundOrb2, { opacity: colors.orbOpacity * 0.6 }]} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()},</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.Name || user?.Username || 'User'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.inputBg }]} onPress={loadAllData}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.inputBg }]} onPress={toggleTheme}>
              <Text style={styles.refreshButtonText}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.inputBorder }]} onPress={logout}>
              <Text style={[styles.logoutText, { color: colors.textMuted }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Selector */}
        <MonthSelector
          selectedDate={selectedMonth}
          onDateChange={handleMonthChange}
          onCustomRange={handleCustomRange}
        />

        {/* Custom Range Indicator */}
        {customDateRange && (
          <View style={[styles.customRangeBar, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.customRangeText, { color: colors.textMuted }]}>
              Showing: {customDateRange.start} to {customDateRange.end}
            </Text>
            <TouchableOpacity onPress={() => setCustomDateRange(null)}>
              <Text style={[styles.clearRangeText, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Net Position Hero */}
        <AnimatedCard delay={0} cardStyle={dynamicStyles.card} style={styles.heroCard}>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>NET POSITION</Text>
          <Text style={[styles.heroValue, { color: netPosition >= 0 ? colors.success : colors.danger }]}>
            {formatCurrency(netPosition)}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Total Income</Text>
              <Text style={[styles.heroStatValue, { color: colors.success }]}>
                {formatCurrency(totalNet)}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Total Expenses</Text>
              <Text style={[styles.heroStatValue, { color: colors.danger }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <AnimatedCard delay={100} cardStyle={dynamicStyles.card} style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={[styles.statTitle, { color: colors.textDim }]}>Gross Income</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(totalGross)}</Text>
          </AnimatedCard>
          <AnimatedCard delay={150} cardStyle={dynamicStyles.card} style={styles.statCard}>
            <Text style={styles.statIcon}>🙏</Text>
            <Text style={[styles.statTitle, { color: colors.textDim }]}>Tithe</Text>
            <Text style={[styles.statValue, { color: colors.accent }]}>{formatCurrency(totalTithe)}</Text>
          </AnimatedCard>
        </View>

        {/* Savings Rate */}
        <AnimatedCard delay={200} cardStyle={dynamicStyles.card} style={styles.savingsCard}>
          <View style={styles.savingsContent}>
            <View style={styles.savingsInfo}>
              <Text style={[styles.savingsTitle, { color: colors.text } ]}>Savings Rate</Text>
              <Text style={[styles.savingsDesc, { color: colors.textMuted }]}>
                {savingsRate >= 20 ? "Excellent! You're on track 🎯" 
                  : savingsRate >= 10 ? "Good progress! Keep going 💪"
                  : savingsRate > 0 ? "Let's work on saving more 📈"
                  : "Time to review your budget 🔍"}
              </Text>
            </View>
            <View style={styles.savingsRing}>
              <Text style={[styles.savingsPercent, { 
                color: savingsRate >= 20 ? colors.success : savingsRate >= 10 ? colors.warning : colors.danger 
              }]}>
                {Math.max(0, savingsRate).toFixed(0)}%
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Budget Summary */}
        {budgetsWithActuals.length > 0 && (
          <AnimatedCard delay={230} cardStyle={dynamicStyles.card} style={styles.budgetSummaryCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Summary (This Month)</Text>
            <View style={styles.budgetSummaryRow}>
              <View style={styles.budgetSummaryItem}>
                <Text style={[styles.budgetSummaryLabel, { color: colors.textDim }]}>Planned</Text>
                <Text style={styles.budgetSummaryValue}>
                  {formatCurrency(totalPlannedBudget)}
                </Text>
              </View>
              <View style={styles.budgetSummaryItem}>
                <Text style={[styles.budgetSummaryLabel, { color: colors.textDim }]}>Actual</Text>
                <Text style={styles.budgetSummaryValue}>
                  {formatCurrency(totalActualBudget)}
                </Text>
              </View>
              <View style={styles.budgetSummaryItem}>
                <Text style={[styles.budgetSummaryLabel, { color: colors.textDim }]}>Remaining</Text>
                <Text
                  style={[
                    styles.budgetSummaryValue,
                    budgetNet >= 0 ? styles.incomeValue : styles.expenseValue,
                  ]}
                >
                  {formatCurrency(budgetNet)}
                </Text>
              </View>
            </View>

            {atRiskBudgets.length > 0 && (
              <>
                <Text style={[styles.budgetAtRiskTitle, { color: colors.text }]}>At-risk categories</Text>
                {atRiskBudgets.map((b) => (
                  <View key={b.BudgetID} style={styles.budgetAtRiskRow}>
                    <Text style={[styles.budgetAtRiskName, { color: colors.textMuted }]}>{b.CategoryName}</Text>
                    <Text
                      style={[
                        styles.budgetAtRiskPercent,
                        b.usedPct >= 1
                          ? styles.expenseValue
                          : b.usedPct >= 0.8
                          ? styles.titheValue
                          : styles.incomeValue,
                      ]}
                    >
                      {Math.round(b.usedPct * 100)}%
                    </Text>
                  </View>
                ))}
              </>
            )}
          </AnimatedCard>
        )}

        {/* Monthly Cashflow */}
        {lastMonths.length > 0 && (
          <AnimatedCard delay={240} cardStyle={dynamicStyles.card} style={styles.cashflowCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Cashflow</Text>
            {lastMonths.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.cashflowRow,
                  activeMonth && activeMonth.key === m.key && styles.cashflowRowActive,
                ]}
                onPress={() => setSelectedCashflowMonth(m.key)}
              >
                <Text style={[styles.cashflowMonth, { color: colors.text }]}>{m.label}</Text>
                <Text style={[styles.cashflowIncome, { color: colors.success }]}>{formatCurrency(m.income)}</Text>
                <Text style={[styles.cashflowExpense, { color: colors.danger }]}>{formatCurrency(m.expenses)}</Text>
                <Text
                  style={[
                    styles.cashflowNet,
                    m.net >= 0 ? styles.incomeValue : styles.expenseValue,
                  ]}
                >
                  {formatCurrency(m.net)}
                </Text>
              </TouchableOpacity>
            ))}

            {activeMonth && cashflowCategories.length > 0 && (
              <>
                <Text style={[styles.cashflowDetailTitle, { color: colors.text }]}>
                  Top categories in {activeMonth.label}
                </Text>
                {cashflowCategories.map((cat) => (
                  <View key={cat.TableName} style={styles.cashflowDetailRow}>
                    <Text style={[styles.cashflowDetailName, { color: colors.text }]}>{cat.TableName}</Text>
                    <Text style={[styles.cashflowDetailAmount, { color: colors.text }]}>
                      {formatCurrency(cat.totalAmount)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </AnimatedCard>
        )}

        {/* Categories */}
        {categoryList.length > 0 && (
          <AnimatedCard delay={250} cardStyle={dynamicStyles.card} style={styles.categoriesCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
            <View style={styles.categoryGrid}>
              {categoryList.slice(0, 6).map((cat, index) => (
                <CategoryCard 
                  key={cat.TableName} 
                  category={cat} 
                  index={index}
                  onPress={openCategoryDetail}
                />
              ))}
            </View>
          </AnimatedCard>
        )}

        {/* Income List */}
        <AnimatedCard delay={300} cardStyle={dynamicStyles.card} style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💵 Income</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {lastIncomeTemplate && (
                <TouchableOpacity
                  onPress={() => {
                    setIncomeForm({
                      Description: lastIncomeTemplate.Description || '',
                      Gross: (lastIncomeTemplate.Gross || '').toString(),
                      Net: (lastIncomeTemplate.Net || '').toString(),
                      Tithe: (lastIncomeTemplate.Tithe || '').toString(),
                      Date: today,
                      TitheStatus: lastIncomeTemplate.TitheStatus || 'unpaid',
                      PaycheckStatus: lastIncomeTemplate.PaycheckStatus || 'received',
                    });
                    setShowIncomeModal(true);
                  }}
                >
                  <Text style={styles.addButton}>Use last</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  resetIncomeForm();
                  setShowIncomeModal(true);
                }}
              >
                <Text style={styles.addButton}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {incomeList.length > 0 ? (
            incomeList.slice(0, 5).map((income, index) => (
              <IncomeRow key={income.IncomeId || index} income={income} onEdit={openEditIncome} colors={colors} />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textDim }]}>No income recorded yet</Text>
          )}
        </AnimatedCard>

        {/* Transactions List */}
        <AnimatedCard delay={350} cardStyle={dynamicStyles.card} style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💳 Recent Expenses</Text>
            <TouchableOpacity onPress={() => { resetExpenseForm(); setShowExpenseModal(true); }}>
              <Text style={styles.addButton}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {transactions.length > 0 ? (
            transactions.slice(0, 5).map((txn, index) => (
              <TransactionRow 
                key={txn.TransactionId || index} 
                transaction={txn} 
                onEdit={openEditExpense}
                onDelete={() => handleDeleteExpense(txn.TransactionId)}
                colors={colors}
              />
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textDim }]}>No expenses recorded yet</Text>
          )}
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard delay={400} cardStyle={dynamicStyles.card} style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => { resetExpenseForm(); setShowExpenseModal(true); }}
            >
              <Text style={styles.actionIcon}>💳</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => { resetIncomeForm(); setShowIncomeModal(true); }}
            >
              <Text style={styles.actionIcon}>💵</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={loadAllData}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Income Modal */}
      <Modal visible={showIncomeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Income' : 'Add Income'}
              </Text>
              <TouchableOpacity onPress={() => { setShowIncomeModal(false); resetIncomeForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <ModalInput
                label="Description"
                value={incomeForm.Description}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Description: text }))}
                placeholder="e.g., Paycheck, Bonus"
              />
              <ModalInput
                label="Gross Amount"
                value={incomeForm.Gross}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Gross: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <ModalInput
                label="Net Amount"
                value={incomeForm.Net}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Net: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <ModalInput
                label="Tithe (10%)"
                value={incomeForm.Tithe}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Tithe: text }))}
                placeholder="Auto-calculated"
                keyboardType="decimal-pad"
              />
              <ModalInput
                label="Date"
                value={incomeForm.Date}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Date: text }))}
                placeholder="YYYY-MM-DD"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              {editingItem && (
                <TouchableOpacity 
                  style={styles.modalDeleteButton}
                  onPress={() => { setShowIncomeModal(false); handleDeleteIncome(editingItem.IncomeId); }}
                >
                  <Text style={styles.modalDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveIncome}>
                <Text style={styles.modalSaveButtonText}>Save Income</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expense Modal */}
      <Modal visible={showExpenseModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Expense' : 'Add Expense'}
              </Text>
              <TouchableOpacity onPress={() => { setShowExpenseModal(false); resetExpenseForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <ModalSelect
                label="Category (Table)"
                value={expenseForm.TableName}
                options={allCategories}
                onSelect={(val) => setExpenseForm(prev => ({ ...prev, TableName: val }))}
              />
              <ModalInput
                label="Or create new category"
                value={newCategoryName}
                onChangeText={(text) => {
                  setNewCategoryName(text);
                  if (text) setExpenseForm(prev => ({ ...prev, TableName: text }));
                }}
                placeholder="e.g., Groceries, Insurance"
              />
              <ModalInput
                label="Description"
                value={expenseForm.Description}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Description: text }))}
                placeholder="What was this for?"
              />
              <ModalInput
                label="Amount"
                value={expenseForm.Amount}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Amount: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <ModalInput
                label="Date"
                value={expenseForm.Date}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Date: text }))}
                placeholder="YYYY-MM-DD"
              />
              <ModalInput
                label="Notes (optional)"
                value={expenseForm.Notes}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Notes: text }))}
                placeholder="Additional details..."
                multiline
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              {editingItem && (
                <TouchableOpacity 
                  style={styles.modalDeleteButton}
                  onPress={() => { setShowExpenseModal(false); handleDeleteExpense(editingItem.TransactionId); }}
                >
                  <Text style={styles.modalDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveExpense}>
                <Text style={styles.modalSaveButtonText}>Save Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Detail Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCategory?.TableName || 'Category'}
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoryModalStats}>
              <Text style={styles.categoryModalTotal}>
                Total: {formatCurrency(selectedCategory?.totalAmount || 0)}
              </Text>
              <Text style={styles.categoryModalCount}>
                {categoryTransactions.length} transactions
              </Text>
            </View>

            <ScrollView style={styles.modalBody}>
              {categoryTransactions.map((txn, index) => (
                <TransactionRow 
                  key={txn.TransactionId || index} 
                  transaction={txn} 
                  onEdit={(t) => { setShowCategoryModal(false); openEditExpense(t); }}
                  colors={colors}
                />
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={() => {
                  setShowCategoryModal(false);
                  setExpenseForm(prev => ({ ...prev, TableName: selectedCategory?.TableName }));
                  setShowExpenseModal(true);
                }}
              >
                <Text style={styles.modalSaveButtonText}>+ Add to {selectedCategory?.TableName}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.15) 0%, transparent 100%)',
    } : {
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
    }),
  },
  backgroundOrb1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: defaultColors.primary,
    opacity: 0.05,
  },
  backgroundOrb2: {
    position: 'absolute',
    top: 200,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: defaultColors.secondary,
    opacity: 0.03,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
  },
  greeting: {
    fontSize: 16,
    color: defaultColors.textMuted,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: defaultColors.text,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 18,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  modeButtonText: {
    color: defaultColors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutText: {
    color: defaultColors.textMuted,
    fontSize: 14,
  },
  customRangeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  customRangeText: {
    fontSize: 13,
  },
  clearRangeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: defaultColors.cardBg,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: defaultColors.cardBorder,
  },
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 32,
  },
  heroLabel: {
    fontSize: 12,
    color: defaultColors.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 24,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  heroStatLabel: {
    fontSize: 12,
    color: defaultColors.textDim,
    marginBottom: 4,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: defaultColors.textDim,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  savingsCard: {
    padding: 24,
  },
  savingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsInfo: {
    flex: 1,
    marginRight: 20,
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: defaultColors.text,
    marginBottom: 8,
  },
  savingsDesc: {
    fontSize: 14,
    color: defaultColors.textMuted,
  },
  savingsRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsPercent: {
    fontSize: 24,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: defaultColors.text,
    marginBottom: 16,
  },
  categoriesCard: {
    padding: 24,
  },
  budgetSummaryCard: {
    padding: 24,
  },
  budgetSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  budgetSummaryItem: {
    flex: 1,
  },
  budgetSummaryLabel: {
    fontSize: 12,
    color: defaultColors.textDim,
    marginBottom: 4,
  },
  budgetSummaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetAtRiskTitle: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.text,
  },
  budgetAtRiskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  budgetAtRiskName: {
    fontSize: 13,
    color: defaultColors.textMuted,
  },
  budgetAtRiskPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  cashflowCard: {
    padding: 24,
  },
  cashflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cashflowRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
  },
  cashflowMonth: {
    flex: 1.4,
    color: defaultColors.text,
  },
  cashflowIncome: {
    flex: 1,
    textAlign: 'right',
    color: defaultColors.success,
    fontSize: 12,
  },
  cashflowExpense: {
    flex: 1,
    textAlign: 'right',
    color: defaultColors.danger,
    fontSize: 12,
  },
  cashflowNet: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
  },
  cashflowDetailTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.text,
  },
  cashflowDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cashflowDetailName: {
    fontSize: 13,
    color: defaultColors.textMuted,
  },
  cashflowDetailAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultColors.text,
  },
  categoryCardAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryCardCount: {
    fontSize: 12,
    color: defaultColors.textDim,
  },
  listCard: {
    padding: 24,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    color: defaultColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 15,
    color: defaultColors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 13,
    color: defaultColors.textDim,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: defaultColors.danger,
  },
  transactionAction: {
    padding: 8,
    marginLeft: 8,
  },
  transactionActionText: {
    fontSize: 16,
  },
  incomeAmounts: {
    alignItems: 'flex-end',
  },
  incomeNet: {
    fontSize: 12,
    color: defaultColors.textDim,
  },
  emptyText: {
    color: defaultColors.textDim,
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionsCard: {
    padding: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: defaultColors.textMuted,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: defaultColors.background,
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: defaultColors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: defaultColors.text,
  },
  modalClose: {
    fontSize: 24,
    color: defaultColors.textMuted,
  },
  modalBody: {
    padding: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: defaultColors.cardBorder,
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 14,
    color: defaultColors.textMuted,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: defaultColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: defaultColors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: defaultColors.text,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSelect: {
    backgroundColor: defaultColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: defaultColors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSelectText: {
    fontSize: 16,
    color: defaultColors.text,
  },
  modalSelectArrow: {
    color: defaultColors.textMuted,
    fontSize: 12,
  },
  modalSelectOptions: {
    backgroundColor: defaultColors.inputBg,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: defaultColors.inputBorder,
    maxHeight: 200,
  },
  modalSelectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.cardBorder,
  },
  modalSelectOptionText: {
    fontSize: 14,
    color: defaultColors.text,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: defaultColors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: defaultColors.danger,
  },
  modalDeleteButtonText: {
    color: defaultColors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryModalStats: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.cardBorder,
  },
  categoryModalTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: defaultColors.text,
  },
  categoryModalCount: {
    fontSize: 14,
    color: defaultColors.textMuted,
    marginTop: 4,
  },
});

export default ModernDashboard;
