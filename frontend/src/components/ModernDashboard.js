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
import { budgetService, groupingService } from '../services/apiService';
import { useSmartDefaults } from '../hooks/useSmartDefaults';
import { useCategoryAutocomplete } from '../hooks/useCategoryAutocomplete';
import MonthSelector from './MonthSelector';
import GroupingCard from './GroupingCard';
import { SpendingPieChart } from './charts';

const { width: screenWidth } = Dimensions.get('window');

// Category colors for visual distinction
const categoryColors = ['#00d4aa', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff6b6b', '#a29bfe', '#fd79a8'];

// Background presets - Must be defined before getColors
const BACKGROUND_PRESETS = {
  default: {
    name: 'Default',
    dark: '#0a0f1a',
    light: '#f8fafc',
  },
  midnight: {
    name: 'Midnight Blue',
    dark: '#0d1b2a',
    light: '#e8f1f8',
  },
  charcoal: {
    name: 'Charcoal',
    dark: '#1a1a2e',
    light: '#f5f5f5',
  },
  navy: {
    name: 'Deep Navy',
    dark: '#0a192f',
    light: '#e6eef5',
  },
  graphite: {
    name: 'Graphite',
    dark: '#16161a',
    light: '#fffffe',
  },
};

// Theme-aware color palette
const getColors = (isDark, bgPreset = 'default') => {
  const bg = BACKGROUND_PRESETS[bgPreset] || BACKGROUND_PRESETS.default;
  const background = isDark ? bg.dark : bg.light;
  
  return {
    background,
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
    modalBg: isDark ? bg.dark : '#ffffff',
    orbOpacity: isDark ? 0.05 : 0.08,
  };
};

// Default colors for static styles (dark mode)
const defaultColors = getColors(true);

// Theme presets
const THEME_PRESETS = {
  default: {
    name: 'Default (Emerald)',
    colors: {
      primary: '#00d4aa',
      secondary: '#ff6b6b',
      accent: '#4ecdc4',
      success: '#00d4aa',
      warning: '#ffd93d',
      danger: '#ff6b6b',
      cardBorder: 'rgba(0, 212, 170, 0.4)',
    }
  },
  ocean: {
    name: 'Ocean Blue',
    colors: {
      primary: '#0066FF',
      secondary: '#00B4D8',
      accent: '#90E0EF',
      success: '#00E676',
      warning: '#FFB74D',
      danger: '#FF5252',
      cardBorder: 'rgba(0, 102, 255, 0.4)',
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#FFD93D',
      success: '#6BCB77',
      warning: '#FFE66D',
      danger: '#FF4757',
      cardBorder: 'rgba(255, 107, 53, 0.4)',
    }
  },
  lavender: {
    name: 'Lavender Dreams',
    colors: {
      primary: '#9B59B6',
      secondary: '#E056FD',
      accent: '#A29BFE',
      success: '#00D4AA',
      warning: '#FDCB6E',
      danger: '#E74C3C',
      cardBorder: 'rgba(155, 89, 182, 0.4)',
    }
  },
  forest: {
    name: 'Forest Green',
    colors: {
      primary: '#2ECC71',
      secondary: '#27AE60',
      accent: '#1ABC9C',
      success: '#2ECC71',
      warning: '#F39C12',
      danger: '#E74C3C',
      cardBorder: 'rgba(46, 204, 113, 0.4)',
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#5352ED',
      secondary: '#70A1FF',
      accent: '#7BED9F',
      success: '#2ED573',
      warning: '#FFA502',
      danger: '#FF4757',
      cardBorder: 'rgba(83, 82, 237, 0.4)',
    }
  },
};

// Emoji options for grouping icons
const groupingIconOptions = [
  { emoji: '📁', label: 'Folder' },
  { emoji: '🛒', label: 'Shopping' },
  { emoji: '🍽️', label: 'Dining Out' },
  { emoji: '📺', label: 'TV' },
  { emoji: '🏠', label: 'Home' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '💡', label: 'Utilities' },
  { emoji: '🍔', label: 'Food' },
  { emoji: '🎮', label: 'Games' },
  { emoji: '💊', label: 'Health' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '👕', label: 'Clothes' },
  { emoji: '💰', label: 'Money' },
  { emoji: '🧾', label: 'Receipt' },
  { emoji: '🥑', label: 'Groceries' },
  { emoji: '🔁', label: 'Subscriptions' },
  { emoji: '📦', label: 'Packages' },
  { emoji: '🎧', label: 'Music' },
];

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
          {transaction.Category?.charAt(0)?.toUpperCase() || '💳'}
        </Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDesc, { color: c.text }]} numberOfLines={1}>
          {transaction.Name || 'Transaction'}
        </Text>
        <Text style={[styles.transactionCategory, { color: c.textDim }]}>
          {transaction.Category || 'General'} • {formatDate(transaction.Date || transaction.CreationTime)}
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
        <Text style={styles.categoryCardName}>{category.Category}</Text>
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
  
  // Applied theme colors from settings
  const [appliedThemeColors, setAppliedThemeColors] = useState(null);
  const [selectedBackground, setSelectedBackground] = useState('default');
  
  // Calculate colors - will be updated when selectedBackground changes
  const baseColors = getColors(isDark, selectedBackground);
  const colors = appliedThemeColors ? { ...baseColors, ...appliedThemeColors } : baseColors;
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
  const [groupings, setGroupings] = useState([]);
  const [selectedCashflowMonth, setSelectedCashflowMonth] = useState(null);
  const [selectedGroupingForCategories, setSelectedGroupingForCategories] = useState(null);
  
  // Month/Date selection for filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [customDateRange, setCustomDateRange] = useState(null);
  
  // Modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showManageGroupingModal, setShowManageGroupingModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingGrouping, setEditingGrouping] = useState(null);
  const [groupingNameInput, setGroupingNameInput] = useState('');
  const [groupingIconInput, setGroupingIconInput] = useState('');
  const [selectedGrouping, setSelectedGrouping] = useState(null);
  const [categoryInput, setCategoryInput] = useState('');
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
    Date: today,
    Notes: '',
    Category: '',
    Status: defaultStatusForDate(today)
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Grouping reorder state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderingGroupings, setReorderingGroupings] = useState([]);

  // Add Grouping modal state
  const [showAddGroupingModal, setShowAddGroupingModal] = useState(false);
  const [newGroupingForm, setNewGroupingForm] = useState({
    groupingName: '',
    color: '#00d4aa',
    icon: ''
  });
  const [selectedSpendingGrouping, setSelectedSpendingGrouping] = useState(null); // null = all expenses
  const [expandedGroupings, setExpandedGroupings] = useState([]); // Track which groupings are expanded
  const [draggedTransaction, setDraggedTransaction] = useState(null); // Track dragged transaction
  const [dragOverGrouping, setDragOverGrouping] = useState(null); // Track which grouping is being dragged over
  
  // Income sort and filter state
  const [incomeSortBy, setIncomeSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc
  const [incomeFilterText, setIncomeFilterText] = useState('');
  const [showIncomeSortModal, setShowIncomeSortModal] = useState(false);

  // Chart widget collapsed state
  const [showSpendingChart, setShowSpendingChart] = useState(true);

  // Edit Grouping modal state (using shared editingGrouping from above)
  const [showEditGroupingModal, setShowEditGroupingModal] = useState(false);
  const [editGroupingForm, setEditGroupingForm] = useState({
    groupingName: '',
    color: '#00d4aa',
    icon: ''
  });

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedThemePreset, setSelectedThemePreset] = useState('default');
  const [widgetVisibility, setWidgetVisibility] = useState({
    financialSummary: true,
    topGroupings: true,
    categoriesByGroup: true,
    income: true,
    spending: true,
    expenseGroups: true,
    budgetSummary: true,
    quickActions: true,
  });

  // Category autocomplete suggestions
  const { suggestions: categorySuggestions } = useCategoryAutocomplete(
    transactions,
    selectedGrouping?.GroupingID,
    categoryInput
  );

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('selectedThemePreset');
        const savedVisibility = await AsyncStorage.getItem('widgetVisibility');
        const savedBackground = await AsyncStorage.getItem('selectedBackground');
        
        if (savedTheme) setSelectedThemePreset(savedTheme);
        if (savedVisibility) setWidgetVisibility(JSON.parse(savedVisibility));
        if (savedBackground) setSelectedBackground(savedBackground);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Apply theme preset colors when theme changes
  useEffect(() => {
    if (selectedThemePreset && selectedThemePreset !== 'default' && THEME_PRESETS[selectedThemePreset]) {
      setAppliedThemeColors(THEME_PRESETS[selectedThemePreset].colors);
    } else {
      setAppliedThemeColors(null);
    }
  }, [selectedThemePreset]);

  // Save settings to AsyncStorage when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('selectedThemePreset', selectedThemePreset);
        await AsyncStorage.setItem('widgetVisibility', JSON.stringify(widgetVisibility));
        await AsyncStorage.setItem('selectedBackground', selectedBackground);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };
    saveSettings();
  }, [selectedThemePreset, widgetVisibility, selectedBackground]);

  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [selectedMonth]);

  const loadAllData = async () => {
    if (!user?.UserId) return;
    
    try {
      setLoading(true);
      const now = selectedMonth || new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [stats, txnsResponse, incomeResponse, cats, budgetRows, userGroupings] = await Promise.all([
        budgetService.getDashboardStats(user.UserId).catch(() => null),
        budgetService.getTransactions(user.UserId, {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0],
          page: 1,
          limit: 50
        }).catch(() => ({ data: [], pagination: { total: 0 } })),
        budgetService.getIncome(
          user.UserId,
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0],
          1,
          50
        ).catch(() => ({ data: [], pagination: { total: 0 } })),
        budgetService.getUserCategories(user.UserId).catch(() => []),
        budgetService
          .getBudgets(user.UserId, {
            startDate: startOfMonth.toISOString().split('T')[0],
            endDate: endOfMonth.toISOString().split('T')[0],
          })
          .catch(() => []),
        groupingService.getUserGroupings(user.UserId).catch(() => []),
      ]);

      setDashboardData(stats);
      // Extract data arrays from paginated responses
      setTransactions(txnsResponse?.data || txnsResponse || []);
      setIncomeList(incomeResponse?.data || incomeResponse || []);
      setCategories(cats || []);
      setBudgets(budgetRows || []);
      setGroupings(userGroupings || []);
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
    console.log('📅 Filtering income:', { start, end, totalIncome: incomeList.length });
    
    let filtered = incomeList.filter(i => {
      const date = i.Date || i.PaycheckDate;
      if (!date) {
        console.log('⚠️ Income missing date:', i);
        return false;
      }
      const incDate = date.split('T')[0];
      const included = incDate >= start && incDate <= end;
      if (!included) {
        console.log('❌ Income filtered out:', { incDate, start, end, description: i.Description });
      }
      return included;
    });
    
    // Apply text filter
    if (incomeFilterText.trim()) {
      const search = incomeFilterText.toLowerCase();
      filtered = filtered.filter(i => 
        (i.Description?.toLowerCase().includes(search)) ||
        (i.Notes?.toLowerCase().includes(search))
      );
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      const dateA = a.Date || a.PaycheckDate;
      const dateB = b.Date || b.PaycheckDate;
      
      switch(incomeSortBy) {
        case 'date-asc':
          return new Date(dateA) - new Date(dateB);
        case 'date-desc':
          return new Date(dateB) - new Date(dateA);
        case 'amount-asc':
          return parseFloat(a.NetAmount || 0) - parseFloat(b.NetAmount || 0);
        case 'amount-desc':
          return parseFloat(b.NetAmount || 0) - parseFloat(a.NetAmount || 0);
        default:
          return new Date(dateB) - new Date(dateA);
      }
    });
    
    console.log('✅ Filtered income count:', filtered.length);
    return filtered;
  }, [incomeList, selectedMonth, customDateRange, incomeSortBy, incomeFilterText]);

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
  const totalTitheOwed = filteredIncome.reduce((sum, i) => sum + (parseFloat(i.Tithe) || 0), 0);
  const totalTithePaid = filteredIncome.reduce((sum, i) => {
    if (i.TitheStatus === 'paid') {
      return sum + (parseFloat(i.Tithe) || 0);
    }
    return sum;
  }, 0);
  const totalExpenses = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
  const netPosition = totalNet - totalExpenses;
  const savingsRate = totalNet > 0 ? ((totalNet - totalExpenses) / totalNet) * 100 : 0;

  // Group FILTERED transactions by Category for category totals
  const categoryTotals = filteredTransactions.reduce((acc, txn) => {
    const category = txn.Category || 'Other';
    if (!acc[category]) {
      acc[category] = { Category: category, totalAmount: 0, transactionCount: 0 };
    }
    acc[category].totalAmount += parseFloat(txn.Amount) || 0;
    acc[category].transactionCount += 1;
    return acc;
  }, {});
  
  const categoryList = Object.values(categoryTotals).sort((a, b) => b.totalAmount - a.totalAmount);

  // Top Groupings - spending totals by grouping
  const groupingTotals = filteredTransactions.reduce((acc, txn) => {
    const groupingId = txn.GroupingID;
    if (!groupingId) return acc;
    if (!acc[groupingId]) {
      const grp = groupings.find(g => g.GroupingID === groupingId);
      acc[groupingId] = { 
        GroupingID: groupingId, 
        GroupingName: grp?.GroupingName || 'Unknown', 
        Icon: grp?.Icon || '',
        totalAmount: 0, 
        transactionCount: 0 
      };
    }
    acc[groupingId].totalAmount += parseFloat(txn.Amount) || 0;
    acc[groupingId].transactionCount += 1;
    return acc;
  }, {});
  
  const topGroupingsList = Object.values(groupingTotals).sort((a, b) => b.totalAmount - a.totalAmount);

  // Categories within selected grouping
  const categoriesInSelectedGrouping = selectedGroupingForCategories 
    ? filteredTransactions
        .filter(txn => txn.GroupingID === selectedGroupingForCategories)
        .reduce((acc, txn) => {
          const category = txn.Category || 'Other';
          if (!acc[category]) {
            acc[category] = { Category: category, totalAmount: 0, transactionCount: 0 };
          }
          acc[category].totalAmount += parseFloat(txn.Amount) || 0;
          acc[category].transactionCount += 1;
          return acc;
        }, {})
    : {};
  
  const categoriesInGroupingList = Object.values(categoriesInSelectedGrouping)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  // Filtered category totals by selected grouping for Top Spending widget
  const filteredCategoryTotals = filteredTransactions
    .filter(txn => !selectedSpendingGrouping || txn.GroupingID === selectedSpendingGrouping)
    .reduce((acc, txn) => {
      const category = txn.Category || 'Other';
      if (!acc[category]) {
        acc[category] = { Category: category, totalAmount: 0, transactionCount: 0 };
      }
      acc[category].totalAmount += parseFloat(txn.Amount) || 0;
      acc[category].transactionCount += 1;
      return acc;
    }, {});
  
  const filteredCategoryList = Object.values(filteredCategoryTotals)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

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
      const category = txn.Category || 'Other';
      if (!acc[category]) {
        acc[category] = { Category: category, totalAmount: 0, transactionCount: 0 };
      }
      acc[category].totalAmount += parseFloat(txn.Amount) || 0;
      acc[category].transactionCount += 1;
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

  const handleSaveGroupingName = async () => {
    if (!editingGrouping || !groupingNameInput.trim()) {
      Alert.alert('Error', 'Grouping name is required');
      return;
    }

    try {
      const updatedGrouping = await groupingService.updateGrouping(editingGrouping.GroupingID, {
        userId: user.UserId,
        groupingName: groupingNameInput.trim(),
        color: editingGrouping.Color || '#00d4aa',
        icon: groupingIconInput || editingGrouping.Icon || null
      });

      if (updatedGrouping) {
        setGroupings(prevGroupings =>
          prevGroupings.map(g =>
            g.GroupingID === editingGrouping.GroupingID ? updatedGrouping : g
          )
        );
      }

      setShowManageGroupingModal(false);
      setEditingGrouping(null);
      setGroupingNameInput('');
      setGroupingIconInput('');
      await loadAllData();
    } catch (error) {
      console.error('❌ Edit grouping error:', error);
      Alert.alert('Error', 'Failed to rename grouping: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteGrouping = async () => {
    if (!editingGrouping) return;

    const transactionCount = transactions.filter(t => t.GroupingID === editingGrouping.GroupingID).length;
    const warningMessage = transactionCount > 0
      ? `This grouping has ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}. All transactions will be unlinked but not deleted.\n\nAre you sure you want to delete "${editingGrouping.GroupingName}"?`
      : `Are you sure you want to delete "${editingGrouping.GroupingName}"?`;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(warningMessage)
      : await new Promise((resolve) => {
          Alert.alert(
            'Delete Grouping',
            warningMessage,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

    if (confirmed) {
      try {
        await groupingService.deleteGrouping(editingGrouping.GroupingID, user.UserId);
        setShowManageGroupingModal(false);
        setEditingGrouping(null);
        setGroupingNameInput('');
        setGroupingIconInput('');
        await loadAllData();
      } catch (error) {
        console.error('❌ Delete grouping error:', error);
        Alert.alert('Error', 'Failed to delete grouping: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleSaveExpense = async () => {
    if (!selectedGrouping) {
      Alert.alert('Error', 'No grouping selected');
      return;
    }
    
    console.log('💾 Saving expense:', {
      grouping: selectedGrouping.GroupingName,
      categoryInput,
      description: expenseForm.Description,
      amount: expenseForm.Amount,
      date: expenseForm.Date
    });
    
    try {
      const data = {
        UserID: user.UserId,
        Username: user.Username,
        GroupingID: selectedGrouping.GroupingID,
        Name: expenseForm.Description || 'Transaction', // Transaction name/description
        Amount: parseFloat(expenseForm.Amount) || 0,
        Date: expenseForm.Date,
        Notes: expenseForm.Notes,
        Category: categoryInput || 'General', // Category name
        Status: expenseForm.Status
      };

      console.log('📤 Sending to backend:', data);

      let result;
      if (editingItem?.TransactionId) {
        result = await budgetService.updateTransaction(editingItem.TransactionId, data);
        console.log('✅ Update response:', result);
      } else {
        result = await budgetService.createTransaction(data);
        console.log('✅ Create response:', result);
      }
      
      setShowExpenseModal(false);
      setCategoryInput('');
      setSelectedGrouping(null);
      setEditingItem(null);
      resetExpenseForm();
      await loadAllData();
    } catch (error) {
      console.error('❌ Save expense error:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to save expense: ' + (error.response?.data?.error || error.message));
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
    
    // Find the grouping for this transaction
    const txnGrouping = groupings.find(g => g.GroupingID === transaction.GroupingID);
    if (txnGrouping) {
      setSelectedGrouping(txnGrouping);
    }
    
    setCategoryInput(transaction.Category || '');
    setExpenseForm({
      Description: transaction.Name || '',
      Amount: (transaction.Amount || 0).toString(),
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

  const handleCopyLastMonthIncome = async () => {
    try {
      const result = await budgetService.copyLastMonthIncome(user.UserId);
      if (result.success) {
        Alert.alert('Success', `Copied ${result.count} income records from last month`);
        await loadAllData(); // Reload to show new records
      } else {
        Alert.alert('Error', result.message || 'Failed to copy income');
      }
    } catch (error) {
      console.error('Error copying income:', error);
      Alert.alert('Error', 'Failed to copy income from last month');
    }
  };

  // Get unique category names from database groupings only
  // const allCategories = groupings.map(g => g.GroupingName).sort(); // REMOVED - using grouping cards now

  // Grouping reorder functions
  const startReorderMode = () => {
    setReorderingGroupings([...groupings].sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0)));
    setIsReorderMode(true);
  };

  const cancelReorderMode = () => {
    setReorderingGroupings([]);
    setIsReorderMode(false);
  };

  const moveGrouping = (index, direction) => {
    const newOrder = [...reorderingGroupings];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newOrder.length) return;

    // Swap the items
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setReorderingGroupings(newOrder);
  };

  const saveGroupingOrder = async () => {
    try {
      await groupingService.reorderGroupings(user.UserId, reorderingGroupings);
      setGroupings(reorderingGroupings.map((g, i) => ({ ...g, DisplayOrder: i })));
      setIsReorderMode(false);
      setReorderingGroupings([]);
    } catch (error) {
      console.error('Failed to save grouping order:', error);
      Alert.alert('Error', 'Failed to save grouping order');
    }
  };

  // Handle transaction drag and drop between groupings
  const handleTransactionDrop = async (targetGroupingID) => {
    if (!draggedTransaction || !targetGroupingID) return;
    
    // Don't do anything if dropping on same grouping
    if (draggedTransaction.GroupingID === targetGroupingID) {
      setDraggedTransaction(null);
      setDragOverGrouping(null);
      return;
    }

    try {
      await budgetService.updateTransaction(draggedTransaction.TransactionId, {
        ...draggedTransaction,
        GroupingID: targetGroupingID,
        userId: user.UserId
      });
      setDraggedTransaction(null);
      setDragOverGrouping(null);
      await loadAllData();
    } catch (error) {
      console.error('Failed to move transaction:', error);
      Alert.alert('Error', 'Failed to move transaction to new grouping');
    }
  };

  // Sort groupings by DisplayOrder for display
  const sortedGroupings = useMemo(() => {
    if (isReorderMode) return reorderingGroupings;
    return [...groupings].sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
  }, [groupings, isReorderMode, reorderingGroupings]);

  // Add Grouping handlers
  const openAddGroupingModal = () => {
    setNewGroupingForm({ groupingName: '', color: '#00d4aa', icon: '' });
    setShowAddGroupingModal(true);
  };

  const handleCreateGrouping = async () => {
    if (!newGroupingForm.groupingName.trim()) {
      Alert.alert('Error', 'Please enter a grouping name');
      return;
    }

    try {
      const newGrouping = await groupingService.createGrouping({
        userId: user.UserId,
        groupingName: newGroupingForm.groupingName.trim(),
        displayOrder: groupings.length, // Add to end
        color: newGroupingForm.color,
        icon: newGroupingForm.icon || null
      });

      setGroupings([...groupings, newGrouping]);
      setShowAddGroupingModal(false);
      setNewGroupingForm({ groupingName: '', color: '#00d4aa', icon: '' });
    } catch (error) {
      console.error('Failed to create grouping:', error);
      Alert.alert('Error', 'Failed to create grouping');
    }
  };

  // Edit Grouping handlers
  const openEditGroupingModal = (grouping) => {
    setEditingGrouping(grouping);
    setEditGroupingForm({
      groupingName: grouping.GroupingName,
      color: grouping.Color || '#00d4aa',
      icon: grouping.Icon || ''
    });
    setShowEditGroupingModal(true);
  };

  const handleUpdateGrouping = async () => {
    if (!editGroupingForm.groupingName.trim()) {
      Alert.alert('Error', 'Please enter a grouping name');
      return;
    }

    console.log('🎨 Updating grouping with form:', editGroupingForm);
    console.log('🎨 Icon value being sent:', editGroupingForm.icon);

    try {
      const updatedGrouping = await groupingService.updateGrouping(editingGrouping.GroupingID, {
        userId: user.UserId,
        groupingName: editGroupingForm.groupingName.trim(),
        color: editGroupingForm.color,
        icon: editGroupingForm.icon || null
      });

      setGroupings(groupings.map(g =>
        g.GroupingID === editingGrouping.GroupingID ? updatedGrouping : g
      ));
      setShowEditGroupingModal(false);
      setEditingGrouping(null);
    } catch (error) {
      console.error('Failed to update grouping:', error);
      Alert.alert('Error', 'Failed to update grouping');
    }
  };

  // Filtered transactions for category modal
  const categoryTransactions = selectedCategory 
    ? transactions.filter(t => t.Category === selectedCategory.Category)
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
            <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.inputBg }]} onPress={() => setShowSettingsModal(true)}>
              <Text style={styles.refreshButtonText}>⚙️</Text>
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

        {/* Consolidated Financial Summary */}
        {widgetVisibility.financialSummary && (
        <AnimatedCard delay={0} cardStyle={dynamicStyles.card} style={styles.financialSummaryCard}>
          <View style={styles.financialSummaryRow}>
            {/* Net Position - Main Focus */}
            <View style={styles.netPositionSection}>
              <Text style={[styles.netPositionLabel, { color: colors.textMuted }]}>NET POSITION</Text>
              <Text style={[styles.netPositionValue, { color: netPosition >= 0 ? colors.success : colors.danger }]}>
                {formatCurrency(netPosition)}
              </Text>
            </View>
            {/* Divider */}
            <View style={[styles.summaryDivider, { backgroundColor: colors.cardBorder }]} />
            {/* Stats Grid - Order: Gross | Net | Tithe Owed | Tithe Paid | Expenses | Savings */}
            <View style={styles.statsGridCompact}>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statLabelCompact, { color: colors.textDim }]}>Gross</Text>
                <Text style={[styles.statValueCompact, { color: colors.text }]}>{formatCurrency(totalGross)}</Text>
              </View>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statLabelCompact, { color: colors.textDim }]}>Net</Text>
                <Text style={[styles.statValueCompact, { color: colors.success }]}>{formatCurrency(totalNet)}</Text>
              </View>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statLabelCompact, { color: colors.textDim }]}>Tithe Owed</Text>
                <Text style={[styles.statValueCompact, { color: colors.accent }]}>{formatCurrency(totalTitheOwed)}</Text>
              </View>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statLabelCompact, { color: colors.textDim }]}>Tithe Paid</Text>
                <Text style={[styles.statValueCompact, { color: colors.success }]}>{formatCurrency(totalTithePaid)}</Text>
              </View>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statLabelCompact, { color: colors.textDim }]}>Expenses</Text>
                <Text style={[styles.statValueCompact, { color: colors.danger }]}>{formatCurrency(totalExpenses)}</Text>
              </View>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statLabelCompact, { color: colors.textDim }]}>Savings</Text>
                <Text style={[styles.statValueCompact, { color: savingsRate >= 20 ? colors.success : savingsRate >= 10 ? colors.warning : colors.danger }]}>
                  {Math.max(0, savingsRate).toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </AnimatedCard>
        )}

        {/* Main Widget Grid - New Layout: Left column (groupings, categories, income) + Right column (spending) */}
        <View style={styles.mainWidgetGrid}>
          {/* Left Column */}
          <View style={styles.leftWidgetColumn}>
            {/* Top Row: Groupings + Categories */}
            <View style={styles.smallWidgetRow}>
              {/* Top Groupings */}
              {widgetVisibility.topGroupings && topGroupingsList.length > 0 && (
                <AnimatedCard delay={130} cardStyle={dynamicStyles.card} style={styles.quarterWidgetCard}>
                  <Text style={[styles.compactWidgetTitle, { color: colors.text }]}>📁 Top Groupings</Text>
                  {topGroupingsList.slice(0, 4).map((grp) => (
                    <View key={grp.GroupingID} style={styles.compactRowTight}>
                      <Text style={[styles.compactLabelSmall, { color: colors.textMuted }]} numberOfLines={1}>
                        {grp.Icon ? `${grp.Icon} ` : ''}{grp.GroupingName}
                      </Text>
                      <Text style={[styles.compactValueSmall, { color: colors.danger }]}>
                        {formatCurrency(grp.totalAmount)}
                      </Text>
                    </View>
                  ))}
                </AnimatedCard>
              )}

              {/* Categories by Group */}
              {widgetVisibility.categoriesByGroup && (
                <AnimatedCard delay={140} cardStyle={dynamicStyles.card} style={styles.quarterWidgetCard}>
                  <View style={styles.inlineTitleRow}>
                    <Text style={[styles.compactWidgetTitle, { color: colors.text }]}>📊</Text>
                    <TouchableOpacity
                      style={[styles.inlineDropdown, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                      onPress={() => {
                        if (!selectedGroupingForCategories && groupings.length > 0) {
                          setSelectedGroupingForCategories(groupings[0].GroupingID);
                        } else if (selectedGroupingForCategories) {
                          const currentIndex = groupings.findIndex(g => g.GroupingID === selectedGroupingForCategories);
                          const nextIndex = (currentIndex + 1) % groupings.length;
                          setSelectedGroupingForCategories(groupings[nextIndex].GroupingID);
                        }
                      }}
                    >
                      <Text style={[styles.inlineDropdownText, { color: colors.text }]} numberOfLines={1}>
                        {selectedGroupingForCategories 
                          ? groupings.find(g => g.GroupingID === selectedGroupingForCategories)?.GroupingName || 'Select'
                          : 'Select group'}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>▼</Text>
                    </TouchableOpacity>
                  </View>
                  {categoriesInGroupingList.length > 0 ? (
                    categoriesInGroupingList.slice(0, 4).map((cat) => (
                      <View key={cat.Category} style={styles.compactRowTight}>
                        <Text style={[styles.compactLabelSmall, { color: colors.textMuted }]} numberOfLines={1}>{cat.Category}</Text>
                        <Text style={[styles.compactValueSmall, { color: colors.danger }]}>
                          {formatCurrency(cat.totalAmount)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textDim, fontSize: 10 }]}>
                      {selectedGroupingForCategories ? 'No transactions' : 'Tap to select'}
                    </Text>
                  )}
                </AnimatedCard>
              )}
            </View>

            {/* Income Widget */}
            {widgetVisibility.income && (
              <AnimatedCard delay={145} cardStyle={dynamicStyles.card} style={styles.incomeWidgetFull}>
                <View style={styles.listHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>💵 Income</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={handleCopyLastMonthIncome}>
                      <Text style={[styles.addButton, { fontSize: 11 }]}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { resetIncomeForm(); setShowIncomeModal(true); }}>
                      <Text style={[styles.addButton, { fontSize: 11 }]}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {filteredIncome.length > 0 ? (
                  <View style={styles.incomeListFlex}>
                    {filteredIncome.map((income, index) => (
                      <IncomeRow key={income.IncomeId || index} income={income} onEdit={openEditIncome} colors={colors} />
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textDim }]}>No income recorded yet</Text>
                )}
              </AnimatedCard>
            )}
          </View>

          {/* Right Column - Spending Chart */}
          {widgetVisibility.spending && categoryList.length > 0 && (
            <AnimatedCard delay={150} cardStyle={dynamicStyles.card} style={styles.spendingWidgetTall}>
              <TouchableOpacity 
                style={styles.chartHeader} 
                onPress={() => setShowSpendingChart(!showSpendingChart)}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Spending</Text>
                <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
                  {showSpendingChart ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              
              {showSpendingChart && (
                <View style={styles.chartContentCentered}>
                  <SpendingPieChart 
                    data={categoryList.slice(0, 5).map(cat => ({
                      category: cat.Category,
                      totalAmount: cat.totalAmount,
                    }))}
                    title=""
                  />
                </View>
              )}
            </AnimatedCard>
          )}
        </View>

        {/* Expense Grouping Cards - Two Column Grid */}
        {widgetVisibility.expenseGroups && Array.isArray(groupings) && groupings.length > 0 && (
          <>
            {/* Reorder Header */}
            <View style={styles.groupingsHeader}>
              <Text style={[styles.groupingsTitle, { color: colors.text }]}>Expense Groups</Text>
              {isReorderMode ? (
                <View style={styles.reorderButtons}>
                  <TouchableOpacity
                    style={[styles.reorderButton, styles.cancelButton]}
                    onPress={cancelReorderMode}
                  >
                    <Text style={styles.reorderButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderButton, styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={saveGroupingOrder}
                  >
                    <Text style={[styles.reorderButtonText, { color: '#000' }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.editOrderButton, { borderColor: colors.cardBorder }]}
                  onPress={startReorderMode}
                >
                  <Text style={[styles.editOrderText, { color: colors.textMuted }]}>Reorder</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Groupings Grid or Reorder List */}
            {isReorderMode ? (
              <View style={styles.reorderList}>
                {sortedGroupings.map((grouping, index) => (
                  <View key={grouping.GroupingID} style={[styles.reorderItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <View style={styles.reorderItemContent}>
                      <Text style={styles.reorderIcon}>
                        {(grouping.Icon && grouping.Icon.trim()) ? grouping.Icon : '📁'}
                      </Text>
                      <Text style={[styles.reorderName, { color: colors.text }]}>{grouping.GroupingName}</Text>
                    </View>
                    <View style={styles.reorderArrows}>
                      <TouchableOpacity
                        style={[styles.arrowButton, index === 0 && styles.arrowDisabled]}
                        onPress={() => moveGrouping(index, -1)}
                        disabled={index === 0}
                      >
                        <Text style={[styles.arrowText, { color: index === 0 ? colors.textDim : colors.text }]}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.arrowButton, index === sortedGroupings.length - 1 && styles.arrowDisabled]}
                        onPress={() => moveGrouping(index, 1)}
                        disabled={index === sortedGroupings.length - 1}
                      >
                        <Text style={[styles.arrowText, { color: index === sortedGroupings.length - 1 ? colors.textDim : colors.text }]}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.groupingsGrid}>
                {sortedGroupings.map((grouping, index) => {
                  const isExpanded = expandedGroupings.includes(grouping.GroupingID);
                  return (
                    <AnimatedCard 
                      key={grouping.GroupingID} 
                      delay={150 + (index * 30)} 
                      cardStyle={dynamicStyles.card} 
                      style={isExpanded ? styles.groupingFullCard : styles.groupingHalfCard}
                    >
                      <GroupingCard
                        grouping={grouping}
                        transactions={transactions}
                        colors={colors}
                        isExpanded={isExpanded}
                        isDragOver={dragOverGrouping === grouping.GroupingID}
                        onTransactionDragStart={(txn) => {
                          setDraggedTransaction(txn);
                        }}
                        onDragEnter={(groupingId) => {
                          setDragOverGrouping(groupingId);
                        }}
                        onDragLeave={() => {
                          setDragOverGrouping(null);
                        }}
                        onTransactionDrop={handleTransactionDrop}
                        onToggleExpand={(id) => {
                          setExpandedGroupings(prev => 
                            prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
                          );
                        }}
                        onAddExpense={(grp) => {
                          setSelectedGrouping(grp);
                          resetExpenseForm();
                          setShowExpenseModal(true);
                        }}
                        onEditTransaction={openEditExpense}
                        onEditGrouping={(grouping) => {
                          setEditingGrouping(grouping);
                          setGroupingNameInput(grouping.GroupingName);
                          setGroupingIconInput(grouping.Icon || '');
                          setShowManageGroupingModal(true);
                        }}
                      />
                    </AnimatedCard>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Add Grouping Card */}
        <AnimatedCard delay={250} cardStyle={dynamicStyles.card} style={styles.addGroupingCard}>
          <TouchableOpacity
            style={styles.addGroupingButton}
            onPress={openAddGroupingModal}
          >
            <Text style={styles.addGroupingIcon}>+</Text>
            <Text style={[styles.addGroupingText, { color: colors.textMuted }]}>Add Grouping</Text>
          </TouchableOpacity>
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

        {/* Quick Actions */}
        {widgetVisibility.quickActions && (
        <AnimatedCard delay={400} cardStyle={dynamicStyles.card} style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => { resetIncomeForm(); setShowIncomeModal(true); }}
            >
              <Text style={styles.actionIcon}>💵</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (groupings.length > 0) {
                  setSelectedGrouping(groupings[0]);
                  resetExpenseForm();
                  setShowExpenseModal(true);
                } else {
                  Alert.alert('No Groups', 'Please create an expense group first');
                }
              }}
            >
              <Text style={styles.actionIcon}>💸</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={loadAllData}>
              <Text style={styles.actionIcon}>🔄</Text>
              <Text style={[styles.actionLabel, { color: colors.textMuted }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>
        )}

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

      {/* Manage Grouping Modal */}
      <Modal visible={showManageGroupingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Grouping</Text>
              <TouchableOpacity onPress={() => {
                setShowManageGroupingModal(false);
                setEditingGrouping(null);
                setGroupingNameInput('');
                setGroupingIconInput('');
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Rename Input */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Grouping Name</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.input]}
                  value={groupingNameInput}
                  onChangeText={setGroupingNameInput}
                  placeholder="Enter new name..."
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>

              {/* Icon Picker */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Icon</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  Choose an emoji to show with this group
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.iconGrid}>
                    {groupingIconOptions.map((option) => {
                      const isSelected = (groupingIconInput || editingGrouping?.Icon || '') === option.emoji;
                      return (
                        <TouchableOpacity
                          key={option.emoji}
                          style={[
                            styles.iconOption,
                            { borderColor: colors.cardBorder },
                            isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(0, 212, 170, 0.1)' }
                          ]}
                          onPress={() => setGroupingIconInput(prev => prev === option.emoji ? '' : option.emoji)}
                        >
                          <Text style={styles.iconEmoji}>{option.emoji}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Transaction Count Info */}
              {editingGrouping && (
                <Text style={[styles.infoText, { color: colors.textMuted, marginTop: 8 }]}>
                  {transactions.filter(t => t.GroupingID === editingGrouping.GroupingID).length} transactions in this grouping
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalDeleteButton, { flex: 1 }]}
                onPress={handleDeleteGrouping}
              >
                <Text style={styles.modalDeleteButtonText}>Delete Grouping</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { flex: 1 }]}
                onPress={handleSaveGroupingName}
              >
                <Text style={styles.modalSaveButtonText}>Save Changes</Text>
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
              <TouchableOpacity onPress={() => { setShowExpenseModal(false); setCategoryInput(''); setSelectedGrouping(null); setEditingItem(null); resetExpenseForm(); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Grouping Selector - allows changing grouping */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Expense Group</Text>
                <View style={styles.groupingSelectorGrid}>
                  {groupings.map((grp) => (
                    <TouchableOpacity
                      key={grp.GroupingID}
                      style={[
                        styles.groupingSelectorItem,
                        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                        selectedGrouping?.GroupingID === grp.GroupingID && { borderColor: colors.primary, backgroundColor: 'rgba(0, 212, 170, 0.1)' }
                      ]}
                      onPress={() => setSelectedGrouping(grp)}
                    >
                      <Text style={styles.groupingSelectorIcon}>
                        {(grp.Icon && grp.Icon.trim()) ? grp.Icon : '📁'}
                      </Text>
                      <Text style={[styles.groupingSelectorText, { color: colors.text }]} numberOfLines={1}>
                        {grp.GroupingName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Category Input with Autocomplete */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Category</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.input]}
                  value={categoryInput}
                  onChangeText={setCategoryInput}
                  placeholder="e.g., Utilities, Groceries, Gas"
                  placeholderTextColor={colors.textMuted}
                />
                {/* Autocomplete Suggestions */}
                {categorySuggestions.length > 0 && categoryInput.length > 0 && !categorySuggestions.includes(categoryInput) && (
                  <View style={[styles.suggestionsList, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    {categorySuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.suggestionItem, { borderBottomColor: colors.inputBorder }]}
                        onPress={() => setCategoryInput(suggestion)}
                      >
                        <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <ModalInput
                label="Name"
                value={expenseForm.Description}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, Description: text }))}
                placeholder="e.g., Trash and Water, Electric Bill"
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
                {selectedCategory?.Category || 'Category'}
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
                  // Category is already set in the form
                  setShowExpenseModal(true);
                }}
              >
                <Text style={styles.modalSaveButtonText}>+ Add to {selectedCategory?.Category}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Grouping Modal */}
      <Modal visible={showAddGroupingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Expense Group</Text>
              <TouchableOpacity onPress={() => setShowAddGroupingModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Grouping Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Group Name</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.input]}
                  value={newGroupingForm.groupingName}
                  onChangeText={(text) => setNewGroupingForm(prev => ({ ...prev, groupingName: text }))}
                  placeholder="e.g., Groceries, Entertainment, Bills"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>

              {/* Icon Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Choose an Icon (Optional)</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  Scroll horizontally to see all emoji options
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.iconGrid}>
                    {groupingIconOptions.map((option) => {
                      const isSelected = newGroupingForm.icon === option.emoji;
                      return (
                        <TouchableOpacity
                          key={option.emoji}
                          style={[
                            styles.iconOption,
                            { borderColor: colors.cardBorder },
                            isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(0, 212, 170, 0.1)' }
                          ]}
                          onPress={() => setNewGroupingForm(prev => ({ ...prev, icon: isSelected ? '' : option.emoji }))}
                        >
                          <Text style={styles.iconEmoji}>{option.emoji}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Color Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Color</Text>
                <View style={styles.colorGrid}>
                  {['#00d4aa', '#4ecdc4', '#45b7d1', '#667eea', '#a29bfe', '#fd79a8', '#ff6b6b', '#ffd93d', '#95E1D3', '#FFDEE9'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newGroupingForm.color === color && styles.colorOptionSelected
                      ]}
                      onPress={() => setNewGroupingForm(prev => ({ ...prev, color }))}
                    >
                      {newGroupingForm.color === color && <Text style={styles.colorCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.cardBorder }]}
                onPress={() => setShowAddGroupingModal(false)}
              >
                <Text style={[styles.modalCancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateGrouping}
              >
                <Text style={styles.modalSaveButtonText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Grouping Modal */}
      <Modal visible={showEditGroupingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Group</Text>
              <TouchableOpacity onPress={() => setShowEditGroupingModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Grouping Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Group Name</Text>
                <TextInput
                  style={[styles.modalInput, dynamicStyles.input]}
                  value={editGroupingForm.groupingName}
                  onChangeText={(text) => setEditGroupingForm(prev => ({ ...prev, groupingName: text }))}
                  placeholder="Group name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Icon Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Choose an Icon (Optional)</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  Scroll horizontally to see all emoji options
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.iconGrid}>
                    {groupingIconOptions.map((option) => {
                      const isSelected = editGroupingForm.icon === option.emoji;
                      return (
                        <TouchableOpacity
                          key={option.emoji}
                          style={[
                            styles.iconOption,
                            { borderColor: colors.cardBorder },
                            isSelected && { borderColor: colors.primary, backgroundColor: 'rgba(0, 212, 170, 0.1)' }
                          ]}
                          onPress={() => setEditGroupingForm(prev => ({ ...prev, icon: isSelected ? '' : option.emoji }))}
                        >
                          <Text style={styles.iconEmoji}>{option.emoji}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Color Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Color</Text>
                <View style={styles.colorGrid}>
                  {['#00d4aa', '#4ecdc4', '#45b7d1', '#667eea', '#a29bfe', '#fd79a8', '#ff6b6b', '#ffd93d', '#95E1D3', '#FFDEE9'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        editGroupingForm.color === color && styles.colorOptionSelected
                      ]}
                      onPress={() => setEditGroupingForm(prev => ({ ...prev, color }))}
                    >
                      {editGroupingForm.color === color && <Text style={styles.colorCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Delete Button */}
              <View style={[styles.fieldGroup, { marginTop: 20 }]}>
                <TouchableOpacity
                  style={[styles.deleteGroupButton, { borderColor: colors.danger || '#ff6b6b' }]}
                  onPress={handleDeleteGrouping}
                >
                  <Text style={[styles.deleteGroupButtonText, { color: colors.danger || '#ff6b6b' }]}>
                    Delete Group
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: colors.cardBorder }]}
                onPress={() => setShowEditGroupingModal(false)}
              >
                <Text style={[styles.modalCancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
                onPress={handleUpdateGrouping}
              >
                <Text style={styles.modalSaveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Income Sort Modal */}
      <Modal
        visible={showIncomeSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowIncomeSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowIncomeSortModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sortModal, styles.solidModalBg, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.sortModalTitle, { color: colors.text }]}>Sort By</Text>
              {[
                { value: 'date-desc', label: 'Date (Newest First)' },
                { value: 'date-asc', label: 'Date (Oldest First)' },
                { value: 'amount-desc', label: 'Amount (Highest First)' },
                { value: 'amount-asc', label: 'Amount (Lowest First)' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.sortOption, incomeSortBy === option.value && { backgroundColor: colors.inputBg }]}
                  onPress={() => {
                    setIncomeSortBy(option.value);
                    setShowIncomeSortModal(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, { color: incomeSortBy === option.value ? colors.primary : colors.text }]}>
                    {option.label}
                  </Text>
                  {incomeSortBy === option.value && <Text style={{ color: colors.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalBg, { borderColor: colors.cardBorder, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>⚙️ Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Theme Selection */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Theme</Text>
                <View style={styles.themeGrid}>
                  {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.themeOption,
                        { borderColor: colors.cardBorder, backgroundColor: colors.inputBg },
                        selectedThemePreset === key && { borderColor: preset.colors.primary, borderWidth: 2 }
                      ]}
                      onPress={() => setSelectedThemePreset(key)}
                    >
                      <View style={styles.themeColorRow}>
                        <View style={[styles.themeColorDot, { backgroundColor: preset.colors.primary }]} />
                        <View style={[styles.themeColorDot, { backgroundColor: preset.colors.secondary }]} />
                        <View style={[styles.themeColorDot, { backgroundColor: preset.colors.accent }]} />
                      </View>
                      <Text style={[styles.themeOptionText, { color: colors.text }]}>{preset.name}</Text>
                      {selectedThemePreset === key && (
                        <Text style={{ color: preset.colors.primary, fontSize: 12 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Background Selection */}
              <View style={[styles.fieldGroup, { marginTop: 16 }]}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Background</Text>
                <View style={styles.themeGrid}>
                  {Object.entries(BACKGROUND_PRESETS).map(([key, bg]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.themeOption,
                        { borderColor: colors.cardBorder, backgroundColor: colors.inputBg },
                        selectedBackground === key && { borderColor: colors.primary, borderWidth: 2 }
                      ]}
                      onPress={() => setSelectedBackground(key)}
                    >
                      <View style={styles.themeColorRow}>
                        <View style={[styles.themeColorDot, { backgroundColor: bg.dark, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]} />
                        <View style={[styles.themeColorDot, { backgroundColor: bg.light, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' }]} />
                      </View>
                      <Text style={[styles.themeOptionText, { color: colors.text }]}>{bg.name}</Text>
                      {selectedBackground === key && (
                        <Text style={{ color: colors.primary, fontSize: 12 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Widget Visibility */}
              <View style={[styles.fieldGroup, { marginTop: 16 }]}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Dashboard Widgets</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
                  Toggle which widgets appear on your dashboard
                </Text>
                
                {[
                  { key: 'financialSummary', label: '💰 Financial Summary', desc: 'Net position, income, expenses' },
                  { key: 'topGroupings', label: '📁 Top Groupings', desc: 'Spending by expense group' },
                  { key: 'categoriesByGroup', label: '📊 Categories by Group', desc: 'Category breakdown' },
                  { key: 'income', label: '💵 Income', desc: 'Income entries' },
                  { key: 'spending', label: '📊 Spending Chart', desc: 'Pie chart of expenses' },
                  { key: 'expenseGroups', label: '📂 Expense Groups', desc: 'Group cards with transactions' },
                  { key: 'budgetSummary', label: '📈 Budget Summary', desc: 'Budget vs actual' },
                  { key: 'quickActions', label: '⚡ Quick Actions', desc: 'Add income/expense buttons' },
                ].map(widget => (
                  <TouchableOpacity
                    key={widget.key}
                    style={[
                      styles.widgetToggleRow,
                      { borderColor: colors.cardBorder, backgroundColor: colors.inputBg }
                    ]}
                    onPress={() => setWidgetVisibility(prev => ({ ...prev, [widget.key]: !prev[widget.key] }))}
                  >
                    <View style={styles.widgetToggleInfo}>
                      <Text style={[styles.widgetToggleLabel, { color: colors.text }]}>{widget.label}</Text>
                      <Text style={[styles.widgetToggleDesc, { color: colors.textMuted }]}>{widget.desc}</Text>
                    </View>
                    <View style={[
                      styles.toggleSwitch,
                      { backgroundColor: widgetVisibility[widget.key] ? colors.primary : colors.cardBorder }
                    ]}>
                      <View style={[
                        styles.toggleKnob,
                        { transform: [{ translateX: widgetVisibility[widget.key] ? 16 : 0 }] }
                      ]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.modalSaveButtonText}>Done</Text>
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
    maxWidth: Platform.OS === 'web' ? 1400 : '100%',
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
  sectionMainTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  groupingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  groupingsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  editOrderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  editOrderText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reorderButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  saveButton: {
    backgroundColor: defaultColors.primary,
  },
  reorderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  reorderList: {
    marginBottom: 16,
  },
  reorderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  reorderItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reorderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reorderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reorderArrows: {
    flexDirection: 'row',
    gap: 4,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  groupingHalfCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  groupingFullCard: {
    width: '98%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  addGroupingCard: {
    marginBottom: 24,
    padding: 0,
    overflow: 'hidden',
  },
  addGroupingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  addGroupingIcon: {
    fontSize: 28,
    color: defaultColors.primary,
  },
  addGroupingText: {
    fontSize: 16,
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
  // New consolidated financial summary styles
  financialSummaryCard: {
    padding: 16,
  },
  financialSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  netPositionSection: {
    alignItems: 'center',
    paddingRight: 16,
  },
  netPositionLabel: {
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: '600',
  },
  netPositionValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 50,
  },
  statsGridCompact: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  statItemCompact: {
    minWidth: '30%',
    alignItems: 'center',
  },
  statLabelCompact: {
    fontSize: 9,
    marginBottom: 2,
  },
  statValueCompact: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact widget cards
  compactWidgetCard: {
    flex: 1,
    padding: 12,
    minWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
  },
  compactWidgetTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  compactRowTight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  compactLabelSmall: {
    fontSize: 11,
    flex: 1,
  },
  compactValueSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  inlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inlineDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  inlineDropdownText: {
    fontSize: 10,
    flex: 1,
  },
  // Grouping selector in expense modal
  groupingSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  groupingSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  groupingSelectorIcon: {
    fontSize: 16,
  },
  groupingSelectorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Income widget styles
  incomeWidgetCard: {
    flex: 1,
    padding: 12,
    minWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
  },
  incomeListFlex: {
    // No max height - show all items
  },
  // Spending widget styles
  spendingWidgetCard: {
    flex: 1,
    padding: 12,
    minWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
    overflow: 'hidden',
  },
  chartContentCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.85 }],
  },
  heroCardCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
  },
  heroRowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMainValue: {
    flex: 1,
  },
  heroStatsHorizontal: {
    flexDirection: 'row',
    gap: 16,
  },
  heroStatCompact: {
    alignItems: 'flex-end',
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
  statsRowCompact: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardTiny: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  statIconSmall: {
    fontSize: 20,
    marginBottom: 4,
  },
  statTitleSmall: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: '700',
  },
  savingsPercentSmall: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  halfWidthRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  halfWidthCard: {
    flex: 1,
    padding: 16,
    minWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
  },
  halfWidthCardTall: {
    flex: 1,
    padding: 16,
    minWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
    minHeight: 300,
    overflow: 'hidden',
  },
  groupingDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupingDropdownText: {
    fontSize: 12,
    flex: 1,
  },
  incomeListCompact: {
    maxHeight: 220,
    overflow: 'scroll',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  statCardSmall: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 'calc(50% - 8px)' : '48%',
    padding: 16,
  },
  statCardCompact: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 11,
    color: defaultColors.textDim,
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  compactLabel: {
    fontSize: 12,
    flex: 1,
  },
  compactValue: {
    fontSize: 13,
    fontWeight: '600',
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
  chartCard: {
    padding: 20,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContent: {
    marginTop: 8,
  },
  chartFootnote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
    padding: 16,
    width: '48%',
    minHeight: 400,
    alignSelf: 'flex-start',
  },
  incomeList: {
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  incomeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  incomeSortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  incomeSortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  incomeSortLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  solidModalBg: {
    backgroundColor: '#1a1a1a',
    opacity: 1,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sortOptionText: {
    fontSize: 14,
  },
  addButton: {
    color: defaultColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonArrow: {
    fontSize: 10,
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
    backgroundColor: '#1a1f2e', // Solid dark background instead of transparent
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: defaultColors.inputBorder,
    maxHeight: 200,
    zIndex: 1000,
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
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconGrid: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingBottom: 10,
  },
  iconOption: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconEmoji: {
    fontSize: 32,
    fontFamily: Platform.OS === 'web' ? '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif' : undefined,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorCheck: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
    textAlign: 'center',
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
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
  // Groupings Section Styles
  groupingsSection: {
    marginBottom: 24,
    marginLeft: Platform.OS === 'web' ? -20 : 0,
    marginRight: Platform.OS === 'web' ? -20 : 0,
  },
  groupingsScroll: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingVertical: 8,
  },
  // Grouping Badge in Modal
  groupingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  groupingIcon: {
    fontSize: 20,
  },
  groupingBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Category Autocomplete Styles
  fieldGroup: {
    marginBottom: 16,
  },
  suggestionsList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
  },
  // Main Widget Grid Layout
  mainWidgetGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  leftWidgetColumn: {
    flex: 1.2,
    gap: 16,
  },
  rightColumn: {
    flex: 1,
  },
  smallWidgetRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quarterWidgetCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    minHeight: 200,
    maxHeight: 400,
    overflow: 'hidden',
  },
  incomeWidgetFull: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    maxHeight: 450,
    overflow: 'hidden',
  },
  spendingWidgetTall: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    minHeight: 350,
  },
  // Settings Modal Styles
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  themeOptionSelected: {
    borderWidth: 2,
  },
  themeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  themeColorPreview: {
    flexDirection: 'row',
    gap: 4,
  },
  themeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  visibilityToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    fontSize: 14,
    fontWeight: '700',
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  colorPickerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  colorPickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorPickerSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
  },
  colorPickerInput: {
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 80,
  },
  // Theme Grid Styles
  themeGrid: {
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  themeColorRow: {
    flexDirection: 'row',
    gap: 4,
  },
  themeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  // Widget Toggle Styles
  widgetToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  widgetToggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  widgetToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  widgetToggleDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
});

export default ModernDashboard;


