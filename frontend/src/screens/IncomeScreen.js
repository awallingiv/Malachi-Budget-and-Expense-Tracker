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
import AsyncStorage from '@react-native-async-storage/async-storage';

const TITHE_PERCENTAGE_KEY = '@tithe_percentage';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function IncomeScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [error, setError] = useState(null);

  // Filter states
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // New income form state
  const [newIncome, setNewIncome] = useState({
    Description: '',
    Gross: '',
    Net: '',
    Tithe: '',
    Date: new Date().toISOString().split('T')[0],
    TitheStatus: 'unpaid',
    PaycheckStatus: 'received',
  });

  // Stats
  const [stats, setStats] = useState({
    totalGross: 0,
    totalNet: 0,
    totalTithe: 0,
    unpaidTithe: 0,
  });

  // Tithe percentage
  const [tithePercentage, setTithePercentage] = useState(10);

  useEffect(() => {
    loadData();
    loadTithePercentage();
  }, []);

  const loadTithePercentage = async () => {
    try {
      const saved = await AsyncStorage.getItem(TITHE_PERCENTAGE_KEY);
      if (saved) {
        setTithePercentage(parseFloat(saved));
      }
    } catch (error) {
      console.error('Failed to load tithe percentage:', error);
    }
  };

  // Auto-calculate tithe when gross changes using custom percentage
  useEffect(() => {
    if (newIncome.Gross) {
      const gross = parseFloat(newIncome.Gross) || 0;
      const tithe = (gross * (tithePercentage / 100)).toFixed(2);
      setNewIncome(prev => ({ ...prev, Tithe: tithe }));
    }
  }, [newIncome.Gross, tithePercentage]);

  const loadData = async () => {
    try {
      setError(null);
      const incomeData = await budgetService.getIncome(user.UserId);
      setIncome(incomeData || []);
      calculateStats(incomeData || []);
    } catch (err) {
      console.error('Failed to load income:', err);
      setError('Failed to load income data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (incomeData) => {
    const totalGross = incomeData.reduce((sum, item) => sum + (parseFloat(item.Gross || item.GrossIncome) || 0), 0);
    const totalNet = incomeData.reduce((sum, item) => sum + (parseFloat(item.Net || item.NetIncome) || 0), 0);
    const totalTithe = incomeData.reduce((sum, item) => sum + (parseFloat(item.Tithe || item.TitheAmount) || 0), 0);
    const unpaidTithe = incomeData
      .filter(item => item.TitheStatus !== 'paid')
      .reduce((sum, item) => sum + (parseFloat(item.Tithe || item.TitheAmount) || 0), 0);

    setStats({ totalGross, totalNet, totalTithe, unpaidTithe });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersExpanded(!filtersExpanded);
  };

  const handleAddIncome = async () => {
    if (!newIncome.Gross || !newIncome.Net) {
      Alert.alert('Required', 'Please enter gross and net amounts');
      return;
    }

    try {
      const incomeData = {
        UserID: user.UserId,
        Username: user.Username,
        Description: newIncome.Description || 'Paycheck',
        Gross: parseFloat(newIncome.Gross) || 0,
        Net: parseFloat(newIncome.Net) || 0,
        Tithe: parseFloat(newIncome.Tithe) || 0,
        Date: newIncome.Date,
        TitheStatus: newIncome.TitheStatus,
        PaycheckStatus: newIncome.PaycheckStatus,
      };

      const result = await budgetService.createIncome(incomeData);
      
      if (result.success) {
        setShowAddModal(false);
        resetNewIncome();
        loadData();
      }
    } catch (error) {
      console.error('Failed to create income:', error);
      Alert.alert('Error', 'Failed to create income record');
    }
  };

  const handleEditIncome = async () => {
    try {
      const result = await budgetService.updateIncome(selectedIncome.IncomeId, {
        UserID: user.UserId,
        ...selectedIncome
      });
      
      if (result.success) {
        setShowEditModal(false);
        setSelectedIncome(null);
        loadData();
      }
    } catch (error) {
      console.error('Failed to update income:', error);
      Alert.alert('Error', 'Failed to update income record');
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    Alert.alert(
      'Delete Income',
      'Are you sure you want to delete this income record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await budgetService.deleteIncome(incomeId, user.UserId);
              if (result && result.success) {
                loadData();
              } else {
                Alert.alert('Error', result?.error || 'Failed to delete income');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete income');
            }
          }
        }
      ]
    );
  };

  const toggleSelectIncome = (incomeId) => {
    setSelectedIds((prev) =>
      prev.includes(incomeId)
        ? prev.filter((id) => id !== incomeId)
        : [...prev, incomeId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      'Delete Income Records',
      `Delete ${selectedIds.length} record(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = selectedIds.map(id => 
                budgetService.deleteIncome(id, user.UserId)
              );
              await Promise.all(deletePromises);
              setSelectedIds([]);
              setSelectMode(false);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some records');
              loadData();
            }
          }
        }
      ]
    );
  };

  const markTithePaid = async (incomeId) => {
    try {
      const incomeRecord = income.find(i => i.IncomeId === incomeId);
      const result = await budgetService.updateIncome(incomeId, {
        UserID: user.UserId,
        ...incomeRecord,
        TitheStatus: 'paid'
      });
      
      if (result.success) {
        loadData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update tithe status');
    }
  };

  const resetNewIncome = () => {
    setNewIncome({
      Description: '',
      Gross: '',
      Net: '',
      Tithe: '',
      Date: new Date().toISOString().split('T')[0],
      TitheStatus: 'unpaid',
      PaycheckStatus: 'received',
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

  const filteredIncome = income
    .filter(item => {
      const matchesSearch = !searchQuery ||
        (item.Description || item.Paycheck || '')?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'tithe-unpaid' && item.TitheStatus !== 'paid') ||
        (filterStatus === 'tithe-paid' && item.TitheStatus === 'paid');
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (parseFloat(b.Gross || b.GrossIncome) || 0) - (parseFloat(a.Gross || a.GrossIncome) || 0);
        case 'tithe':
          return (parseFloat(b.Tithe || b.TitheAmount) || 0) - (parseFloat(a.Tithe || a.TitheAmount) || 0);
        case 'date':
        default:
          return new Date(b.Date || b.PaycheckDate || 0) - new Date(a.Date || a.PaycheckDate || 0);
      }
    });

  const renderIncomeItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.incomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        if (selectMode) {
          toggleSelectIncome(item.IncomeId);
        } else {
          setSelectedIncome(item);
          setShowEditModal(true);
        }
      }}
      onLongPress={() => {
        if (!selectMode) {
          setSelectMode(true);
          setSelectedIds([item.IncomeId]);
        }
      }}
    >
      <View style={styles.incomeRow}>
        {selectMode && (
          <View style={[styles.checkbox, selectedIds.includes(item.IncomeId) && { backgroundColor: theme.primary }]}>
            {selectedIds.includes(item.IncomeId) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        )}
        <View style={[styles.incomeIcon, { backgroundColor: `${theme.secondary}20` }]}>
          <Text style={styles.incomeIconText}>💵</Text>
        </View>
        <View style={styles.incomeInfo}>
          <Text style={[styles.incomeDesc, { color: theme.text }]} numberOfLines={1}>
            {item.Description || item.Paycheck || 'Income'}
          </Text>
          <Text style={[styles.incomeMeta, { color: theme.textSecondary }]}>
            {formatDate(item.Date || item.PaycheckDate)} • Tithe: {formatCurrency(item.Tithe || item.TitheAmount)}
          </Text>
          {item.TitheStatus !== 'paid' && (
            <TouchableOpacity
              style={[styles.titheButton, { borderColor: theme.warning }]}
              onPress={() => markTithePaid(item.IncomeId)}
            >
              <Text style={[styles.titheButtonText, { color: theme.warning }]}>Mark Tithe Paid</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.incomeAmounts}>
          <Text style={[styles.incomeGross, { color: theme.secondary }]}>
            +{formatCurrency(item.Gross || item.GrossIncome)}
          </Text>
          <Text style={[styles.incomeNet, { color: theme.textSecondary }]}>
            Net: {formatCurrency(item.Net || item.NetIncome)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading income...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Income</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {filteredIncome.length} records • Net: {formatCurrency(stats.totalNet)}
        </Text>
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Gross</Text>
          <Text style={[styles.statValue, { color: theme.secondary }]}>{formatCurrency(stats.totalGross)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Net</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(stats.totalNet)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tithe Owed</Text>
          <Text style={[styles.statValue, { color: stats.unpaidTithe > 0 ? theme.warning : theme.secondary }]}>
            {formatCurrency(stats.unpaidTithe)}
          </Text>
        </View>
      </ScrollView>

      {/* Search and Filter Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchText, { color: theme.text }]}
              placeholder="Search income..."
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
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Sort by</Text>
            <View style={styles.sortRow}>
              {['date', 'amount', 'tithe'].map((sort) => (
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
          </View>
        )}

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
          {[
            { key: 'all', label: 'All' },
            { key: 'tithe-unpaid', label: 'Tithe Due' },
            { key: 'tithe-paid', label: 'Tithe Paid' },
          ].map((status) => (
            <TouchableOpacity
              key={status.key}
              style={[
                styles.statusChip,
                { borderColor: theme.border },
                filterStatus === status.key && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => setFilterStatus(status.key)}
            >
              <Text style={[
                styles.statusChipText,
                { color: theme.textSecondary },
                filterStatus === status.key && { color: theme.textOnPrimary }
              ]}>{status.label}</Text>
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

      {/* Income List */}
      <FlatList
        data={filteredIncome}
        renderItem={renderIncomeItem}
        keyExtractor={item => item.IncomeId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={[styles.emptyText, { color: theme.text }]}>No income records</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Tap + to add your first paycheck
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
          style={[styles.fab, { backgroundColor: theme.secondary, bottom: 90 + insets.bottom }]}
          onPress={() => { resetNewIncome(); setShowAddModal(true); }}
        >
          <Text style={[styles.fabIcon, { color: theme.textOnSecondary }]}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Income Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Income</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g., Paycheck, Bonus"
                placeholderTextColor={theme.textDisabled}
                value={newIncome.Description}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Description: text }))}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Gross Amount</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textDisabled}
                value={newIncome.Gross}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Gross: text }))}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Net Amount</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textDisabled}
                value={newIncome.Net}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Net: text }))}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Tithe ({tithePercentage}% auto-calculated)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="Auto-calculated"
                placeholderTextColor={theme.textDisabled}
                value={newIncome.Tithe}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Tithe: text }))}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textDisabled}
                value={newIncome.Date}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Date: text }))}
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
                style={[styles.modalSaveButton, { backgroundColor: theme.secondary }]}
                onPress={handleAddIncome}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnSecondary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Income Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Income</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedIncome && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={selectedIncome.Description || selectedIncome.Paycheck || ''}
                  onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, Description: text }))}
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Gross Amount</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={(selectedIncome.Gross || selectedIncome.GrossIncome)?.toString() || ''}
                  onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, Gross: parseFloat(text) || 0 }))}
                  keyboardType="decimal-pad"
                />

                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Net Amount</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={(selectedIncome.Net || selectedIncome.NetIncome)?.toString() || ''}
                  onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, Net: parseFloat(text) || 0 }))}
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity
                  style={[styles.deleteButton, { borderColor: theme.error }]}
                  onPress={() => {
                    setShowEditModal(false);
                    handleDeleteIncome(selectedIncome.IncomeId);
                  }}
                >
                  <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Income</Text>
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
                style={[styles.modalSaveButton, { backgroundColor: theme.secondary }]}
                onPress={handleEditIncome}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnSecondary }]}>Update</Text>
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
  statsScroll: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    minWidth: 120,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
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
  statusScroll: {
    marginTop: 12,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  statusChipText: {
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
  incomeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  incomeRow: {
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
  incomeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeIconText: {
    fontSize: 20,
  },
  incomeInfo: {
    flex: 1,
    marginRight: 12,
  },
  incomeDesc: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  incomeMeta: {
    fontSize: 13,
  },
  titheButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  titheButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  incomeAmounts: {
    alignItems: 'flex-end',
  },
  incomeGross: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  incomeNet: {
    fontSize: 13,
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
