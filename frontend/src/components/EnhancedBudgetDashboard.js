import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Dimensions,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  Alert
} from 'react-native';

const { width } = Dimensions.get('window');

// API Base URL
const API_BASE = 'http://localhost:3002/api';

// Real user from database - in real app this would come from auth context
const mockUser = {
  UserId: '41F580FD-54B5-4167-A145-0266EDDF487B',
  Username: 'awallingiv'
};

// Enhanced Budget Dashboard with Real Data
const EnhancedBudgetDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [newIncome, setNewIncome] = useState({ description: '', amount: '', date: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '', date: '' });

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  // API Functions
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadIncome(),
        loadTransactions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadIncome = async () => {
    try {
      const response = await fetch(`${API_BASE}/budget/income/${mockUser.UserId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Income API response:', data);
      
      // Backend returns array directly, not wrapped in success object
      const transformedIncome = Array.isArray(data) ? data.map(item => ({
        id: item.IncomeID,
        description: item.Description || 'Income',
        amount: item.Gross || item.Net || 0,
        date: item.Date || item.CreationTime?.split('T')[0],
        type: 'income'
      })) : [];
      setIncome(transformedIncome);
    } catch (error) {
      console.error('Error loading income:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/budget/transactions/${mockUser.UserId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Transactions API response:', data);
      
      // Backend returns array directly, not wrapped in success object
      const transformedExpenses = Array.isArray(data) ? data.map(item => ({
        id: item.TransactionId,
        description: item.Description || 'Expense',
        amount: item.Amount || 0,
        category: item.TableName || item.Category || 'General',
        date: item.Date?.split('T')[0] || item.CreationTime?.split('T')[0],
        type: 'expense'
      })) : [];
      setExpenses(transformedExpenses);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  // Calculate real-time stats
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = totalIncome - totalExpenses;
  const titheAmount = totalIncome * 0.1;

  // Category breakdown
  const categoryBreakdown = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  const addIncome = async () => {
    if (newIncome.description && newIncome.amount) {
      try {
        const incomeData = {
          UserID: mockUser.UserId,
          Username: mockUser.Username,
          Description: newIncome.description,
          Gross: parseFloat(newIncome.amount),
          Net: parseFloat(newIncome.amount) * 0.8, // Assume 20% taxes
          Tithe: parseFloat(newIncome.amount) * 0.1,
          Date: newIncome.date || new Date().toISOString().split('T')[0],
          PaycheckStatus: 'received',
          TitheStatus: 'pending'
        };

        const response = await fetch(`${API_BASE}/budget/income`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(incomeData)
        });

        const result = await response.json();
        
        if (result.success) {
          setNewIncome({ description: '', amount: '', date: '' });
          setShowAddIncome(false);
          Alert.alert('Success', 'Income added successfully!');
          // Reload income data
          await loadIncome();
        } else {
          Alert.alert('Error', result.error || 'Failed to add income');
        }
      } catch (error) {
        console.error('Error adding income:', error);
        Alert.alert('Error', 'Failed to add income');
      }
    }
  };

  const addExpense = async () => {
    if (newExpense.description && newExpense.amount) {
      try {
        const expenseData = {
          UserID: mockUser.UserId,
          Username: mockUser.Username,
          TableName: newExpense.category || 'General',
          Description: newExpense.description,
          Amount: parseFloat(newExpense.amount),
          Date: new Date(newExpense.date || new Date()).toISOString(),
          Category: newExpense.category || 'General',
          Status: 'completed'
        };

        const response = await fetch(`${API_BASE}/budget/transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expenseData)
        });

        const result = await response.json();
        
        if (result.success) {
          setNewExpense({ description: '', amount: '', category: '', date: '' });
          setShowAddExpense(false);
          Alert.alert('Success', 'Expense added successfully!');
          // Reload transaction data
          await loadTransactions();
        } else {
          Alert.alert('Error', result.error || 'Failed to add expense');
        }
      } catch (error) {
        console.error('Error adding expense:', error);
        Alert.alert('Error', 'Failed to add expense');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getProgressPercentage = (spent, budget) => {
    return budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  };

  // Tab Navigation Component
  const TabNavigation = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'overview', label: 'Overview' },
        { key: 'transactions', label: 'Transactions' },
        { key: 'categories', label: 'Categories' },
        { key: 'analytics', label: 'Analytics' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Overview Tab Content
  const OverviewContent = () => (
    <ScrollView style={styles.tabContent}>
      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statLabel}>Total Income</Text>
          <Text style={styles.statValue}>{formatCurrency(totalIncome)}</Text>
          <Text style={styles.statChange}>Monthly total</Text>
        </View>

        <View style={[styles.statCard, styles.expenseCard]}>
          <Text style={styles.statLabel}>Total Expenses</Text>
          <Text style={styles.statValue}>{formatCurrency(totalExpenses)}</Text>
          <Text style={styles.statChange}>Monthly spent</Text>
        </View>

        <View style={[styles.statCard, remainingBudget >= 0 ? styles.budgetCard : styles.overbudgetCard]}>
          <Text style={styles.statLabel}>{remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}</Text>
          <Text style={styles.statValue}>{formatCurrency(Math.abs(remainingBudget))}</Text>
          <Text style={styles.statChange}>{remainingBudget >= 0 ? 'Available' : 'Deficit'}</Text>
        </View>

        <View style={[styles.statCard, styles.titheCard]}>
          <Text style={styles.statLabel}>Tithe Goal</Text>
          <Text style={styles.statValue}>{formatCurrency(titheAmount)}</Text>
          <Text style={styles.statChange}>10% of income</Text>
        </View>
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.addIncomeBtn]} 
            onPress={() => setShowAddIncome(true)}
          >
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionButtonText}>Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.addExpenseBtn]} 
            onPress={() => setShowAddExpense(true)}
          >
            <Text style={styles.actionIcon}>💸</Text>
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget Health */}
      <View style={styles.budgetHealth}>
        <Text style={styles.sectionTitle}>Budget Health</Text>
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <Text style={styles.healthTitle}>Financial Status</Text>
            <Text style={[styles.healthStatus, remainingBudget >= 0 ? styles.healthyStatus : styles.unhealthyStatus]}>
              {remainingBudget >= 0 ? 'Healthy' : 'Over Budget'}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${getProgressPercentage(totalExpenses, totalIncome)}%`,
                  backgroundColor: remainingBudget >= 0 ? '#00FF88' : '#FF6B6B'
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(getProgressPercentage(totalExpenses, totalIncome))}% of income used
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // Transactions Tab Content
  const TransactionsContent = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>All Transactions</Text>
      {[...income, ...expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((transaction) => (
        <View key={`${transaction.type}-${transaction.id}`} style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDesc}>{transaction.description}</Text>
            <Text style={styles.transactionDate}>{transaction.date}</Text>
            {transaction.category && (
              <Text style={styles.transactionCategory}>📁 {transaction.category}</Text>
            )}
            <Text style={styles.transactionType}>
              {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
            </Text>
          </View>
          <Text style={[
            styles.transactionAmount,
            transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
          ]}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  // Categories Tab Content
  const CategoriesContent = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Expense Categories</Text>
      {Object.entries(categoryBreakdown).map(([category, amount]) => (
        <View key={category} style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>📂 {category}</Text>
            <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
          </View>
          <View style={styles.categoryProgress}>
            <View 
              style={[
                styles.categoryBar, 
                { 
                  width: `${getProgressPercentage(amount, totalExpenses)}%`,
                  backgroundColor: '#0066FF'
                }
              ]} 
            />
          </View>
          <Text style={styles.categoryPercent}>
            {Math.round(getProgressPercentage(amount, totalExpenses))}% of total expenses
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  // Analytics Tab Content
  const AnalyticsContent = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Financial Analytics</Text>
      
      {/* Monthly Summary */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>📊 Monthly Summary</Text>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Income Sources:</Text>
          <Text style={styles.analyticsValue}>{income.length}</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Expense Items:</Text>
          <Text style={styles.analyticsValue}>{expenses.length}</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Categories:</Text>
          <Text style={styles.analyticsValue}>{Object.keys(categoryBreakdown).length}</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={styles.analyticsLabel}>Savings Rate:</Text>
          <Text style={[styles.analyticsValue, remainingBudget >= 0 ? styles.positiveValue : styles.negativeValue]}>
            {Math.round((remainingBudget / totalIncome) * 100)}%
          </Text>
        </View>
      </View>

      {/* Top Categories */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>🎯 Top Expense Categories</Text>
        {Object.entries(categoryBreakdown)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category, amount], index) => (
          <View key={category} style={styles.topCategoryItem}>
            <Text style={styles.topCategoryRank}>#{index + 1}</Text>
            <Text style={styles.topCategoryName}>{category}</Text>
            <Text style={styles.topCategoryAmount}>{formatCurrency(amount)}</Text>
          </View>
        ))}
      </View>

      {/* Financial Goals */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>🎯 Financial Goals</Text>
        <View style={styles.goalItem}>
          <Text style={styles.goalLabel}>Emergency Fund (3 months expenses)</Text>
          <Text style={styles.goalAmount}>Target: {formatCurrency(totalExpenses * 3)}</Text>
          <View style={styles.goalProgress}>
            <View style={[styles.goalBar, { width: '35%', backgroundColor: '#FFA726' }]} />
          </View>
          <Text style={styles.goalPercent}>35% Complete</Text>
        </View>
        
        <View style={styles.goalItem}>
          <Text style={styles.goalLabel}>Yearly Tithe Goal</Text>
          <Text style={styles.goalAmount}>Target: {formatCurrency(titheAmount * 12)}</Text>
          <View style={styles.goalProgress}>
            <View style={[styles.goalBar, { width: '8%', backgroundColor: '#00FF88' }]} />
          </View>
          <Text style={styles.goalPercent}>8% Complete (1 month)</Text>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your financial data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAllData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>ReactBudget Pro</Text>
            <Text style={styles.headerSubtitle}>Real Financial Data Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={loadAllData}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewContent />}
      {activeTab === 'transactions' && <TransactionsContent />}
      {activeTab === 'categories' && <CategoriesContent />}
      {activeTab === 'analytics' && <AnalyticsContent />}

      {/* Add Income Modal */}
      <Modal visible={showAddIncome} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>💰 Add Income</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Salary, Freelance)"
              placeholderTextColor="#666"
              value={newIncome.description}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, description: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount ($)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newIncome.amount}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, amount: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#666"
              value={newIncome.date}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, date: text }))}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowAddIncome(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={addIncome}
              >
                <Text style={styles.saveButtonText}>Add Income</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Expense Modal */}
      <Modal visible={showAddExpense} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>💸 Add Expense</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Groceries, Rent)"
              placeholderTextColor="#666"
              value={newExpense.description}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, description: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount ($)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newExpense.amount}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, amount: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Category (e.g., Food, Housing, Transportation)"
              placeholderTextColor="#666"
              value={newExpense.category}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, category: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#666"
              value={newExpense.date}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, date: text }))}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowAddExpense(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={addExpense}
              >
                <Text style={styles.saveButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B3B3B3',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#0066FF',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statCard: {
    width: 200,
    padding: 20,
    marginRight: 15,
    borderRadius: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  incomeCard: {
    backgroundColor: '#1A4A3A',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  expenseCard: {
    backgroundColor: '#4A1A1A',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  budgetCard: {
    backgroundColor: '#1A2A4A',
    borderWidth: 1,
    borderColor: '#0066FF',
  },
  overbudgetCard: {
    backgroundColor: '#4A1A1A',
    borderWidth: 1,
    borderColor: '#FF4757',
  },
  titheCard: {
    backgroundColor: '#4A2A1A',
    borderWidth: 1,
    borderColor: '#FFA726',
  },
  statLabel: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  quickActions: {
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addIncomeBtn: {
    backgroundColor: '#00FF88',
  },
  addExpenseBtn: {
    backgroundColor: '#FF6B6B',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  budgetHealth: {
    padding: 20,
  },
  healthCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthyStatus: {
    color: '#00FF88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  unhealthyStatus: {
    color: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#0066FF',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#00FF88',
  },
  expenseAmount: {
    color: '#FF6B6B',
  },
  categoryCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066FF',
  },
  categoryProgress: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    marginBottom: 8,
  },
  categoryBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryPercent: {
    fontSize: 12,
    color: '#888',
  },
  analyticsCard: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#B3B3B3',
  },
  analyticsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  positiveValue: {
    color: '#00FF88',
  },
  negativeValue: {
    color: '#FF6B6B',
  },
  topCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topCategoryRank: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0066FF',
    width: 30,
  },
  topCategoryName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  topCategoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066FF',
  },
  goalItem: {
    marginBottom: 20,
  },
  goalLabel: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  goalProgress: {
    height: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    marginBottom: 4,
  },
  goalBar: {
    height: '100%',
    borderRadius: 3,
  },
  goalPercent: {
    fontSize: 12,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  saveButton: {
    backgroundColor: '#0066FF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EnhancedBudgetDashboard;