import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList, Alert } from 'react-native';
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
  Searchbar,
  Checkbox,
  Button,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import ModernButton from '../components/ModernButton';
import ModernInput from '../components/ModernInput';
import { useSmartDefaults } from '../hooks/useSmartDefaults';
import { useMerchantDefaults } from '../hooks/useMerchantDefaults';

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const {
    today,
    lastExpenseCategory,
    updateLastExpenseCategory,
    defaultStatusForDate,
  } = useSmartDefaults(user?.UserId);
  const {
    recordMerchant,
    getDefaultCategory,
    getSuggestions,
  } = useMerchantDefaults(user?.UserId);
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [savedViews, setSavedViews] = useState([]);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [viewName, setViewName] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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
    loadSavedViews();
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

  const loadSavedViews = async () => {
    if (!user?.UserId) return;
    try {
      const views = await budgetService.getSavedViews(user.UserId);
      setSavedViews(views || []);
    } catch (err) {
      console.error('Failed to load saved views:', err);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
    loadSavedViews();
  }, []);

  const buildCurrentFilterConfig = () => ({
    filterCategory,
    searchQuery,
    sortBy,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  });

  const applyFilterConfig = (config) => {
    setFilterCategory(config.filterCategory ?? 'all');
    setSearchQuery(config.searchQuery ?? '');
    setSortBy(config.sortBy ?? 'date');
    setStartDate(config.startDate ?? '');
    setEndDate(config.endDate ?? '');
    setMinAmount(config.minAmount ?? '');
    setMaxAmount(config.maxAmount ?? '');
  };

  const handleSaveCurrentView = async () => {
    if (!viewName.trim()) return;
    try {
      const filterConfig = JSON.stringify(buildCurrentFilterConfig());
      const payload = {
        UserID: user.UserId,
        Name: viewName.trim(),
        FilterConfig: filterConfig,
      };
      const result = await budgetService.createSavedView(payload);
      if (result?.success && result.view) {
        setSavedViews(prev => [result.view, ...prev]);
        setShowSaveViewModal(false);
        setViewName('');
      }
    } catch (err) {
      console.error('Failed to save view:', err);
      setError('Failed to save view');
    }
  };

  const handleApplyView = (view) => {
    if (!view?.FilterConfig) return;
    try {
      const config = JSON.parse(view.FilterConfig);
      applyFilterConfig(config || {});
    } catch (err) {
      console.error('Invalid FilterConfig JSON for view', view.SavedViewID, err);
    }
  };

  const handleDeleteView = async (viewId) => {
    try {
      const result = await budgetService.deleteSavedView(viewId, user.UserId);
      if (result?.success) {
        setSavedViews(prev => prev.filter(v => v.SavedViewID !== viewId));
      }
    } catch (err) {
      console.error('Failed to delete view:', err);
      setError('Failed to delete view');
    }
  };

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
        if (newTransaction.TableName) {
          updateLastExpenseCategory(newTransaction.TableName);
        }
        if (newTransaction.Description && newTransaction.TableName) {
          // Treat description as merchant for mapping
          await recordMerchant(newTransaction.Description, newTransaction.TableName);
        }
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
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting transaction:', transactionId, 'for user:', user.UserId);
              const result = await budgetService.deleteTransaction(transactionId, user.UserId);
              console.log('Delete result:', result);
              
              if (result && result.success) {
                loadData();
              } else {
                const errorMsg = result?.error || result?.message || 'Failed to delete transaction';
                console.error('Delete failed:', errorMsg);
                Alert.alert('Error', errorMsg);
              }
            } catch (error) {
              console.error('Failed to delete transaction:', error);
              const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete transaction';
              Alert.alert('Error', errorMsg);
            }
          }
        }
      ]
    );
  };

  const toggleSelectTransaction = (transactionId) => {
    setSelectedIds((prev) =>
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      'Delete Transactions',
      `Are you sure you want to delete ${selectedIds.length} transaction(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all selected transactions in parallel
              const deletePromises = selectedIds.map(id => 
                budgetService.deleteTransaction(id, user.UserId)
              );
              
              const results = await Promise.all(deletePromises);
              
              // Check if all deletions were successful
              const allSuccessful = results.every(result => result.success);
              
              if (allSuccessful) {
                // Clear selection and refresh data
                setSelectedIds([]);
                setSelectMode(false);
                loadData();
              } else {
                // Some deletions failed
                const failedCount = results.filter(r => !r.success).length;
                Alert.alert(
                  'Partial Success',
                  `${selectedIds.length - failedCount} transaction(s) deleted, but ${failedCount} failed to delete.`
                );
                // Still refresh to show updated state
                setSelectedIds([]);
                setSelectMode(false);
                loadData();
              }
            } catch (error) {
              console.error('Failed to delete transactions:', error);
              Alert.alert('Error', error.message || 'Failed to delete transactions');
            }
          }
        }
      ]
    );
  };

  const resetNewTransaction = () => {
    setNewTransaction({
      TableName: lastExpenseCategory || '',
      Description: '',
      Amount: '',
      Date: today,
      Due: '',
      Notes: '',
      Category: '',
      Status: defaultStatusForDate(today)
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
      const date = t.Date ? new Date(t.Date) : null;
      const withinStart = !startDate || (date && date >= new Date(startDate));
      const withinEnd = !endDate || (date && date <= new Date(endDate));
      const amount = parseFloat(t.Amount) || 0;
      const withinMin = !minAmount || amount >= parseFloat(minAmount);
      const withinMax = !maxAmount || amount <= parseFloat(maxAmount);
      return matchesCategory && matchesSearch && withinStart && withinEnd && withinMin && withinMax;
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
          {selectMode && (
            <Checkbox
              status={selectedIds.includes(item.TransactionId) ? 'checked' : 'unchecked'}
              onPress={() => toggleSelectTransaction(item.TransactionId)}
            />
          )}
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
          {!selectMode && (
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
          )}
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
        <View style={styles.topBar}>
          <Searchbar
            placeholder="Search transactions..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          <Button
            mode={selectMode ? 'contained-tonal' : 'outlined'}
            onPress={() => {
              setSelectMode(!selectMode);
              if (selectMode) {
                setSelectedIds([]);
              }
            }}
          >
            {selectMode ? 'Cancel select' : 'Select'}
          </Button>
        </View>
        
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
          <View style={styles.dateFilters}>
            <TextInput
              label="Start date"
              value={startDate}
              onChangeText={setStartDate}
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
            />
            <TextInput
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.amountFilters}>
            <TextInput
              label="Min amount"
              value={minAmount}
              onChangeText={setMinAmount}
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <TextInput
              label="Max amount"
              value={maxAmount}
              onChangeText={setMaxAmount}
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
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

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.savedViewsBar}
          >
            {savedViews.map((view) => (
              <Chip
                key={view.SavedViewID}
                mode="outlined"
                onPress={() => handleApplyView(view)}
                onLongPress={() => handleDeleteView(view.SavedViewID)}
                style={styles.savedViewChip}
              >
                {view.Name}
              </Chip>
            ))}
          </ScrollView>
        )}

        <View style={styles.savedViewActions}>
          <Button
            mode="text"
            onPress={() => {
              setViewName('');
              setShowSaveViewModal(true);
            }}
          >
            Save current filters as view
          </Button>
        </View>
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

      {/* Bulk actions bar */}
      {selectMode && selectedIds.length > 0 && (
        <View style={styles.bulkActionsBar}>
          <Text style={styles.bulkActionsText}>{selectedIds.length} selected</Text>
          <Button
            mode="outlined"
            onPress={handleBulkDelete}
            textColor="#f44336"
          >
            Delete selected
          </Button>
        </View>
      )}

      {/* Add Transaction FAB */}
      {!selectMode && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        />
      )}

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
                label="Merchant / Description"
                value={newTransaction.Description}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Description: text }))}
                style={styles.input}
                placeholder="e.g., Amazon, Starbucks"
              />

              {/* Merchant suggestions */}
              {getSuggestions(newTransaction.Description).length > 0 && (
                <View style={styles.merchantSuggestions}>
                  {getSuggestions(newTransaction.Description).map((merchant) => (
                    <Chip
                      key={merchant}
                      style={styles.merchantChip}
                      onPress={() => {
                        const defaultCat = getDefaultCategory(merchant);
                        setNewTransaction(prev => ({
                          ...prev,
                          Description: merchant,
                          TableName: defaultCat || prev.TableName,
                        }));
                      }}
                    >
                      {merchant}
                    </Chip>
                  ))}
                </View>
              )}

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

      {/* Save View Modal */}
      <Portal>
        <Modal
          visible={showSaveViewModal}
          onDismiss={() => setShowSaveViewModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Save Filter View</Text>
                <IconButton icon="close" onPress={() => setShowSaveViewModal(false)} />
              </View>

              <TextInput
                label="View name"
                value={viewName}
                onChangeText={setViewName}
                style={styles.input}
                placeholder="e.g., Last 30 days – Food"
              />

              <View style={styles.modalButtons}>
                <ModernButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowSaveViewModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <ModernButton
                  title="Save"
                  variant="primary"
                  onPress={handleSaveCurrentView}
                  disabled={!viewName.trim()}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
  },
  filterControls: {
    marginBottom: 12,
  },
  sortButtons: {
    marginBottom: 8,
  },
  dateFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateInput: {
    flex: 1,
  },
  amountFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
  },
  categoryFilter: {
    maxHeight: 50,
  },
  filterChip: {
    marginRight: 8,
  },
  merchantSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  merchantChip: {
    marginRight: 6,
    marginBottom: 6,
  },
  savedViewsBar: {
    marginTop: 10,
    maxHeight: 40,
  },
  savedViewChip: {
    marginRight: 8,
  },
  savedViewActions: {
    marginTop: 8,
  },
  bulkActionsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionsText: {
    fontSize: 14,
    color: '#333',
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