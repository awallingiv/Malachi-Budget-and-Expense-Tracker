import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import { useSmartDefaults } from '../hooks/useSmartDefaults';
import { useMerchantDefaults } from '../hooks/useMerchantDefaults';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
  
  // Filter states
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Default categories
  const defaultCategories = [
    'Groceries', 'Utilities', 'Bills', 'Transportation', 'Entertainment',
    'Shopping', 'Healthcare', 'Dining', 'Subscriptions', 'Other'
  ];

  // New transaction form state
  const [newTransaction, setNewTransaction] = useState({
    TableName: '',
    Description: '',
    Amount: '',
    Date: new Date().toISOString().split('T')[0],
    Notes: '',
    Status: 'paid'
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
      
      setTransactions(transactionsData || []);
      const allCats = [...new Set([...(categoriesData || []), ...defaultCategories])];
      setCategories(allCats);
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

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersExpanded(!filtersExpanded);
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.TableName || !newTransaction.Amount) {
      Alert.alert('Required', 'Please enter a category and amount');
      return;
    }

    try {
      const transactionData = {
        UserID: user.UserId,
        Username: user.Username,
        TableName: newTransaction.TableName,
        Description: newTransaction.Description,
        Amount: parseFloat(newTransaction.Amount),
        Date: newTransaction.Date,
        Notes: newTransaction.Notes,
        Status: newTransaction.Status
      };

      const result = await budgetService.createTransaction(transactionData);
      
      if (result.success) {
        if (newTransaction.TableName) {
          updateLastExpenseCategory(newTransaction.TableName);
        }
        if (newTransaction.Description && newTransaction.TableName) {
          await recordMerchant(newTransaction.Description, newTransaction.TableName);
        }
        setShowAddModal(false);
        resetNewTransaction();
        loadData();
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      Alert.alert('Error', 'Failed to create transaction');
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
      Alert.alert('Error', 'Failed to update transaction');
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
              const result = await budgetService.deleteTransaction(transactionId, user.UserId);
              if (result && result.success) {
                loadData();
              } else {
                Alert.alert('Error', result?.error || 'Failed to delete transaction');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete transaction');
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
      `Delete ${selectedIds.length} transaction(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = selectedIds.map(id => 
                budgetService.deleteTransaction(id, user.UserId)
              );
              await Promise.all(deletePromises);
              setSelectedIds([]);
              setSelectMode(false);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some transactions');
              loadData();
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
      Notes: '',
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
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredTransactions = transactions
    .filter(t => {
      const matchesCategory = filterCategory === 'all' || t.TableName === filterCategory;
      const matchesSearch = !searchQuery || 
        t.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Calculate total
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

  const renderTransaction = ({ item }) => (
    <TouchableOpacity
      style={[styles.transactionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        if (selectMode) {
          toggleSelectTransaction(item.TransactionId);
        } else {
          setSelectedTransaction(item);
          setShowEditModal(true);
        }
      }}
      onLongPress={() => {
        if (!selectMode) {
          setSelectMode(true);
          setSelectedIds([item.TransactionId]);
        }
      }}
    >
      <View style={styles.transactionRow}>
        {selectMode && (
          <View style={[styles.checkbox, selectedIds.includes(item.TransactionId) && { backgroundColor: theme.primary }]}>
            {selectedIds.includes(item.TransactionId) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        )}
        <View style={[styles.transactionIcon, { backgroundColor: `${theme.accent}20` }]}>
          <Text style={styles.transactionIconText}>💳</Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDesc, { color: theme.text }]} numberOfLines={1}>
            {item.Description || item.TableName || 'Expense'}
          </Text>
          <Text style={[styles.transactionMeta, { color: theme.textSecondary }]}>
            {item.TableName} • {formatDate(item.Date)}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: theme.accent }]}>
          -{formatCurrency(item.Amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Expenses</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {filteredTransactions.length} transactions • {formatCurrency(totalAmount)}
        </Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchText, { color: theme.text }]}
              placeholder="Search expenses..."
              placeholderTextColor={theme.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, filtersExpanded && { backgroundColor: theme.primary }]}
            onPress={toggleFilters}
          >
            <Text style={[styles.filterIcon, filtersExpanded && { color: theme.textOnPrimary }]}>
              {filtersExpanded ? '✕' : '⚙️'}
            </Text>
          </TouchableOpacity>
          {!selectMode ? (
            <TouchableOpacity
              style={[styles.selectButton, { borderColor: theme.border }]}
              onPress={() => setSelectMode(true)}
            >
              <Text style={[styles.selectText, { color: theme.textSecondary }]}>Select</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: theme.accent }]}
              onPress={() => { setSelectMode(false); setSelectedIds([]); }}
            >
              <Text style={[styles.selectText, { color: theme.textOnPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Expandable Filters */}
        {filtersExpanded && (
          <View style={styles.filtersPanel}>
            {/* Sort */}
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Sort by</Text>
            <View style={styles.sortRow}>
              {['date', 'amount', 'category'].map((sort) => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.sortChip,
                    { borderColor: theme.border },
                    sortBy === sort && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}
                  onPress={() => setSortBy(sort)}
                >
                  <Text style={[
                    styles.sortChipText,
                    { color: theme.textSecondary },
                    sortBy === sort && { color: theme.textOnPrimary }
                  ]}>
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date filters */}
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Date range</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.filterInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Start date"
                placeholderTextColor={theme.textDisabled}
                value={startDate}
                onChangeText={setStartDate}
              />
              <TextInput
                style={[styles.filterInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="End date"
                placeholderTextColor={theme.textDisabled}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>

            {/* Amount filters */}
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Amount range</Text>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.filterInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Min $"
                placeholderTextColor={theme.textDisabled}
                value={minAmount}
                onChangeText={setMinAmount}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.filterInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Max $"
                placeholderTextColor={theme.textDisabled}
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Clear filters */}
            <TouchableOpacity
              style={styles.clearFilters}
              onPress={() => {
                setStartDate('');
                setEndDate('');
                setMinAmount('');
                setMaxAmount('');
                setFilterCategory('all');
              }}
            >
              <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear all filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              { borderColor: theme.border },
              filterCategory === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setFilterCategory('all')}
          >
            <Text style={[
              styles.categoryChipText,
              { color: theme.textSecondary },
              filterCategory === 'all' && { color: theme.textOnPrimary }
            ]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryChip,
                { borderColor: theme.border },
                filterCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[
                styles.categoryChipText,
                { color: theme.textSecondary },
                filterCategory === cat && { color: theme.textOnPrimary }
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: `${theme.error}20` }]}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.TransactionId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>No expenses found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Tap + to add your first expense
            </Text>
          </View>
        )}
      />

      {/* Bulk actions bar */}
      {selectMode && selectedIds.length > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Text style={[styles.bulkText, { color: theme.text }]}>{selectedIds.length} selected</Text>
          <TouchableOpacity
            style={[styles.bulkDeleteButton, { backgroundColor: theme.error }]}
            onPress={handleBulkDelete}
          >
            <Text style={styles.bulkDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {!selectMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, bottom: 90 + insets.bottom }]}
          onPress={() => { resetNewTransaction(); setShowAddModal(true); }}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Transaction Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Category Select */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalCategoryScroll}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalCategoryChip,
                      { borderColor: theme.border },
                      newTransaction.TableName === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setNewTransaction(prev => ({ ...prev, TableName: cat }))}
                  >
                    <Text style={[
                      styles.modalCategoryText,
                      { color: theme.textSecondary },
                      newTransaction.TableName === cat && { color: theme.textOnPrimary }
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="What was this for?"
                placeholderTextColor={theme.textDisabled}
                value={newTransaction.Description}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Description: text }))}
              />

              {/* Merchant suggestions */}
              {getSuggestions(newTransaction.Description).length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                  {getSuggestions(newTransaction.Description).map((merchant) => (
                    <TouchableOpacity
                      key={merchant}
                      style={[styles.suggestionChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => {
                        const defaultCat = getDefaultCategory(merchant);
                        setNewTransaction(prev => ({
                          ...prev,
                          Description: merchant,
                          TableName: defaultCat || prev.TableName,
                        }));
                      }}
                    >
                      <Text style={[styles.suggestionText, { color: theme.text }]}>{merchant}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textDisabled}
                value={newTransaction.Amount}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Amount: text }))}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textDisabled}
                value={newTransaction.Date}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Date: text }))}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="Additional details..."
                placeholderTextColor={theme.textDisabled}
                value={newTransaction.Notes}
                onChangeText={(text) => setNewTransaction(prev => ({ ...prev, Notes: text }))}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleAddTransaction}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Expense</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={selectedTransaction.Description || ''}
                  onChangeText={(text) => setSelectedTransaction(prev => ({ ...prev, Description: text }))}
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Amount</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={selectedTransaction.Amount?.toString() || ''}
                  onChangeText={(text) => setSelectedTransaction(prev => ({ ...prev, Amount: parseFloat(text) || 0 }))}
                  keyboardType="decimal-pad"
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputMultiline, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={selectedTransaction.Notes || ''}
                  onChangeText={(text) => setSelectedTransaction(prev => ({ ...prev, Notes: text }))}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.deleteButton, { borderColor: theme.error }]}
                  onPress={() => {
                    setShowEditModal(false);
                    handleDeleteTransaction(selectedTransaction.TransactionId);
                  }}
                >
                  <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Transaction</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleEditTransaction}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnPrimary }]}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchBar: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 18,
  },
  selectButton: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtersPanel: {
    marginTop: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  clearFilters: {
    marginTop: 16,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryScroll: {
    marginTop: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 150,
  },
  transactionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  bulkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bulkDeleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bulkDeleteText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalCategoryScroll: {
    marginBottom: 8,
  },
  modalCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  modalCategoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionsScroll: {
    marginTop: 8,
    marginBottom: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
  },
  deleteButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
