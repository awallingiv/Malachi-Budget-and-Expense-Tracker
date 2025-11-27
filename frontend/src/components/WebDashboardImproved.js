import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService, categoryService } from '../services/apiService';
import DraggableWindow from './DraggableWindowClean';
import TransactionForm from './TransactionForm';
import IncomeForm from './IncomeForm';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mock user for now
const mockUser = {
  UserId: '41F580FD-54B5-4167-A145-0266EDDF487B',
  Username: 'awallingiv',
  Name: 'A. Walling'
};

const WebDashboard = ({ onSwitchMode }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const currentUser = user || mockUser;
  
  const [isWindowsLocked, setIsWindowsLocked] = useState(false);
  
  // Modal states
  // Old modal states replaced by enhanced form visibility states above
  const [editingItem, setEditingItem] = useState(null);
  
  // Old form states removed - enhanced forms manage their own state
  const [windows, setWindows] = useState([
    { id: 'overview', title: 'Financial Overview', visible: true, zIndex: 1, position: { x: 50, y: 140 }, size: { width: 600, height: 450 } },
    { id: 'income', title: 'Income Management', visible: true, zIndex: 2, position: { x: 680, y: 140 }, size: { width: 650, height: 480 } },
    { id: 'utilities-bills', title: 'Utilities & Bills', visible: true, zIndex: 3, position: { x: 50, y: 620 }, size: { width: 580, height: 400 } },
    { id: 'subscriptions', title: 'Subscriptions', visible: true, zIndex: 4, position: { x: 660, y: 620 }, size: { width: 580, height: 400 } },
    { id: 'expenses', title: 'Recent Transactions', visible: true, zIndex: 5, position: { x: 1270, y: 140 }, size: { width: 600, height: 500 } },
  ]);

  const [dashboardData, setDashboardData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [income, setIncome] = useState([]);
  const [utilitiesBills, setUtilitiesBills] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [userTables, setUserTables] = useState([]);
  const [categoryWindows, setCategoryWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [transactionFormVisible, setTransactionFormVisible] = useState(false);
  const [incomeFormVisible, setIncomeFormVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formCategoryContext, setFormCategoryContext] = useState(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      console.log('🚀 Initializing dynamic dashboard...');
      
      // Load user's tables/categories first
      await loadUserTables();
      
      // Load existing category windows
      await loadCategoryWindows();
      
      // Load all dashboard data
      await Promise.all([
        loadDashboardData(),
        loadRecentTransactions(),
        loadIncome(),
        loadCategoryTransactions()
      ]);
      
    } catch (error) {
      console.error('❌ Error initializing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserTables = async () => {
    try {
      const tables = await categoryService.getUserTables(currentUser.UserId);
      console.log('📊 User tables loaded:', tables);
      setUserTables(tables);
      return tables;
    } catch (error) {
      console.error('❌ Error loading user tables:', error);
      return [];
    }
  };

  const loadCategoryWindows = async () => {
    try {
      const savedWindows = await categoryService.getCategoryWindows(currentUser.UserId);
      console.log('🪟 Saved category windows:', savedWindows);
      
      if (savedWindows && savedWindows.length > 0) {
        // Convert SQL window data to component format
        const convertedWindows = savedWindows.map(sqlWindow => ({
          id: sqlWindow.WindowID,
          title: sqlWindow.DisplayName,
          categoryName: sqlWindow.CategoryName,
          tableName: sqlWindow.TableName,
          visible: sqlWindow.IsActive && !sqlWindow.IsMinimized,
          zIndex: sqlWindow.ZIndex,
          position: { x: sqlWindow.PositionX, y: sqlWindow.PositionY },
          size: { width: sqlWindow.Width, height: sqlWindow.Height },
          colorTheme: sqlWindow.ColorTheme,
          description: sqlWindow.Description
        }));
        
        setCategoryWindows(convertedWindows);
        setWindows(convertedWindows);
      } else {
        // No saved windows, create defaults
        await createDefaultWindows();
      }
    } catch (error) {
      console.error('❌ Error loading category windows:', error);
      // Fallback to creating defaults
      await createDefaultWindows();
    }
  };

  const createDefaultWindows = async () => {
    console.log('🏗️ Creating default windows...');
    const defaultWindows = [
      {
        categoryName: 'overview',
        displayName: 'Financial Overview',
        tableName: null,
        positionX: 50,
        positionY: 140,
        width: 600,
        height: 450,
        colorTheme: 'blue'
      },
      {
        categoryName: 'income',
        displayName: 'Income Management',
        tableName: 'Income',
        positionX: 680,
        positionY: 140,
        width: 650,
        height: 480,
        colorTheme: 'green'
      },
      {
        categoryName: 'utilities-bills',
        displayName: 'Utilities & Bills',
        tableName: 'Bills',
        positionX: 50,
        positionY: 620,
        width: 580,
        height: 400,
        colorTheme: 'orange'
      },
      {
        categoryName: 'subscriptions',
        displayName: 'Subscriptions',
        tableName: 'Subscriptions',
        positionX: 660,
        positionY: 620,
        width: 580,
        height: 400,
        colorTheme: 'purple'
      },
      {
        categoryName: 'expenses',
        displayName: 'All Transactions',
        tableName: null,
        positionX: 1270,
        positionY: 140,
        width: 600,
        height: 500,
        colorTheme: 'red'
      }
    ];

    try {
      const createdWindows = [];
      for (const windowConfig of defaultWindows) {
        const response = await categoryService.createCategoryWindow({
          userId: currentUser.UserId,
          username: currentUser.Username,
          categoryName: windowConfig.categoryName,
          displayName: windowConfig.displayName,
          tableName: windowConfig.tableName,
          positionX: windowConfig.positionX,
          positionY: windowConfig.positionY,
          width: windowConfig.width,
          height: windowConfig.height,
          colorTheme: windowConfig.colorTheme
        });
        
        if (response.Success) {
          createdWindows.push({
            id: response.NewWindowID,
            title: windowConfig.displayName,
            categoryName: windowConfig.categoryName,
            tableName: windowConfig.tableName,
            visible: true,
            zIndex: createdWindows.length + 1,
            position: { x: windowConfig.positionX, y: windowConfig.positionY },
            size: { width: windowConfig.width, height: windowConfig.height },
            colorTheme: windowConfig.colorTheme
          });
        }
      }
      
      setCategoryWindows(createdWindows);
      setWindows(createdWindows);
      console.log('✅ Default windows created:', createdWindows.length);
    } catch (error) {
      console.error('❌ Error creating default windows:', error);
      // Fallback to static windows if database creation fails
      const fallbackWindows = [
        { id: 'overview', title: 'Financial Overview', visible: true, zIndex: 1, position: { x: 50, y: 140 }, size: { width: 600, height: 450 } },
        { id: 'income', title: 'Income Management', visible: true, zIndex: 2, position: { x: 680, y: 140 }, size: { width: 650, height: 480 } },
        { id: 'utilities-bills', title: 'Utilities & Bills', visible: true, zIndex: 3, position: { x: 50, y: 620 }, size: { width: 580, height: 400 } },
        { id: 'subscriptions', title: 'Subscriptions', visible: true, zIndex: 4, position: { x: 660, y: 620 }, size: { width: 580, height: 400 } },
        { id: 'expenses', title: 'Recent Transactions', visible: true, zIndex: 5, position: { x: 1270, y: 140 }, size: { width: 600, height: 500 } }
      ];
      setWindows(fallbackWindows);
    }
  };

  const loadCategoryTransactions = async () => {
    try {
      console.log('💳 Loading category-specific transactions...');
      
      // Load Bills (using 'Bills' as TableName)
      const billsData = await budgetService.getTransactionsByCategory(currentUser.UserId, 'Bills');
      console.log('💵 Bills data:', billsData);
      setUtilitiesBills((billsData || []).map(processTransactionData));
      
      // Load Subscriptions (using 'Subscriptions' as TableName)
      const subscriptionsData = await budgetService.getTransactionsByCategory(currentUser.UserId, 'Subscriptions');
      console.log('📱 Subscriptions data:', subscriptionsData);
      setSubscriptions((subscriptionsData || []).map(processTransactionData));
      
      console.log('📋 Category data loaded:', {
        bills: (billsData || []).length,
        subscriptions: (subscriptionsData || []).length
      });
    } catch (error) {
      console.error('Error loading category transactions:', error);
      // Set empty arrays as fallback
      setUtilitiesBills([]);
      setSubscriptions([]);
    }
  };

  const processTransactionData = (tx) => {
    return {
      id: tx.TransactionId || tx.id,
      amount: parseFloat(tx.Amount || tx.amount) || 0,
      description: tx.Description || tx.description || '',
      date: tx.Date || tx.date || tx.CreationTime,
      dueDate: tx.Due || tx.due,
      category: tx.TableName || tx.category,
      status: tx.Status || tx.status || 'Active',
      notes: tx.Notes || tx.notes || ''
    };
  };

  const loadDashboardData = async () => {
    try {
      console.log('📈 Loading dashboard data for user:', currentUser.UserId);
      const data = await budgetService.getDashboardStats(currentUser.UserId);
      console.log('📊 Raw dashboard data from API:');
      console.log('  - Full response:', data);
      console.log('  - Type of data:', typeof data);
      console.log('  - Keys in data:', Object.keys(data || {}));
      
      if (data) {
        console.log('🔍 Individual field analysis:');
        console.log('  - totalIncome:', data.totalIncome, '(type:', typeof data.totalIncome, ')');
        console.log('  - totalExpenses:', data.totalExpenses, '(type:', typeof data.totalExpenses, ')');
        console.log('  - remainingBudget:', data.remainingBudget, '(type:', typeof data.remainingBudget, ')');
        console.log('  - titheOwed:', data.titheOwed, '(type:', typeof data.titheOwed, ')');
        
        // Handle the actual SQL response structure from backend
        console.log('🔍 Analyzing dashboard data structure:');
        console.log('  - data.income:', data.income);
        console.log('  - data.expenses:', data.expenses);
        console.log('  - data.categories:', data.categories);
        
        // Backend returns: { income: {...}, categories: [...], recentTransactions: [...], expenses: {...} }
        const totalIncomeValue = parseFloat(data.income?.totalGross || data.income?.totalNet) || 0;
        const totalExpensesValue = parseFloat(data.expenses?.totalAmount) || 0;
        const titheValue = parseFloat(data.income?.totalTithe) || 0;
        
        const processedData = {
          totalIncome: totalIncomeValue,
          totalExpenses: totalExpensesValue,
          remainingBudget: totalIncomeValue - totalExpensesValue,
          titheOwed: titheValue,
          thisMonthSpending: totalExpensesValue
        };
        
        console.log('📊 Processed dashboard values:');
        console.log('  - Total Income:', processedData.totalIncome);
        console.log('  - Total Expenses:', processedData.totalExpenses);
        console.log('  - Remaining Budget:', processedData.remainingBudget);
        console.log('  - Tithe Owed:', processedData.titheOwed);
        
        console.log('🔄 Processed dashboard data:', processedData);
        setDashboardData(processedData);
      } else {
        console.log('⚠️ No data returned from API, using fallback');
        setDashboardData({
          totalIncome: 0,
          totalExpenses: 0,
          remainingBudget: 0,
          titheOwed: 0,
          thisMonthSpending: 0
        });
      }
    } catch (error) {
      console.error('💥 Error loading dashboard:', error);
      console.log('Setting fallback mock data due to API error');
      // Set mock data as fallback
      setDashboardData({
        totalIncome: 5500,
        totalExpenses: 3200,
        remainingBudget: 2300,
        titheOwed: 550,
        thisMonthSpending: 1850
      });
    }
  };

  const loadRecentTransactions = async () => {
    try {
      console.log('📁 Loading transactions for user:', currentUser.UserId);
      const data = await budgetService.getRecentTransactions(currentUser.UserId, 10);
      console.log('📋 Raw transactions data from API:');
      console.log('  - Full response:', data);
      console.log('  - Type:', typeof data);
      console.log('  - Is array:', Array.isArray(data));
      console.log('  - Length:', data?.length);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('🔍 First transaction analysis:');
        const firstTx = data[0];
        console.log('  - Sample transaction:', firstTx);
        console.log('  - Keys:', Object.keys(firstTx || {}));
        console.log('  - Amount:', firstTx?.amount, '(type:', typeof firstTx?.amount, ')');
        console.log('  - Description:', firstTx?.description);
        console.log('  - Date:', firstTx?.date);
        
        // Process transactions to handle SQL column names
        const processedTransactions = data.map((tx, index) => {
          const processed = {
            id: tx.TransactionId || tx.id || index,
            amount: parseFloat(tx.Amount || tx.amount) || 0,
            description: tx.Description || tx.description || 'No description',
            date: tx.Date || tx.date || tx.CreationTime || new Date().toISOString(),
            category: tx.TableName || tx.category || 'Uncategorized'
          };
          if (index === 0) {
            console.log('🔄 Processed first transaction:', processed);
          }
          return processed;
        });
        
        setRecentTransactions(processedTransactions);
      } else {
        console.log('⚠️ No transactions returned from API');
        setRecentTransactions([]);
      }
    } catch (error) {
      console.error('💥 Error loading transactions:', error);
      console.log('Setting fallback mock transactions due to API error');
      // Mock data as fallback
      setRecentTransactions([
        { id: 1, amount: -85.50, description: 'Grocery Store', date: '2024-11-20', category: 'Food' },
        { id: 2, amount: -45.00, description: 'Gas Station', date: '2024-11-19', category: 'Transportation' },
        { id: 3, amount: 2800.00, description: 'Salary Deposit', date: '2024-11-15', category: 'Income' },
        { id: 4, amount: -125.99, description: 'Utilities Bill', date: '2024-11-14', category: 'Bills' },
        { id: 5, amount: -32.50, description: 'Coffee Shop', date: '2024-11-13', category: 'Food' }
      ]);
    }
  };

  const loadIncome = async () => {
    try {
      console.log('💰 Loading income for user:', currentUser.UserId);
      const data = await budgetService.getIncome(currentUser.UserId);
      console.log('💳 Raw income data from API:');
      console.log('  - Full response:', data);
      console.log('  - Type:', typeof data);
      console.log('  - Is array:', Array.isArray(data));
      console.log('  - Length:', data?.length);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('🔍 First income entry analysis:');
        const firstIncome = data[0];
        console.log('  - Sample income:', firstIncome);
        console.log('  - Keys:', Object.keys(firstIncome || {}));
        console.log('  - Amount:', firstIncome?.amount, '(type:', typeof firstIncome?.amount, ')');
        console.log('  - Description:', firstIncome?.description);
        console.log('  - TithePercent:', firstIncome?.tithePercent || firstIncome?.TithePercent);
        
        // Process income to handle SQL column names
        const processedIncome = data.map((income, index) => {
          // SQL columns: Gross, Net, Tithe, Description, Date (varchar), CreationTime
          const grossAmount = parseFloat(income.Gross || income.gross) || 0;
          const netAmount = parseFloat(income.Net || income.net) || 0;
          const titheAmount = parseFloat(income.Tithe || income.tithe) || 0;
          
          const processed = {
            id: income.IncomeId || income.id || index,
            amount: grossAmount || netAmount, // Use Gross first, fallback to Net
            description: income.Description || income.description || 'No description',
            date: income.Date || income.date || income.CreationTime || new Date().toISOString(),
            tithePercent: grossAmount > 0 ? Math.round((titheAmount / grossAmount) * 100) : 10,
            gross: grossAmount,
            net: netAmount,
            tithe: titheAmount
          };
          if (index === 0) {
            console.log('🔄 Processed first income:', processed);
          }
          return processed;
        });
        
        setIncome(processedIncome);
      } else {
        console.log('⚠️ No income returned from API');
        setIncome([]);
      }
    } catch (error) {
      console.error('💥 Error loading income:', error);
      console.log('Setting fallback mock income due to API error');
      // Mock data as fallback
      setIncome([
        { id: 1, amount: 2800, description: 'Primary Job', date: '2024-11-15', tithePercent: 10 },
        { id: 2, amount: 450, description: 'Freelance Work', date: '2024-11-10', tithePercent: 10 }
      ]);
    }
  };

  const toggleWindow = (windowId) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, visible: !w.visible, zIndex: Math.max(...prev.map(win => win.zIndex)) + 1 }
        : w
    ));
  };

  const closeWindow = async (windowId) => {
    // Hide window immediately for UX
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, visible: false } : w
    ));
    
    // Update database to mark window as inactive
    try {
      await categoryService.updateCategoryWindow(windowId, {
        userId: currentUser.UserId,
        isMinimized: true // This will hide it from future loads
      });
      console.log('✅ Window closed and saved to database');
    } catch (error) {
      console.error('❌ Error closing window in database:', error);
    }
  };

  const bringToFront = (windowId) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, zIndex: Math.max(...prev.map(win => win.zIndex)) + 1 }
        : w
    ));
  };

  const updateWindowSize = (windowId, newSize) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, size: newSize } : w
    ));
    // Save size to database
    saveWindowUpdate(windowId, { width: newSize.width, height: newSize.height });
  };

  const updateWindowPosition = (windowId, newPosition) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, position: newPosition } : w
    ));
    // Save position to database
    saveWindowUpdate(windowId, { positionX: newPosition.x, positionY: newPosition.y });
  };

  const saveWindowUpdate = async (windowId, updateData) => {
    try {
      console.log('💾 Saving window update:', windowId, updateData);
      await categoryService.updateCategoryWindow(windowId, {
        userId: currentUser.UserId,
        ...updateData
      });
      console.log('✅ Window update saved to database');
    } catch (error) {
      console.error('❌ Error saving window update:', error);
    }
  };

  // Get unique category names for dropdown
  const existingCategories = [...new Set(recentTransactions.map(t => t.category).filter(Boolean))];
  const defaultCategories = ['Bills', 'Utilities', 'Subscriptions', 'Food', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare'];
  const allCategories = [...new Set([...existingCategories, ...defaultCategories])].sort();

  // Old form handlers removed - enhanced forms manage their own logic

  // CRUD Handlers
  const handleAddTransaction = (category) => {
    console.log('📝 Adding transaction for category:', category);
    
    // Map display names to SQL TableName values
    const tableNameMap = {
      'Utilities': 'Bills',
      'Subscriptions': 'Subscriptions', 
      'Expenses': 'Expenses'
    };
    
    const tableName = tableNameMap[category] || category;
    console.log('TableName for SQL:', tableName);
    
    // Set category context and show form
    setFormCategoryContext(tableName);
    setEditingTransaction(null);
    setTransactionFormVisible(true);
  };

  const handleAddIncome = () => {
    console.log('💰 Adding new income');
    setEditingIncome(null);
    setIncomeFormVisible(true);
  };

  const handleEditTransaction = (transaction) => {
    console.log('✏️ Editing transaction:', transaction);
    setEditingTransaction(transaction);
    setFormCategoryContext(transaction.category);
    setTransactionFormVisible(true);
  };

  const handleEditIncome = (income) => {
    console.log('✏️ Editing income:', income);
    setEditingIncome(income);
    setIncomeFormVisible(true);
  };

  // Form save handlers
  const handleTransactionSaved = (savedTransaction) => {
    console.log('✅ Transaction saved:', savedTransaction);
    // Refresh the appropriate category data
    if (formCategoryContext) {
      loadCategoryTransactions();
    } else {
      loadRecentTransactions();
    }
    loadDashboardData(); // Refresh totals
  };

  const handleIncomeSaved = (savedIncome) => {
    console.log('✅ Income saved:', savedIncome);
    loadIncome();
    loadDashboardData(); // Refresh totals
  };

  // Old save handlers removed - enhanced forms handle their own CRUD operations

  const handleDeleteIncome = async (incomeId) => {
    if (!confirm('Delete this income record?')) return;
    try {
      await budgetService.deleteIncome(incomeId, currentUser.UserId);
      loadIncome();
      loadDashboardData();
    } catch (error) {
      alert('Failed to delete income');
    }
  };

  const handleDeleteTransaction = async (transactionId, windowType) => {
    console.log('🗑️ Deleting transaction:', transactionId, 'from', windowType);
    
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await budgetService.deleteTransaction(transactionId, currentUser.UserId);
      
      // Refresh the appropriate data
      switch (windowType) {
        case 'utilities-bills':
          loadCategoryTransactions(); // Reloads Bills category
          break;
        case 'subscriptions':
          loadCategoryTransactions(); // Reloads Subscriptions category
          break;
        case 'expenses':
          loadRecentTransactions(); // Reloads all recent transactions
          break;
        default:
          loadRecentTransactions();
      }
      
      // Also refresh dashboard totals
      loadDashboardData();
      
      // Refresh dashboard data
      loadDashboardData();
      
      console.log('✅ Transaction deleted successfully');
    } catch (error) {
      console.error('💥 Error deleting transaction:', error);
      alert('Failed to delete transaction: ' + error.message);
    }
  };

  // Top overview bar component
  const TopOverviewBar = () => {
    if (Platform.OS !== 'web') return null;

    // Handle null/undefined values with proper fallbacks
    const totalIncome = parseFloat(dashboardData?.totalIncome) || 0;
    const totalExpenses = parseFloat(dashboardData?.totalExpenses) || 0;
    const remainingBudget = parseFloat(dashboardData?.remainingBudget) || (totalIncome - totalExpenses);
    const titheOwed = parseFloat(dashboardData?.titheOwed) || 0;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        borderBottom: '2px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 30px',
        zIndex: 999,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 15px rgba(0,0,0,0.4)'
      }}>
        {/* App Logo/Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginRight: '40px'
        }}>
          <div style={{
            background: 'linear-gradient(45deg, #0066ff, #00ccff)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '18px',
            boxShadow: '0 3px 8px rgba(0,102,255,0.3)'
          }}>
            💰 ReactBudget
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div style={{
          display: 'flex',
          gap: '20px',
          flex: 1,
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '140px',
            boxShadow: '0 3px 8px rgba(76,175,80,0.3)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Income</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${totalIncome.toLocaleString()}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '140px',
            boxShadow: '0 3px 8px rgba(244,67,54,0.3)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Expenses</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${totalExpenses.toLocaleString()}
            </div>
          </div>

          <div style={{
            background: remainingBudget >= 0 
              ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'
              : 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '140px',
            boxShadow: remainingBudget >= 0 
              ? '0 3px 8px rgba(33,150,243,0.3)'
              : '0 3px 8px rgba(255,87,34,0.3)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Remaining Budget</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${remainingBudget.toLocaleString()}
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '140px',
            boxShadow: '0 3px 8px rgba(255,152,0,0.3)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Tithe Owed</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              ${titheOwed.toLocaleString()}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginLeft: '30px'
        }}>
          <div style={{
            color: '#fff',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {currentUser.Name || currentUser.Username}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {new Date().toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              background: isDark ? '#ffd93d' : '#1a1a2e',
              color: isDark ? '#000' : '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginRight: '10px'
            }}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={onSwitchMode}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              marginRight: '10px',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
            }}
          >
            ✨ Modern View
          </button>
          <button
            onClick={logout}
            style={{
              background: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  };

  // Web-optimized taskbar component
  const WebTaskbar = () => {
    if (Platform.OS !== 'web') return null;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        borderTop: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.3)'
      }}>
        {/* Start Menu Area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginRight: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(45deg, #0066ff, #00ccff)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,102,255,0.3)'
          }}>
            💰 ReactBudget
          </div>
        </div>

        {/* Window Controls */}
        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
          {windows.map(window => (
            <button
              key={window.id}
              onClick={() => toggleWindow(window.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: window.visible ? '#0066ff' : '#333',
                color: window.visible ? 'white' : '#ccc',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '120px',
                textAlign: 'left'
              }}
            >
              {window.title}
            </button>
          ))}
        </div>

        {/* System Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsWindowsLocked(!isWindowsLocked)}
            style={{
              background: isWindowsLocked ? '#ff6b6b' : '#51cf66',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {isWindowsLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
          
          <button
            onClick={logout}
            style={{
              background: '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  };

  // Render desktop background for web
  const WebDesktopBackground = () => {
    if (Platform.OS !== 'web') return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0c1445 0%, #1a237e 50%, #000051 100%)',
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(74, 144, 226, 0.1) 0%, transparent 50%)
        `,
        zIndex: -1
      }} />
    );
  };

  const renderOverviewWindow = () => (
    <ScrollView style={styles.windowScrollContent}>
      <Text style={styles.windowTitle}>Financial Overview</Text>
      {dashboardData ? (
        <View style={styles.overviewGrid}>
          <View style={styles.overviewCard}>
            <Text style={styles.cardLabel}>Total Income</Text>
            <Text style={[styles.cardValue, styles.incomeValue]}>
              ${dashboardData.totalIncome?.toLocaleString() || '0'}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.cardLabel}>Total Expenses</Text>
            <Text style={[styles.cardValue, styles.expenseValue]}>
              ${dashboardData.totalExpenses?.toLocaleString() || '0'}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.cardLabel}>Remaining Budget</Text>
            <Text style={[styles.cardValue, 
              (dashboardData.remainingBudget || 0) >= 0 ? styles.incomeValue : styles.expenseValue
            ]}>
              ${dashboardData.remainingBudget?.toLocaleString() || '0'}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.cardLabel}>Tithe Owed</Text>
            <Text style={[styles.cardValue, styles.titheValue]}>
              ${dashboardData.titheOwed?.toLocaleString() || '0'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.loadingText}>Loading financial data...</Text>
      )}
    </ScrollView>
  );

  const renderTransactionsWindow = () => (
    <ScrollView style={styles.windowScrollContent}>
      <Text style={styles.windowTitle}>Recent Transactions</Text>
      {recentTransactions.map(transaction => (
        <View key={transaction.id} style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>
              {transaction.description}
            </Text>
            <Text style={styles.transactionDate}>
              {new Date(transaction.date).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[
            styles.transactionAmount,
            transaction.amount >= 0 ? styles.incomeValue : styles.expenseValue
          ]}>
            {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderIncomeWindow = () => (
    <ScrollView style={styles.windowScrollContent}>
      <View style={styles.windowHeader}>
        <Text style={styles.windowTitle}>Income Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddIncome}>
          <Text style={styles.addButtonText}>+ Add Income</Text>
        </TouchableOpacity>
      </View>
      {income.length > 0 ? (
        income.map(incomeItem => (
          <View key={incomeItem.IncomeId || incomeItem.id} style={styles.incomeItem}>
            <View style={styles.incomeInfo}>
              <Text style={styles.incomeDescription}>
                {incomeItem.Description || incomeItem.description || 'Income'}
              </Text>
              <Text style={styles.incomeDate}>
                {incomeItem.Date || (incomeItem.date ? new Date(incomeItem.date).toLocaleDateString() : 'N/A')}
              </Text>
              <Text style={styles.tithePercent}>
                Tithe: ${(incomeItem.Tithe || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.incomeAmounts}>
              <Text style={[styles.incomeAmount, styles.incomeValue]}>
                Gross: ${(incomeItem.Gross || incomeItem.amount || 0).toFixed(2)}
              </Text>
              <Text style={styles.titheAmount}>
                Net: ${(incomeItem.Net || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.incomeActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEditIncome(incomeItem)}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteIncome(incomeItem.IncomeId)}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No income recorded yet. Click + Add Income to add your first paycheck!</Text>
      )}
    </ScrollView>
  );

  const renderUtilitiesBillsWindow = () => (
    <ScrollView style={styles.windowScrollContent}>
      <View style={styles.windowHeader}>
        <Text style={styles.windowTitle}>Utilities & Bills</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => handleAddTransaction('Bills')}
        >
          <Text style={styles.addButtonText}>+ Add Bill</Text>
        </TouchableOpacity>
      </View>
      {utilitiesBills.length > 0 ? (
        utilitiesBills.map(transaction => renderTransactionRow(transaction, 'utilities-bills'))
      ) : (
        <Text style={styles.emptyText}>No utilities or bills recorded</Text>
      )}
    </ScrollView>
  );

  const renderSubscriptionsWindow = () => (
    <ScrollView style={styles.windowScrollContent}>
      <View style={styles.windowHeader}>
        <Text style={styles.windowTitle}>Subscriptions</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => handleAddTransaction('Subscriptions')}
        >
          <Text style={styles.addButtonText}>+ Add Subscription</Text>
        </TouchableOpacity>
      </View>
      {subscriptions.length > 0 ? (
        subscriptions.map(transaction => renderTransactionRow(transaction, 'subscriptions'))
      ) : (
        <Text style={styles.emptyText}>No subscriptions recorded</Text>
      )}
    </ScrollView>
  );

  const renderTransactionRow = (transaction, windowType) => (
    <View key={transaction.id} style={styles.transactionRow}>
      <View style={styles.transactionMainInfo}>
        <Text style={styles.transactionDescription}>{transaction.description}</Text>
        <Text style={styles.transactionAmount}>${transaction.amount.toFixed(2)}</Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDate}>
          Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : 'No due date'}
        </Text>
        <Text style={styles.transactionStatus}>Status: {transaction.status}</Text>
      </View>
      <View style={styles.transactionActions}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => handleEditTransaction(transaction)}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteTransaction(transaction.id, windowType)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExpensesWindow = () => (
    <ScrollView style={styles.windowScrollContent}>
      <View style={styles.windowHeader}>
        <Text style={styles.windowTitle}>All Transactions</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => handleAddTransaction('Expenses')}
        >
          <Text style={styles.addButtonText}>+ Add Transaction</Text>
        </TouchableOpacity>
      </View>
      {recentTransactions.map(transaction => (
        <View key={transaction.id} style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{transaction.description}</Text>
            <Text style={styles.transactionDate}>
              {new Date(transaction.date).toLocaleDateString()}
            </Text>
            <Text style={styles.transactionCategory}>Category: {transaction.category}</Text>
          </View>
          <View style={styles.transactionAmountContainer}>
            <Text style={[
              styles.transactionAmount,
              transaction.amount >= 0 ? styles.incomeValue : styles.expenseValue
            ]}>
              {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
            </Text>
            <View style={styles.transactionActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEditTransaction(transaction)}
              >
                <Text style={styles.actionButtonText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteTransaction(transaction.id, 'expenses')}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const getWindowContent = (windowId) => {
    // Find the window configuration to check its category and tableName
    const window = windows.find(w => w.id === windowId);
    
    if (window && window.categoryName) {
      // Use category-based rendering for dynamic windows
      switch (window.categoryName) {
        case 'overview': return renderOverviewWindow();
        case 'income': return renderIncomeWindow();
        case 'utilities-bills': return renderUtilitiesBillsWindow();
        case 'subscriptions': return renderSubscriptionsWindow();
        case 'expenses': return renderExpensesWindow();
        default: 
          // For dynamic category windows, render a generic transaction list
          return renderDynamicCategoryWindow(window.tableName, window.title);
      }
    }
    
    // Fallback for legacy window IDs
    switch (windowId) {
      case 'overview': return renderOverviewWindow();
      case 'income': return renderIncomeWindow();
      case 'utilities-bills': return renderUtilitiesBillsWindow();
      case 'subscriptions': return renderSubscriptionsWindow();
      case 'expenses': return renderExpensesWindow();
      default: return <Text style={styles.windowTitle}>Window Content</Text>;
    }
  };

  const renderDynamicCategoryWindow = (tableName, displayName) => {
    // This is for user-created categories beyond the default ones
    return (
      <ScrollView style={styles.windowScrollContent}>
        <View style={styles.windowHeader}>
          <Text style={styles.windowTitle}>{displayName}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => handleAddTransaction(tableName)}
          >
            <Text style={styles.addButtonText}>+ Add {displayName}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.windowContent}>
          Dynamic category window for table: {tableName}
        </Text>
        <Text style={styles.windowSubText}>
          This window will display transactions where TableName = '{tableName}'
        </Text>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <WebDesktopBackground />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>🚀 Initializing ReactBudget</Text>
          <Text style={styles.loadingText}>Loading your personalized dashboard...</Text>
          <Text style={styles.loadingSubText}>
            • Fetching user tables{'\n'}
            • Loading category windows{'\n'}
            • Preparing financial data
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebDesktopBackground />
      <TopOverviewBar />
      
      {Platform.OS !== 'web' && (
        <View style={styles.mobileHeader}>
          <Text style={styles.headerTitle}>ReactBudget Dashboard</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Draggable Windows */}
      {windows
        .filter(window => window.visible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(window => (
        <DraggableWindow
          key={window.id}
          title={window.title}
          initialPosition={window.position}
          initialSize={window.size}
          onClose={() => closeWindow(window.id)}
          onMove={(newPosition) => updateWindowPosition(window.id, newPosition)}
          onResize={(newSize) => updateWindowSize(window.id, newSize)}
          zIndex={window.zIndex}
          isLocked={isWindowsLocked}
        >
          {getWindowContent(window.id)}
        </DraggableWindow>
      ))}

      <WebTaskbar />

      {/* Enhanced Forms */}
      <TransactionForm
        isVisible={transactionFormVisible}
        transaction={editingTransaction}
        categoryName={formCategoryContext}
        onClose={() => {
          setTransactionFormVisible(false);
          setEditingTransaction(null);
          setFormCategoryContext(null);
        }}
        onSave={handleTransactionSaved}
      />

      <IncomeForm
        isVisible={incomeFormVisible}
        income={editingIncome}
        onClose={() => {
          setIncomeFormVisible(false);
          setEditingIncome(null);
        }}
        onSave={handleIncomeSaved}
      />



      {/* Enhanced Transaction and Income Forms now handle all CRUD operations */}
    </View>
  );
};

// Modal styles
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  close: {
    fontSize: 24,
    color: '#888',
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryChipActive: {
    backgroundColor: '#00d4aa',
    borderColor: '#00d4aa',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00d4aa',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  deleteButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: Platform.OS === 'web' ? 80 : 0, // Account for top overview bar
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  windowScrollContent: {
    flex: 1,
  },
  windowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    minWidth: 160,
  },
  cardLabel: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  incomeValue: {
    color: '#4CAF50',
  },
  expenseValue: {
    color: '#f44336',
  },
  titheValue: {
    color: '#FF9800',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  incomeDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  tithePercent: {
    color: '#FF9800',
    fontSize: 12,
    marginTop: 2,
  },
  incomeAmounts: {
    alignItems: 'flex-end',
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  titheAmount: {
    color: '#FF9800',
    fontSize: 12,
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  categoryName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  windowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionRow: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  transactionMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionStatus: {
    color: '#888',
    fontSize: 12,
  },
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  transactionCategory: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    maxWidth: 400,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 22,
  },
});

export default WebDashboard;