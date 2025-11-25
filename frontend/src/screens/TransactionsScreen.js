import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { 
  Text, 
  Card, 
  FAB, 
  Portal, 
  Modal, 
  TextInput, 
  Chip,
  IconButton,
  SegmentedButtons,
  Menu,
  Searchbar
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import ModernButton from '../components/ModernButton';
import ModernInput from '../components/ModernInput';

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // New transaction form state
  const [newTransaction, setNewTransaction] = useState({
    TableName: '',
    Description: '',
    Amount: '',
    Date: new Date().toISOString().split('T')[0],
    Due: '',
    Notes: '',
    Category: '',
    Status: 'pending'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [transactionsData, categoriesData] = await Promise.all([
        budgetService.getTransactions(user.UserId),
        budgetService.getUserCategories(user.UserId)
      ]);
      
      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleAddTransaction = async () => {
    try {
      const transactionData = {
        UserID: user.UserId,
        Username: user.Username,
        TableName: newTransaction.TableName,
        Description: newTransaction.Description,
        Amount: parseFloat(newTransaction.Amount),
        Date: newTransaction.Date,
        Due: newTransaction.Due || null,
        Notes: newTransaction.Notes,
        Category: newTransaction.Category,
        Status: newTransaction.Status
      };

      const result = await budgetService.createTransaction(transactionData);
      
      if (result.success) {
        setShowAddModal(false);
        resetNewTransaction();
        loadData();
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      setError('Failed to create transaction');
    }
  };

  const handleEditTransaction = async () => {
    try {
      const result = await budgetService.updateTransaction(selectedTransaction.TransactionId, {
        UserID: user.UserId,
        ...selectedTransaction
      });
      
      if (result.success) {
        setShowEditModal(false);
        setSelectedTransaction(null);
        loadData();
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
      setError('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      const result = await budgetService.deleteTransaction(transactionId, user.UserId);
      
      if (result.success) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      setError('Failed to delete transaction');
    }
  };

  const resetNewTransaction = () => {
    setNewTransaction({
      TableName: '',
      Description: '',
      Amount: '',
      Date: new Date().toISOString().split('T')[0],
      Due: '',
      Notes: '',
      Category: '',
      Status: 'pending'
    });
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

  const filteredTransactions = transactions
    .filter(t => {
      const matchesCategory = filterCategory === 'all' || t.TableName === filterCategory;
      const matchesSearch = t.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.TableName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (b.Amount || 0) - (a.Amount || 0);
        case 'category':
          return (a.TableName || '').localeCompare(b.TableName || '');
        case 'date':
        default:
          return new Date(b.Date || 0) - new Date(a.Date || 0);
      }
    });

  const renderTransaction = ({ item }) => (
    <Card style={styles.transactionCard}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text variant="titleMedium" style={styles.transactionDescription}>
              {item.Description || 'No description'}
            </Text>
            <View style={styles.transactionDetails}>
              <Chip mode="outlined" compact style={styles.categoryChip}>
                {item.TableName}
              </Chip>
              <Text variant="bodySmall" style={styles.transactionDate}>
                {formatDate(item.Date)}
              </Text>
            </View>
          </View>
          <View style={styles.transactionActions}>
            <Text variant="titleLarge" style={styles.transactionAmount}>
              {formatCurrency(item.Amount)}
            </Text>
            <View style={styles.actionButtons}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => {
                  setSelectedTransaction(item);
                  setShowEditModal(true);
                }}
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor="#f44336"
                onPress={() => handleDeleteTransaction(item.TransactionId)}
              />
            </View>
          </View>
        </View>
        
        {item.Notes && (
          <Text variant="bodySmall" style={styles.transactionNotes}>
            {item.Notes}
          </Text>
        )}
        
        {item.Status && (
          <Chip 
            mode="flat" 
            compact 
            style={[
              styles.statusChip,
              { backgroundColor: item.Status === 'paid' ? '#e8f5e8' : '#fff3e0' }
            ]}
          >
            {item.Status}
          </Chip>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Controls */}
      <View style={styles.headerControls}>
        <Searchbar
          placeholder="Search transactions..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filterControls}>
          <SegmentedButtons
            value={sortBy}
            onValueChange={setSortBy}
            buttons={[
              { value: 'date', label: 'Date' },
              { value: 'amount', label: 'Amount' },
              { value: 'category', label: 'Category' }
            ]}
            style={styles.sortButtons}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          <Chip 
            mode={filterCategory === 'all' ? 'flat' : 'outlined'}
            onPress={() => setFilterCategory('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          {categories.map((category, index) => (
            <Chip
              key={index}
              mode={filterCategory === category ? 'flat' : 'outlined'}
              onPress={() => setFilterCategory(category)}
              style={styles.filterChip}
            >
              {category}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={loadData} mode="outlined">Retry</Button>
          </Card.Content>
        </Card>
      )}

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.TransactionId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text variant="bodySmall">Add your first expense to get started</Text>
            </Card.Content>
          </Card>
        )}
      />

      {/* Add Transaction FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      />

      {/* Add Transaction Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Add New Transaction</Text>
                <IconButton icon="close" onPress={() => setShowAddModal(false)} />
              </View>

              <TextInput
                label="Category"
                value={newTransaction.TableName}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, TableName: text }))}
                style={styles.input}
                placeholder="e.g., Groceries, Bills"
              />

              <TextInput
                label="Description"
                value={newTransaction.Description}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Description: text }))}
                style={styles.input}
                placeholder="What did you spend on?"
              />

              <TextInput
                label="Amount"
                value={newTransaction.Amount}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Amount: text }))}
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="0.00"
              />

              <TextInput
                label="Date"
                value={newTransaction.Date}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Date: text }))}
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="Notes (Optional)"
                value={newTransaction.Notes}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Notes: text }))}
                style={styles.input}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <ModernButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <ModernButton
                  title="Add Transaction"
                  variant="primary"
                  onPress={handleAddTransaction}
                  disabled={!newTransaction.TableName || !newTransaction.Description || !newTransaction.Amount}
                  icon="plus"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Edit Transaction Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Edit Transaction</Text>
                <IconButton icon="close" onPress={() => setShowEditModal(false)} />
              </View>

              {selectedTransaction && (
                <>
                  <TextInput
                    label="Description"
                    value={selectedTransaction.Description || ''}
                    onChangeText={(text) => setSelectedTransaction(prev => ({ ...prev, Description: text }))}
                    style={styles.input}
                  />

                  <TextInput
                    label="Amount"
                    value={selectedTransaction.Amount?.toString() || ''}
                    onChangeText={(text) => setSelectedTransaction(prev => ({ ...prev, Amount: parseFloat(text) || 0 }))}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />

                  <TextInput
                    label="Notes"
                    value={selectedTransaction.Notes || ''}
                    onChangeText={(text) => setSelectedTransaction(prev => ({ ...prev, Notes: text }))}
                    style={styles.input}
                    multiline
                  />

                  <View style={styles.modalButtons}>
                    <Button mode="outlined" onPress={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button mode="contained" onPress={handleEditTransaction}>
                      Update
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
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
    padding: 20,
  },
  headerControls: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchbar: {
    marginBottom: 12,
  },
  filterControls: {
    marginBottom: 12,
  },
  sortButtons: {
    marginBottom: 8,
  },
  categoryFilter: {
    maxHeight: 50,
  },
  filterChip: {
    marginRight: 8,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  transactionCard: {
    marginBottom: 12,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    marginBottom: 4,
    fontWeight: '600',
  },
  transactionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryChip: {
    marginRight: 8,
  },
  transactionDate: {
    color: '#666',
  },
  transactionActions: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  transactionNotes: {
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  emptyCard: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'transparent',
    padding: 20,
    margin: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
});