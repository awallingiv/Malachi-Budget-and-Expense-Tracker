import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import DraggableWindow from './DraggableWindowNew';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// API Base URL - C# Backend
const API_BASE = 'http://localhost:5000/api';

// Mock user for now
const mockUser = {
  UserId: '41F580FD-54B5-4167-A145-0266EDDF487B',
  Username: 'awallingiv',
  Name: 'A. Walling'
};

const WebDashboard = () => {
  const { user, logout } = useAuth();
  const currentUser = user || mockUser;
  
  const [isWindowsLocked, setIsWindowsLocked] = useState(true); // Start locked
  const [windows, setWindows] = useState([
    { id: 'overview', title: 'Financial Overview', visible: true, zIndex: 1 },
    { id: 'transactions', title: 'Recent Transactions', visible: true, zIndex: 2 },
    { id: 'income', title: 'Income Management', visible: true, zIndex: 3 },
    { id: 'categories', title: 'Expense Categories', visible: false, zIndex: 4 },
  ]);

  const [dashboardData, setDashboardData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [currentUser.UserId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboardData(),
        loadTransactions(),
        loadIncome()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/budget/dashboard/${currentUser.UserId}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/budget/transactions/${currentUser.UserId}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadIncome = async () => {
    try {
      const response = await fetch(`${API_BASE}/budget/income/${currentUser.UserId}`);
      if (response.ok) {
        const data = await response.json();
        setIncome(data);
      }
    } catch (error) {
      console.error('Error loading income:', error);
    }
  };

  const toggleWindow = (windowId) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, visible: !w.visible, zIndex: Math.max(...prev.map(win => win.zIndex)) + 1 }
        : w
    ));
  };

  const closeWindow = (windowId) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, visible: false } : w
    ));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ReactBudget Desktop...</Text>
      </View>
    );
  }

  return (
    <View style={styles.desktop}>
      {/* Desktop Background */}
      <View style={styles.background}>
        <Text style={styles.desktopTitle}>ReactBudget Desktop</Text>
      </View>

      {/* Taskbar */}
      <View style={styles.taskbar}>
        <View style={styles.taskbarLeft}>
          <Text style={styles.startButton}>💰 ReactBudget</Text>
        </View>
        <View style={styles.taskbarCenter}>
          {windows.map(window => (
            <TouchableOpacity
              key={window.id}
              style={[styles.taskbarItem, window.visible && styles.taskbarItemActive]}
              onPress={() => toggleWindow(window.id)}
            >
              <Text style={styles.taskbarItemText}>{window.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.taskbarRight}>
          <TouchableOpacity 
            onPress={() => setIsWindowsLocked(!isWindowsLocked)}
            style={[styles.lockButton, isWindowsLocked && styles.lockButtonActive]}
          >
            <Text style={styles.taskbarButton}>
              {isWindowsLocked ? '🔒' : '🔓'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => logout?.()}>
            <Text style={styles.taskbarButton}>Logout</Text>
          </TouchableOpacity>
          <Text style={styles.taskbarTime}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      {/* Windows */}
      {windows.find(w => w.id === 'overview' && w.visible) && (
        <DraggableWindow
          title="💰 Financial Overview"
          initialPosition={{ x: 50, y: 50 }}
          initialSize={{ width: 450, height: 350 }}
          zIndex={windows.find(w => w.id === 'overview').zIndex}
          onClose={() => closeWindow('overview')}
          isLocked={isWindowsLocked}
        >
          <ScrollView style={styles.windowScrollView}>
            <View style={styles.overviewCard}>
              <Text style={styles.cardTitle}>Income This Month</Text>
              <View style={styles.incomeRow}>
                <View style={styles.incomeItem}>
                  <Text style={styles.label}>Gross</Text>
                  <Text style={styles.amount}>{formatCurrency(dashboardData?.income?.totalGross)}</Text>
                </View>
                <View style={styles.incomeItem}>
                  <Text style={styles.label}>Net</Text>
                  <Text style={styles.amount}>{formatCurrency(dashboardData?.income?.totalNet)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <Text style={styles.cardTitle}>Expenses</Text>
              <Text style={styles.expenseAmount}>
                {formatCurrency(dashboardData?.expenses?.totalAmount)}
              </Text>
            </View>

            <View style={styles.overviewCard}>
              <Text style={styles.cardTitle}>Net Position</Text>
              <Text style={[
                styles.netAmount,
                (dashboardData?.income?.totalNet || 0) - (dashboardData?.expenses?.totalAmount || 0) >= 0
                  ? styles.positive : styles.negative
              ]}>
                {formatCurrency((dashboardData?.income?.totalNet || 0) - (dashboardData?.expenses?.totalAmount || 0))}
              </Text>
            </View>
          </ScrollView>
        </DraggableWindow>
      )}

      {windows.find(w => w.id === 'transactions' && w.visible) && (
        <DraggableWindow
          title="📋 Recent Transactions"
          initialPosition={{ x: 520, y: 50 }}
          initialSize={{ width: 500, height: 400 }}
          zIndex={windows.find(w => w.id === 'transactions').zIndex}
          onClose={() => closeWindow('transactions')}
          isLocked={isWindowsLocked}
        >
          <ScrollView style={styles.windowScrollView}>
            {recentTransactions.map((transaction, index) => (
              <View key={transaction.TransactionId || index} style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.Description || 'No description'}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.TableName} • {formatDate(transaction.Date || transaction.CreationTime)}
                  </Text>
                </View>
                <Text style={styles.transactionAmount}>
                  {formatCurrency(transaction.Amount)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </DraggableWindow>
      )}

      {windows.find(w => w.id === 'income' && w.visible) && (
        <DraggableWindow
          title="💼 Income Management"
          initialPosition={{ x: 100, y: 150 }}
          initialSize={{ width: 450, height: 350 }}
          zIndex={windows.find(w => w.id === 'income').zIndex}
          onClose={() => closeWindow('income')}
          isLocked={isWindowsLocked}
        >
          <ScrollView style={styles.windowScrollView}>
            <Text style={styles.cardTitle}>Income Records</Text>
            {income.length > 0 ? (
              income.map((incomeItem, index) => (
                <View key={incomeItem.IncomeId || index} style={styles.incomeRecord}>
                  <Text style={styles.incomeDescription}>
                    {incomeItem.Description || 'Income'}
                  </Text>
                  <View style={styles.incomeDetails}>
                    <Text style={styles.incomeDetailText}>
                      Gross: {formatCurrency(incomeItem.Gross)}
                    </Text>
                    <Text style={styles.incomeDetailText}>
                      Net: {formatCurrency(incomeItem.Net)}
                    </Text>
                    <Text style={styles.incomeDetailText}>
                      Date: {formatDate(incomeItem.Date || incomeItem.CreationTime)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No income records found</Text>
            )}
          </ScrollView>
        </DraggableWindow>
      )}

      {windows.find(w => w.id === 'categories' && w.visible) && (
        <DraggableWindow
          title="📊 Expense Categories"
          initialPosition={{ x: 300, y: 200 }}
          initialSize={{ width: 400, height: 350 }}
          zIndex={windows.find(w => w.id === 'categories').zIndex}
          onClose={() => closeWindow('categories')}
          isLocked={isWindowsLocked}
        >
          <ScrollView style={styles.windowScrollView}>
            {dashboardData?.categories?.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.TableName}</Text>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.totalAmount)}
                </Text>
                <Text style={styles.categoryCount}>
                  {category.transactionCount} transactions
                </Text>
              </View>
            ))}
          </ScrollView>
        </DraggableWindow>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopTitle: {
    color: '#333',
    fontSize: 48,
    fontWeight: 'bold',
    opacity: 0.1,
  },
  taskbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  taskbarLeft: {
    flex: 1,
  },
  startButton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  taskbarCenter: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  taskbarItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
  },
  taskbarItemActive: {
    backgroundColor: '#0066ff',
  },
  taskbarItemText: {
    color: '#fff',
    fontSize: 12,
  },
  taskbarRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  lockButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
    marginRight: 12,
  },
  lockButtonActive: {
    backgroundColor: '#0066ff',
  },
  taskbarButton: {
    color: '#fff',
    fontSize: 14,
  },
  taskbarTime: {
    color: '#ccc',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  windowScrollView: {
    flex: 1,
  },
  overviewCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  incomeItem: {
    alignItems: 'center',
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  amount: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  expenseAmount: {
    color: '#f44336',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  netAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#f44336',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionCategory: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  transactionAmount: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeRecord: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  incomeDescription: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  incomeDetails: {
    gap: 4,
  },
  incomeDetailText: {
    color: '#ccc',
    fontSize: 14,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  categoryAmount: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  categoryCount: {
    color: '#ccc',
    fontSize: 12,
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default WebDashboard;