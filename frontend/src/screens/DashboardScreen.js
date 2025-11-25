import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Button } from 'react-native-paper';

const DashboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading dashboard data for user:', mockUserId);
      
      // Simple test data first
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
      <Text style={styles.title}>ReactBudget Mobile</Text>
      
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
              <Text style={styles.cardTitle}>Income Overview</Text>
              <Text style={styles.statText}>
                Gross: ${dashboardData?.income?.totalGross?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.statText}>
                Net: ${dashboardData?.income?.totalNet?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.statText}>
                Tithe: ${dashboardData?.income?.totalTithe?.toFixed(2) || '0.00'}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Expenses</Text>
              <Text style={styles.statText}>
                Total: ${dashboardData?.expenses?.total?.toFixed(2) || '0.00'}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Platform Info</Text>
              <Text style={styles.statText}>Mobile Dashboard Working!</Text>
              <Text style={styles.statText}>User: {mockUserId.substring(0, 8)}...</Text>
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
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  errorCard: {
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});

export default DashboardScreen;
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
          {dashboardData?.expenses?.totalAmount && (
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
              (dashboardData?.income?.totalNet || 0) - (dashboardData?.expenses?.totalAmount || 0) >= 0 
                ? styles.positive : styles.negative
            ]}>
              {formatCurrency((dashboardData?.income?.totalNet || 0) - (dashboardData?.expenses?.totalAmount || 0))}
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
                    <Chip mode="outlined" compact style={styles.categoryChip}>
                      {transaction.TableName || 'General'}
                    </Chip>
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
            <Button mode="contained" style={styles.actionButton} onPress={() => {}}>
              Add Income
            </Button>
            <Button mode="outlined" style={styles.actionButton} onPress={() => {}}>
              Add Expense
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

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