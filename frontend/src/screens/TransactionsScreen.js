import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { budgetService } from '../services/apiService';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await budgetService.getTransactions(user.UserId);
      setTransactions(response);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderTransaction = ({ item }) => (
    <Card style={styles.transactionCard}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <Text variant="titleMedium" style={styles.description}>
            {item.Description || 'No description'}
          </Text>
          <Text variant="titleLarge" style={styles.amount}>
            ${item.Amount?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={styles.transactionDetails}>
          <Chip mode="outlined" style={styles.chip}>
            {item.TableName || 'Uncategorized'}
          </Chip>
          {item.Category && (
            <Chip mode="outlined" style={styles.chip}>
              {item.Category}
            </Chip>
          )}
          {item.Status && (
            <Chip 
              mode="outlined" 
              style={[styles.chip, getStatusStyle(item.Status)]}
            >
              {item.Status}
            </Chip>
          )}
        </View>
        
        <View style={styles.dateInfo}>
          <Text variant="bodySmall" style={styles.dateText}>
            Date: {formatDate(item.Date)}
          </Text>
          {item.Due && (
            <Text variant="bodySmall" style={styles.dateText}>
              Due: {formatDate(item.Due)}
            </Text>
          )}
        </View>
        
        {item.Notes && (
          <Text variant="bodySmall" style={styles.notes}>
            {item.Notes}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { backgroundColor: '#E8F5E8' };
      case 'pending':
        return { backgroundColor: '#FFF3E0' };
      case 'overdue':
        return { backgroundColor: '#FFEBEE' };
      default:
        return {};
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.TransactionId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No transactions found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Tap the + button to add your first transaction
              </Text>
            </Card.Content>
          </Card>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          // TODO: Navigate to add transaction screen
          console.log('Add transaction pressed');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  transactionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  description: {
    flex: 1,
    marginRight: 12,
  },
  amount: {
    fontWeight: 'bold',
    color: '#F44336',
  },
  transactionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateText: {
    color: '#666',
  },
  notes: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyCard: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});