import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEME_PRESETS, BACKGROUND_PRESETS } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import MobileFAB from '../components/MobileFAB';
import MonthSelector from '../components/MonthSelector';
import { TableSection } from '../components/ExpandableCategory';
import storage from '../utils/storage';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TITHE_PERCENTAGE_KEY = '@tithe_percentage';

const { width: screenWidth } = Dimensions.get('window');

const PAGE_SIZE = 100;

const fetchAllPages = async (fetchPage, limit = PAGE_SIZE) => {
  const all = [];
  let page = 1;

  while (true) {
    const response = await fetchPage(page, limit);
    const pageData = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
      ? response
      : [];
    const pagination = response?.pagination;

    if (!pagination) {
      return pageData;
    }

    all.push(...pageData);

    if (!pagination.hasMore || pageData.length === 0) {
      break;
    }

    page += 1;
  }

  return all;
};

// Default TableNames if user has no data
const DEFAULT_TABLE_NAMES = ['Rent/Utilities', 'Subscriptions', 'Expenses'];

// Animated card component
const AnimatedCard = ({ children, delay = 0, style, theme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Modal Input Component
const ModalInput = ({ label, value, onChangeText, placeholder, keyboardType, theme, multiline }) => (
  <View style={styles.inputContainer}>
    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          color: theme.text,
        },
        multiline && styles.inputMultiline,
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textDisabled}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
    />
  </View>
);

