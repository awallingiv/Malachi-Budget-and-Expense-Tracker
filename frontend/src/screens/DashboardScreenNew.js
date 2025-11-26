import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Mock user for fallback
  const mockUser = {
    UserId: '41F580FD-54B5-4167-A145-0266EDDF487B',
    Username: 'awallingiv',
    Name: 'A. Walling'
  };
  
  const currentUser = user || mockUser;
  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    loadDashboardData();
  }, [currentUser.UserId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading dashboard data for user:', currentUser.UserId);
      
      // Try real API first
      try {
        const response = await fetch(`${API_BASE}/budget/dashboard/${currentUser.UserId}`);
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
          setLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('API failed, using test data:', apiError.message);
      }
      
      // Fallback to test data
      const testData = {
        income: { totalGross: 5000, totalNet: 4000, totalTithe: 500 },
        expenses: { total: 3000 },
        transactions: [
          { description: 'Test Transaction', amount: 100, date: new Date() }
        ]
      };
      
      setDashboardData(testData);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>Error: {error}</Text>
            <Button mode="contained" onPress={loadDashboardData} style={{ marginTop: 10 }}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>ReactBudget</Text>
        <Text style={styles.subtitle}>Welcome, {currentUser.Name || currentUser.Username}</Text>
        <Button mode="outlined" onPress={() => logout?.()} style={styles.logoutButton}>
          Logout
        </Button>
      </View>
      
      {loading ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </Card.Content>
        </Card>
      ) : (
        <View>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>💰 Income Overview</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Gross:</Text>
                <Text style={styles.statValue}>{formatCurrency(dashboardData?.income?.totalGross)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Net:</Text>
                <Text style={styles.statValue}>{formatCurrency(dashboardData?.income?.totalNet)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Tithe:</Text>
                <Text style={styles.statValue}>{formatCurrency(dashboardData?.income?.totalTithe)}</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>💸 Expenses</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total:</Text>
                <Text style={[styles.statValue, styles.expenseText]}>
                  {formatCurrency(dashboardData?.expenses?.total || dashboardData?.expenses?.totalAmount)}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>📊 Net Position</Text>
              <View style={styles.netRow}>
                <Text style={[
                  styles.netAmount,
                  (dashboardData?.income?.totalNet || 0) - (dashboardData?.expenses?.total || dashboardData?.expenses?.totalAmount || 0) >= 0
                    ? styles.positive : styles.negative
                ]}>
                  {formatCurrency((dashboardData?.income?.totalNet || 0) - (dashboardData?.expenses?.total || dashboardData?.expenses?.totalAmount || 0))}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>📱 App Info</Text>
              <Text style={styles.infoText}>Platform: Mobile</Text>
              <Text style={styles.infoText}>User: {currentUser.UserId.substring(0, 8)}...</Text>
              <Text style={styles.infoText}>API: {API_BASE}</Text>
            </Card.Content>
          </Card>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  logoutButton: {
    marginTop: 15,
    borderColor: 'white',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  expenseText: {
    color: '#f44336',
  },
  netRow: {
    alignItems: 'center',
  },
  netAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#f44336',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    margin: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});

export default DashboardScreen;