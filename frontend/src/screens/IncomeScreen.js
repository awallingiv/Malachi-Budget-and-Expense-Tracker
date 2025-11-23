import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { budgetService } from '../services/apiService';

export default function IncomeScreen() {
  const [income, setIncome] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadIncome();
  }, []);

  const loadIncome = async () => {
    try {
      setIsLoading(true);
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), 0, 1); // Start of year
      const endDate = new Date(currentDate.getFullYear(), 11, 31); // End of year
      
      const response = await budgetService.getIncome(
        user.UserId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setIncome(response);
    } catch (error) {
      console.error('Error loading income:', error);
      setIncome([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncome();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    // Handle VARCHAR date format from database
    return dateString;
  };

  const renderIncomeItem = ({ item }) => (
    <Card style={styles.incomeCard}>
      <Card.Content>
        <View style={styles.incomeHeader}>
          <Text variant="titleMedium" style={styles.description}>
            {item.Description || 'Income'}
          </Text>
          <Text variant="titleLarge" style={styles.amount}>
            ${item.Net?.toFixed(2) || '0.00'}
          </Text>
        </View>
        
        <View style={styles.incomeDetails}>
          <View style={styles.detailRow}>
            <Text variant="bodyMedium">Gross: </Text>
            <Text variant="bodyMedium" style={styles.detailValue}>
              ${item.Gross?.toFixed(2) || '0.00'}
            </Text>
          </View>
          
          {item.Tithe && (
            <View style={styles.detailRow}>
              <Text variant="bodyMedium">Tithe: </Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                ${item.Tithe?.toFixed(2) || '0.00'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.statusRow}>
          {item.PaycheckStatus && (
            <Chip 
              mode="outlined" 
              style={[styles.chip, getPaycheckStatusStyle(item.PaycheckStatus)]}
            >
              {item.PaycheckStatus}
            </Chip>
          )}
          {item.TitheStatus && (
            <Chip 
              mode="outlined" 
              style={[styles.chip, getTitheStatusStyle(item.TitheStatus)]}
            >
              Tithe: {item.TitheStatus}
            </Chip>
          )}
        </View>
        
        <View style={styles.dateInfo}>
          <Text variant="bodySmall" style={styles.dateText}>
            Date: {formatDate(item.Date)}
          </Text>
          <Text variant="bodySmall" style={styles.dateText}>
            Added: {new Date(item.CreationTime).toLocaleDateString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const getPaycheckStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'received':
        return { backgroundColor: '#E8F5E8' };
      case 'pending':
        return { backgroundColor: '#FFF3E0' };
      default:
        return {};
    }
  };

  const getTitheStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { backgroundColor: '#E8F5E8' };
      case 'pending':
        return { backgroundColor: '#FFF3E0' };
      default:
        return {};
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading income...</Text>
      </View>
    );
  }

  // Calculate totals
  const totalNet = income.reduce((sum, item) => sum + (item.Net || 0), 0);
  const totalGross = income.reduce((sum, item) => sum + (item.Gross || 0), 0);
  const totalTithe = income.reduce((sum, item) => sum + (item.Tithe || 0), 0);

  return (
    <View style={styles.container}>
      {income.length > 0 && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.summaryTitle}>
              Year to Date Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Total Net Income:</Text>
              <Text variant="titleMedium" style={styles.summaryAmount}>
                ${totalNet.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Total Gross Income:</Text>
              <Text variant="bodyMedium">${totalGross.toFixed(2)}</Text>
            </View>
            {totalTithe > 0 && (
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Total Tithe:</Text>
                <Text variant="bodyMedium">${totalTithe.toFixed(2)}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
      
      <FlatList
        data={income}
        renderItem={renderIncomeItem}
        keyExtractor={(item) => item.IncomeId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No income records found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Tap the + button to add your first income entry
              </Text>
            </Card.Content>
          </Card>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          // TODO: Navigate to add income screen
          console.log('Add income pressed');
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
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: '#E3F2FD',
  },
  summaryTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryAmount: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80, // Space for FAB
  },
  incomeCard: {
    marginBottom: 12,
    elevation: 2,
  },
  incomeHeader: {
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
    color: '#4CAF50',
  },
  incomeDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  detailValue: {
    fontWeight: '500',
  },
  statusRow: {
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
  },
  dateText: {
    color: '#666',
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