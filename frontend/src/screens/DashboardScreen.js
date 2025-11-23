import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { budgetService } from '../services/apiService';

export default function DashboardScreen() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await budgetService.getDashboardStats(
        user.UserId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setStats(response);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.greeting}>
          Welcome back, {user.Name || user.Username}!
        </Text>
        
        <Text variant="titleMedium" style={styles.monthTitle}>
          This Month's Summary
        </Text>

        {stats ? (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>Income</Text>
                <Text variant="headlineLarge" style={[styles.amount, styles.income]}>
                  ${stats.TotalIncome?.toFixed(2) || '0.00'}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>Expenses</Text>
                <Text variant="headlineLarge" style={[styles.amount, styles.expense]}>
                  ${stats.TotalExpenses?.toFixed(2) || '0.00'}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>Balance</Text>
                <Text variant="headlineLarge" style={[
                  styles.amount, 
                  stats.Balance >= 0 ? styles.positive : styles.negative
                ]}>
                  ${stats.Balance?.toFixed(2) || '0.00'}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>Savings Rate</Text>
                <Text variant="headlineLarge" style={[
                  styles.amount,
                  stats.SavingsRate >= 0 ? styles.positive : styles.negative
                ]}>
                  {stats.SavingsRate?.toFixed(1) || '0.0'}%
                </Text>
              </Card.Content>
            </Card>

            {stats.ExpenseBreakdown && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Expense Categories
                  </Text>
                  {JSON.parse(stats.ExpenseBreakdown).map((category, index) => (
                    <View key={index} style={styles.categoryRow}>
                      <Text variant="bodyMedium">{category.TableName}</Text>
                      <Text variant="bodyMedium" style={styles.categoryAmount}>
                        ${category.TotalExpenses?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.noDataText}>
                No financial data available for this month.
              </Text>
              <Text variant="bodyMedium" style={styles.noDataSubtext}>
                Start by adding some income or transactions to see your budget summary.
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            style={styles.actionButton}
            onPress={() => {/* Navigate to add transaction */}}
          >
            Add Transaction
          </Button>
          <Button 
            mode="outlined" 
            style={styles.actionButton}
            onPress={() => {/* Navigate to add income */}}
          >
            Add Income
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  greeting: {
    marginBottom: 10,
    textAlign: 'center',
    color: '#6200ee',
  },
  monthTitle: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 10,
    color: '#666',
  },
  amount: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  income: {
    color: '#4CAF50',
  },
  expense: {
    color: '#F44336',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryAmount: {
    fontWeight: 'bold',
  },
  noDataText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  noDataSubtext: {
    textAlign: 'center',
    color: '#666',
  },
  actionButtons: {
    marginTop: 20,
  },
  actionButton: {
    marginBottom: 10,
  },
});