// Category Select Component
const CategorySelect = ({ value, options, onSelect, theme }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
      <TouchableOpacity
        style={[styles.selectButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[styles.selectButtonText, { color: value ? theme.text : theme.textDisabled }]}>
          {value || 'Select category...'}
        </Text>
        <Text style={{ color: theme.textSecondary }}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={[styles.selectOptions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.selectOption, { borderBottomColor: theme.divider }]}
                onPress={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.selectOptionText, { color: theme.text }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function MobileHomeScreen({ navigation }) {
  const { user } = useAuth();
  const {
    theme,
    isDark,
    toggleTheme,
    colors,
    themePreset,
    backgroundPreset,
    changeThemePreset,
    changeBackgroundPreset,
  } = useTheme();
  const insets = useSafeAreaInsets();

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Month/Date selection
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [customDateRange, setCustomDateRange] = useState(null); // { start, end }

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    TableName: '',
    Description: '',
    Amount: '',
    Date: new Date().toISOString().split('T')[0],
    Notes: '',
    Category: '',
  });

  // Income form
  const [incomeForm, setIncomeForm] = useState({
    Description: '',
    Gross: '',
    Net: '',
    Tithe: '',
    Date: new Date().toISOString().split('T')[0],
  });

  // Tithe percentage
  const [tithePercentage, setTithePercentage] = useState(10);

  useEffect(() => {
    if (user?.UserId) {
      loadAllData();
    }
    loadTithePercentage();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [user?.UserId, selectedMonth]);

  const loadTithePercentage = async () => {
    try {
      const saved = await storage.getItem(TITHE_PERCENTAGE_KEY);
      if (saved) {
        setTithePercentage(parseFloat(saved));
      }
    } catch (error) {
      console.error('Failed to load tithe percentage:', error);
    }
  };

  // Auto-calculate tithe using custom percentage
  useEffect(() => {
    if (incomeForm.Gross) {
      const gross = parseFloat(incomeForm.Gross) || 0;
      const tithe = (gross * (tithePercentage / 100)).toFixed(2);
      setIncomeForm(prev => ({ ...prev, Tithe: tithe }));
    }
  }, [incomeForm.Gross, tithePercentage]);

  const loadAllData = async () => {
    if (!user?.UserId) return;

    try {
      setLoading(true);
      const now = selectedMonth || new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      const [stats, txns, income, cats] = await Promise.all([
        budgetService.getDashboardStats(user.UserId, startDate, endDate).catch(() => null),
        fetchAllPages(
          (page, limit) => budgetService.getTransactions(user.UserId, { startDate, endDate, page, limit }),
          PAGE_SIZE
        ).catch(() => []),
        fetchAllPages(
          (page, limit) => budgetService.getIncome(user.UserId, startDate, endDate, page, limit),
          PAGE_SIZE
        ).catch(() => []),
        budgetService.getUserCategories(user.UserId).catch(() => []),
      ]);

      setDashboardData(stats);
      setTransactions(txns || []);
      setIncomeList(income || []);
      
      // Use categories from database (via groupings)
      setCategories(cats || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Get date range based on selected month or custom range
  const getDateRange = () => {
    if (customDateRange) {
      return customDateRange;
    }
    
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // Last day of month
    
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

  // Get unique TableNames from user's transactions
  const userTableNames = useMemo(() => {
    const tableNames = [...new Set(transactions.map(t => t.TableName).filter(Boolean))];
    return tableNames.length > 0 ? tableNames : DEFAULT_TABLE_NAMES;
  }, [transactions]);

  // Group filtered transactions by TableName
  const transactionsByTable = useMemo(() => {
    const grouped = {};
    
    userTableNames.forEach(tableName => {
      grouped[tableName] = filteredTransactions.filter(t => t.TableName === tableName);
    });
    
    return grouped;
  }, [filteredTransactions, userTableNames]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Calculate totals from FILTERED data
  const totalGross = filteredIncome.reduce((sum, i) => sum + (parseFloat(i.Gross || i.GrossIncome) || 0), 0);
  const totalNet = filteredIncome.reduce((sum, i) => sum + (parseFloat(i.Net || i.NetIncome) || 0), 0);
  const totalExpenses = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
  const netPosition = totalNet - totalExpenses;
  const savingsRate = totalNet > 0 ? ((totalNet - totalExpenses) / totalNet) * 100 : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleMonthChange = (newDate) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomDateRange(null);
    setSelectedMonth(newDate);
  };

  const handleCustomRange = (start, end) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomDateRange({ start, end });
  };

  // Handle Add Expense
  const handleAddExpense = () => {
    setExpenseForm({
      TableName: '',
      Description: '',
      Amount: '',
      Date: new Date().toISOString().split('T')[0],
      Notes: '',
      Category: '',
    });
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.TableName || !expenseForm.Amount) {
      Alert.alert('Required', 'Please enter a category and amount');
      return;
    }

    try {
      setSaving(true);
      const data = {
        UserID: user.UserId,
        Username: user.Username,
        TableName: expenseForm.TableName,
        Description: expenseForm.Description,
        Amount: parseFloat(expenseForm.Amount) || 0,
        Date: expenseForm.Date,
        Notes: expenseForm.Notes,
        Category: expenseForm.Category || expenseForm.TableName,
        Status: 'paid',
      };

      const result = await budgetService.createTransaction(data);
      if (result.success) {
        setShowExpenseModal(false);
        loadAllData();
      } else {
        Alert.alert('Error', 'Failed to save expense');
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      Alert.alert('Error', error.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Income
  const handleAddIncome = () => {
    setIncomeForm({
      Description: '',
      Gross: '',
      Net: '',
      Tithe: '',
      Date: new Date().toISOString().split('T')[0],
    });
    setShowIncomeModal(true);
  };

  const handleSaveIncome = async () => {
    if (!incomeForm.Gross || !incomeForm.Net) {
      Alert.alert('Required', 'Please enter gross and net amounts');
      return;
    }

    try {
      setSaving(true);
      const data = {
        UserID: user.UserId,
        Username: user.Username,
        Description: incomeForm.Description || 'Paycheck',
        Gross: parseFloat(incomeForm.Gross) || 0,
        Net: parseFloat(incomeForm.Net) || 0,
        Tithe: parseFloat(incomeForm.Tithe) || 0,
        Date: incomeForm.Date,
        TitheStatus: 'unpaid',
        PaycheckStatus: 'received',
      };

      const result = await budgetService.createIncome(data);
      if (result.success) {
        setShowIncomeModal(false);
        loadAllData();
      } else {
        Alert.alert('Error', 'Failed to save income');
      }
    } catch (error) {
      console.error('Failed to save income:', error);
      Alert.alert('Error', error.message || 'Failed to save income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background || theme.background }]}>
      {/* Background decorations */}
      <View style={[styles.bgOrb1, { backgroundColor: colors?.primary || theme.primary, opacity: colors?.orbOpacity || (isDark ? 0.08 : 0.06) }]} />
      <View style={[styles.bgOrb2, { backgroundColor: colors?.secondary || theme.secondary, opacity: (colors?.orbOpacity || (isDark ? 0.08 : 0.06)) * 0.75 }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors?.textMuted || theme.textSecondary }]}>{getGreeting()},</Text>
            <Text style={[styles.userName, { color: colors?.text || theme.text }]}>
              {user?.Name || user?.Username || 'User'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors?.inputBg || theme.surface }]}
              onPress={toggleTheme}
            >
              <Text style={styles.headerButtonIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors?.inputBg || theme.surface }]}
              onPress={() => setShowSettingsModal(true)}
            >
              <Text style={styles.headerButtonIcon}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors?.inputBg || theme.surface }]}
              onPress={loadAllData}
            >
              <Text style={styles.headerButtonIcon}>🔄</Text>
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
          <View style={[styles.customRangeBar, { backgroundColor: theme.surface }]}>
            <Text style={[styles.customRangeText, { color: theme.textSecondary }]}>
              Showing: {customDateRange.start} to {customDateRange.end}
            </Text>
            <TouchableOpacity onPress={() => setCustomDateRange(null)}>
              <Text style={[styles.clearRangeText, { color: theme.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Net Position Hero Card */}
        <AnimatedCard delay={0} theme={theme} style={styles.heroCard}>
          <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>NET POSITION</Text>
          <Text
            style={[
              styles.heroValue,
              { color: netPosition >= 0 ? theme.secondary : theme.accent },
            ]}
          >
            {formatCurrency(netPosition)}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textDisabled }]}>Income</Text>
              <Text style={[styles.heroStatValue, { color: theme.secondary }]}>
                {formatCurrency(totalNet)}
              </Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textDisabled }]}>Expenses</Text>
              <Text style={[styles.heroStatValue, { color: theme.accent }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <AnimatedCard delay={100} theme={theme} style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={[styles.statLabel, { color: theme.textDisabled }]}>Gross</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(totalGross)}</Text>
          </AnimatedCard>

          <AnimatedCard delay={150} theme={theme} style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={[styles.statLabel, { color: theme.textDisabled }]}>Savings</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    savingsRate >= 20 ? theme.secondary : savingsRate >= 0 ? theme.warning : theme.accent,
                },
              ]}
            >
              {Math.max(0, savingsRate).toFixed(0)}%
            </Text>
          </AnimatedCard>
        </View>

        {/* Dynamic Expense Sections by TableName */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Spending by Category</Text>
        
        {userTableNames.map((tableName, index) => (
          <TableSection
            key={tableName}
            tableName={tableName}
            transactions={transactionsByTable[tableName] || []}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            theme={theme}
          />
        ))}

        {filteredTransactions.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No expenses this period
            </Text>
          </View>
        )}

        {/* Income Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Income</Text>
        
        <View style={[styles.incomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {filteredIncome.length > 0 ? (
            filteredIncome.map((item, index) => (
              <View
                key={item.IncomeId || index}
                style={[
                  styles.incomeRow,
                  index < filteredIncome.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.divider,
                  },
                ]}
              >
                <View style={[styles.incomeIcon, { backgroundColor: `${theme.secondary}20` }]}>
                  <Text style={styles.incomeIconText}>💵</Text>
                </View>
                <View style={styles.incomeInfo}>
                  <Text style={[styles.incomeDesc, { color: theme.text }]} numberOfLines={1}>
                    {item.Description || item.Paycheck || 'Income'}
                  </Text>
                  <Text style={[styles.incomeMeta, { color: theme.textDisabled }]}>
                    {formatDate(item.Date || item.PaycheckDate)}
                  </Text>
                </View>
                <Text style={[styles.incomeAmount, { color: theme.secondary }]}>
                  +{formatCurrency(item.Net || item.NetIncome)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No income this period
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <AnimatedCard delay={300} theme={theme} style={styles.quickActionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: `${theme.accent}15` }]}
              onPress={handleAddExpense}
            >
              <Text style={styles.quickActionIcon}>💳</Text>
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: `${theme.secondary}15` }]}
              onPress={handleAddIncome}
            >
              <Text style={styles.quickActionIcon}>💵</Text>
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Income</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Spacer for bottom navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <MobileFAB onAddExpense={handleAddExpense} onAddIncome={handleAddIncome} />

      {/* Add Expense Modal */}
      <Modal visible={showExpenseModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <CategorySelect
                value={expenseForm.TableName}
                options={userTableNames}
                onSelect={(val) => setExpenseForm(prev => ({ ...prev, TableName: val }))}
                theme={theme}
              />

              <ModalInput
                label="Description"
                value={expenseForm.Description}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Description: text }))}
                placeholder="What was this for?"
                theme={theme}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Sub-Category (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryChip,
                      { borderColor: theme.border },
                      expenseForm.Category === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setExpenseForm(prev => ({ ...prev, Category: cat }))}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: theme.textSecondary },
                      expenseForm.Category === cat && { color: theme.textOnPrimary }
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ModalInput
                label="Amount"
                value={expenseForm.Amount}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Amount: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                theme={theme}
              />

              <ModalInput
                label="Date"
                value={expenseForm.Date}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Date: text }))}
                placeholder="YYYY-MM-DD"
                theme={theme}
              />

              <ModalInput
                label="Notes (optional)"
                value={expenseForm.Notes}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Notes: text }))}
                placeholder="Additional details..."
                theme={theme}
                multiline
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowExpenseModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveExpense}
                disabled={saving}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnPrimary }]}>
                  {saving ? 'Saving...' : 'Save Expense'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Income Modal */}
      <Modal visible={showIncomeModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Income</Text>
              <TouchableOpacity onPress={() => setShowIncomeModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ModalInput
                label="Description"
                value={incomeForm.Description}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Description: text }))}
                placeholder="e.g., Paycheck, Bonus"
                theme={theme}
              />

              <ModalInput
                label="Gross Amount"
                value={incomeForm.Gross}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Gross: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                theme={theme}
              />

              <ModalInput
                label="Net Amount"
                value={incomeForm.Net}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Net: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                theme={theme}
              />

              <ModalInput
                label={`Tithe (${tithePercentage}% auto-calculated)`}
                value={incomeForm.Tithe}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Tithe: text }))}
                placeholder="Auto-calculated"
                keyboardType="decimal-pad"
                theme={theme}
              />

              <ModalInput
                label="Date"
                value={incomeForm.Date}
                onChangeText={(text) => setIncomeForm(prev => ({ ...prev, Date: text }))}
                placeholder="YYYY-MM-DD"
                theme={theme}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowIncomeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.secondary }]}
                onPress={handleSaveIncome}
                disabled={saving}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnSecondary }]}>
                  {saving ? 'Saving...' : 'Save Income'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors?.modalBg || theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors?.inputBorder || theme.border }]}>
              <Text style={[styles.modalTitle, { color: colors?.text || theme.text }]}>⚙️ Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={[styles.modalClose, { color: colors?.textMuted || theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Dark/Light Mode Toggle */}
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: colors?.text || theme.text }]}>Appearance</Text>
                <TouchableOpacity
                  style={[styles.settingsRow, { backgroundColor: colors?.inputBg || theme.surface }]}
                  onPress={toggleTheme}
                >
                  <Text style={[styles.settingsRowLabel, { color: colors?.text || theme.text }]}>
                    {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </Text>
                  <View style={[styles.toggleSwitch, { backgroundColor: isDark ? (colors?.primary || theme.primary) : (colors?.inputBorder || theme.border) }]}>
                    <View style={[styles.toggleKnob, { transform: [{ translateX: isDark ? 16 : 0 }] }]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Theme Presets */}
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: colors?.text || theme.text }]}>Theme</Text>
                <View style={styles.themeGrid}>
                  {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.themeOption,
                        { borderColor: colors?.inputBorder || theme.border, backgroundColor: colors?.inputBg || theme.surface },
                        themePreset === key && { borderColor: preset.colors.primary, borderWidth: 2 }
                      ]}
                      onPress={() => changeThemePreset(key, user?.UserId)}
                    >
                      <View style={styles.themeColorRow}>
                        <View style={[styles.themeColorDot, { backgroundColor: preset.colors.primary }]} />
                        <View style={[styles.themeColorDot, { backgroundColor: preset.colors.secondary }]} />
                        <View style={[styles.themeColorDot, { backgroundColor: preset.colors.accent }]} />
                      </View>
                      <Text style={[styles.themeOptionText, { color: colors?.text || theme.text }]} numberOfLines={1}>{preset.name}</Text>
                      {themePreset === key && (
                        <Text style={{ color: preset.colors.primary, fontSize: 12 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Background Presets */}
              <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: colors?.text || theme.text }]}>Background</Text>
                <View style={styles.themeGrid}>
                  {Object.entries(BACKGROUND_PRESETS).map(([key, bg]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.themeOption,
                        { borderColor: colors?.inputBorder || theme.border, backgroundColor: colors?.inputBg || theme.surface },
                        backgroundPreset === key && { borderColor: colors?.primary || theme.primary, borderWidth: 2 }
                      ]}
                      onPress={() => changeBackgroundPreset(key, user?.UserId)}
                    >
                      <View style={styles.themeColorRow}>
                        <View style={[styles.themeColorDot, { backgroundColor: bg.dark, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]} />
                        <View style={[styles.themeColorDot, { backgroundColor: bg.light, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' }]} />
                      </View>
                      <Text style={[styles.themeOptionText, { color: colors?.text || theme.text }]} numberOfLines={1}>{bg.name}</Text>
                      {backgroundPreset === key && (
                        <Text style={{ color: colors?.primary || theme.primary, fontSize: 12 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors?.inputBorder || theme.border }]}>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors?.primary || theme.primary }]}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={[styles.modalSaveText, { color: '#fff' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgOrb1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  bgOrb2: {
    position: 'absolute',
    top: 150,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 15,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonIcon: {
    fontSize: 18,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  heroCard: {
    padding: 24,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 20,
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
    height: 36,
    marginHorizontal: 16,
  },
  heroStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  incomeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  incomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeIconText: {
    fontSize: 18,
  },
  incomeInfo: {
    flex: 1,
    marginRight: 12,
  },
  incomeDesc: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  incomeMeta: {
    fontSize: 12,
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActionsCard: {
    padding: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Input styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectButtonText: {
    fontSize: 16,
  },
  selectOptions: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectOptionText: {
    fontSize: 16,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Settings Modal Styles
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  settingsRowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '45%',
    flex: 1,
    gap: 8,
  },
  themeColorRow: {
    flexDirection: 'row',
    gap: 4,
  },
  themeColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
