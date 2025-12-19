import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Button, Chip, Divider, ProgressBar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Get current month date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const loadDashboardData = useCallback(async () => {
    if (!user?.UserId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { startDate, endDate } = getCurrentMonthRange();
      
      console.log('📊 Loading dashboard for user:', user.UserId);
      console.log('📅 Date range:', startDate, 'to', endDate);

      // Load dashboard stats and recent transactions in parallel
      const [statsData, transactionsData] = await Promise.all([
        budgetService.getDashboardStats(user.UserId, startDate, endDate),
        budgetService.getRecentTransactions(user.UserId, 5)
      ]);

      console.log('📊 Dashboard stats:', statsData);
      console.log('📋 Recent transactions:', transactionsData);

      setDashboardData(statsData);
      setRecentTransactions(transactionsData || []);
    } catch (err) {
      console.error('❌ Dashboard error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.UserId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

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

  const getCurrentMonth = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate tithe progress
  const getTitheProgress = () => {
    const totalTithe = dashboardData?.income?.totalTithe || 0;
    const paidTithe = dashboardData?.income?.paidTithe || 0;
    if (totalTithe === 0) return 0;
    return Math.min(paidTithe / totalTithe, 1);
  };

  // Calculate net position
  const getNetPosition = () => {
    const totalNet = dashboardData?.income?.totalNet || 0;
    const totalExpenses = dashboardData?.expenses?.totalAmount || 0;
    return totalNet - totalExpenses;
  };

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme?.background || '#f5f5f5' }]}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>Please log in to view your dashboard</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme?.background || '#f5f5f5' }]}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>Error: {error}</Text>
            <Text style={styles.debugText}>User ID: {user?.UserId?.substring(0, 8)}...</Text>
            <Button mode="contained" onPress={loadDashboardData} style={styles.retryButton}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme?.background || '#f5f5f5' }]}
      refreshControl={
        <RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.welcomeText}>
          Welcome, {user?.Name || user?.Username || 'User'}!
        </Text>
        <Text variant="bodyMedium" style={styles.monthText}>
          {getCurrentMonth()}
        </Text>
      </View>

      {/* Income Overview Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>💰 Income Overview</Text>
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <Text variant="bodySmall" style={styles.label}>Gross</Text>
              <Text variant="titleMedium" style={styles.amount}>
                {formatCurrency(dashboardData?.income?.totalGross)}
              </Text>
            </View>
            <View style={styles.incomeItem}>
              <Text variant="bodySmall" style={styles.label}>Net</Text>
              <Text variant="titleMedium" style={styles.amount}>
                {formatCurrency(dashboardData?.income?.totalNet)}
              </Text>
            </View>
            <View style={styles.incomeItem}>
              <Text variant="bodySmall" style={styles.label}>Tithe</Text>
              <Text variant="titleMedium" style={[styles.amount, { color: '#ff9800' }]}>
                {formatCurrency(dashboardData?.income?.totalTithe)}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Tithe Progress */}
          <View style={styles.titheSection}>
            <View style={styles.titheHeader}>
              <Text variant="bodyMedium">Tithe Progress</Text>
              <Text variant="bodySmall" style={styles.titheAmount}>
                {formatCurrency(dashboardData?.income?.paidTithe || 0)} / {formatCurrency(dashboardData?.income?.totalTithe)}
              </Text>
            </View>
            <ProgressBar 
              progress={getTitheProgress()} 
              color={getTitheProgress() >= 1 ? '#4CAF50' : '#ff9800'} 
              style={styles.progressBar}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Expenses Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>📉 Expenses by Category</Text>
          {dashboardData?.expenses?.categories && dashboardData.expenses.categories.length > 0 ? (
            dashboardData.expenses.categories.map((category, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text variant="bodyMedium" style={styles.categoryName}>
                    {category.TableName || category.tablename || 'Unknown'}
                  </Text>
                  <Text variant="bodySmall" style={styles.categoryCount}>
                    {category.transactionCount || category.TransactionCount || 0} transactions
                  </Text>
                </View>
                <Text variant="titleMedium" style={styles.categoryAmount}>
                  {formatCurrency(category.totalAmount || category.TotalAmount || 0)}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.noDataText}>
              No expense data for this month
            </Text>
          )}
          {dashboardData?.expenses?.totalAmount != null && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.totalRow}>
                <Text variant="titleMedium">Total Expenses:</Text>
                <Text variant="titleMedium" style={styles.totalAmount}>
                  {formatCurrency(dashboardData.expenses.totalAmount)}
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Net Income */}
      <Card style={[styles.card, styles.summaryCard]}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <Text variant="titleMedium">📊 Net Position</Text>
            <Text variant="headlineSmall" style={[
              styles.netAmount,
              getNetPosition() >= 0 ? styles.positive : styles.negative
            ]}>
              {formatCurrency(getNetPosition())}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Recent Transactions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>📋 Recent Transactions</Text>
          {recentTransactions && recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => (
              <View key={transaction.TransactionId || transaction.TransactionID || index} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text variant="bodyMedium" style={styles.transactionDescription}>
                    {transaction.Description || 'No description'}
                  </Text>
                  <View style={styles.transactionDetails}>
                    {transaction.TableName && (
                      <Chip mode="outlined" compact style={styles.categoryChip}>
                        {transaction.TableName}
                      </Chip>
                    )}
                    <Text variant="bodySmall" style={styles.transactionDate}>
                      {formatDate(transaction.Date || transaction.CreationTime)}
                    </Text>
                  </View>
                </View>
                <Text variant="titleSmall" style={styles.transactionAmount}>
                  -{formatCurrency(transaction.Amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.noDataText}>
              No recent transactions
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={[styles.card, styles.actionsCard]}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('Income')}
            >
              Add Income
            </Button>
            <Button 
              mode="outlined" 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('Transactions')}
            >
              Add Expense
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  monthText: {
    color: '#666',
    marginTop: 4,
  },
  card: {
    margin: 10,
    marginBottom: 15,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    margin: 20,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  debugText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 5,
  },
  retryButton: {
    marginTop: 10,
  },
  cardTitle: {
    marginBottom: 15,
    color: '#333',
    fontWeight: '600',
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  incomeItem: {
    alignItems: 'center',
  },
  label: {
    color: '#666',
    marginBottom: 5,
  },
  amount: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 15,
  },
  titheSection: {
    marginTop: 5,
  },
  titheHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titheAmount: {
    color: '#666',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '500',
    color: '#333',
  },
  categoryCount: {
    color: '#666',
    marginTop: 2,
  },
  categoryAmount: {
    color: '#f44336',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  totalAmount: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: '#e8f5e8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netAmount: {
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#f44336',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    marginRight: 10,
    height: 24,
  },
  transactionDate: {
    color: '#666',
  },
  transactionAmount: {
    color: '#f44336',
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  actionsCard: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 0.45,
  },
});

export default DashboardScreen;
