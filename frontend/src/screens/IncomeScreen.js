import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  RefreshControl,
  Alert,
  ScrollView
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  TextInput,
  Portal,
  Modal,
  IconButton,
  Chip,
  Searchbar,
  SegmentedButtons,
  ProgressBar,
  Checkbox,
  Button
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import ModernButton from '../components/ModernButton';
import ModernInput from '../components/ModernInput';

export default function IncomeScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // New income form state
  const [newIncome, setNewIncome] = useState({
    Paycheck: '',
    GrossIncome: '',
    NetIncome: '',
    TithePercentage: '10',
    TitheAmount: '',
    PaycheckDate: new Date().toISOString().split('T')[0],
    PaycheckStatus: 'pending',
    TitheStatus: 'unpaid',
    Notes: ''
  });

  // Stats
  const [stats, setStats] = useState({
    totalGross: 0,
    totalNet: 0,
    totalTithe: 0,
    unpaidTithe: 0,
    monthlyAverage: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-calculate tithe amount when gross income or percentage changes
    if (newIncome.GrossIncome && newIncome.TithePercentage) {
      const titheAmount = (parseFloat(newIncome.GrossIncome) * parseFloat(newIncome.TithePercentage)) / 100;
      setNewIncome(prev => ({
        ...prev,
        TitheAmount: titheAmount.toFixed(2)
      }));
    }
  }, [newIncome.GrossIncome, newIncome.TithePercentage]);

  const loadData = async () => {
    try {
      setError(null);
      const incomeData = await budgetService.getIncome(user.UserId);
      setIncome(incomeData);
      calculateStats(incomeData);
    } catch (err) {
      console.error('Failed to load income:', err);
      setError('Failed to load income data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (incomeData) => {
    const totalGross = incomeData.reduce((sum, item) => sum + (parseFloat(item.GrossIncome) || 0), 0);
    const totalNet = incomeData.reduce((sum, item) => sum + (parseFloat(item.NetIncome) || 0), 0);
    const totalTithe = incomeData.reduce((sum, item) => sum + (parseFloat(item.TitheAmount) || 0), 0);
    const unpaidTithe = incomeData
      .filter(item => item.TitheStatus !== 'paid')
      .reduce((sum, item) => sum + (parseFloat(item.TitheAmount) || 0), 0);
    
    const monthlyAverage = incomeData.length > 0 ? totalGross / Math.max(incomeData.length, 1) : 0;

    setStats({
      totalGross,
      totalNet,
      totalTithe,
      unpaidTithe,
      monthlyAverage
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleAddIncome = async () => {
    try {
      // Map frontend fields to backend expected fields
      const incomeData = {
        UserID: user.UserId,
        Username: user.Username,
        Description: newIncome.Paycheck,
        Gross: parseFloat(newIncome.GrossIncome) || null,
        Net: parseFloat(newIncome.NetIncome) || null,
        Tithe: parseFloat(newIncome.TitheAmount) || null,
        Date: newIncome.PaycheckDate,
        PaycheckStatus: newIncome.PaycheckStatus,
        TitheStatus: newIncome.TitheStatus
      };

      const result = await budgetService.createIncome(incomeData);
      
      if (result.success) {
        setShowAddModal(false);
        resetNewIncome();
        loadData();
      }
    } catch (error) {
      console.error('Failed to create income:', error);
      setError('Failed to create income record');
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
      setError('Failed to update income record');
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
              console.log('Deleting income:', incomeId, 'for user:', user.UserId);
              const result = await budgetService.deleteIncome(incomeId, user.UserId);
              console.log('Delete result:', result);
              
              if (result && result.success) {
                loadData();
              } else {
                const errorMsg = result?.error || result?.message || 'Failed to delete income record';
                console.error('Delete failed:', errorMsg);
                Alert.alert('Error', errorMsg);
              }
            } catch (error) {
              console.error('Failed to delete income:', error);
              const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete income record';
              Alert.alert('Error', errorMsg);
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
      `Are you sure you want to delete ${selectedIds.length} income record(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all selected income records in parallel
              const deletePromises = selectedIds.map(id => 
                budgetService.deleteIncome(id, user.UserId)
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
                  `${selectedIds.length - failedCount} income record(s) deleted, but ${failedCount} failed to delete.`
                );
                // Still refresh to show updated state
                setSelectedIds([]);
                setSelectMode(false);
                loadData();
              }
            } catch (error) {
              console.error('Failed to delete income records:', error);
              Alert.alert('Error', error.message || 'Failed to delete income records');
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
      console.error('Failed to mark tithe as paid:', error);
      setError('Failed to update tithe status');
    }
  };

  const resetNewIncome = () => {
    setNewIncome({
      Paycheck: '',
      GrossIncome: '',
      NetIncome: '',
      TithePercentage: '10',
      TitheAmount: '',
      PaycheckDate: new Date().toISOString().split('T')[0],
      PaycheckStatus: 'pending',
      TitheStatus: 'unpaid',
      Notes: ''
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

  const filteredIncome = income
    .filter(item => {
      const matchesSearch = item.Paycheck?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.Notes?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'tithe-unpaid' && item.TitheStatus !== 'paid') ||
                           (filterStatus === 'tithe-paid' && item.TitheStatus === 'paid') ||
                           item.PaycheckStatus === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (parseFloat(b.GrossIncome) || 0) - (parseFloat(a.GrossIncome) || 0);
        case 'tithe':
          return (parseFloat(b.TitheAmount) || 0) - (parseFloat(a.TitheAmount) || 0);
        case 'date':
        default:
          return new Date(b.PaycheckDate || 0) - new Date(a.PaycheckDate || 0);
      }
    });

  const renderIncomeItem = ({ item }) => (
    <Card style={styles.incomeCard}>
      <Card.Content>
        <View style={styles.incomeHeader}>
          {selectMode && (
            <Checkbox
              status={selectedIds.includes(item.IncomeId) ? 'checked' : 'unchecked'}
              onPress={() => toggleSelectIncome(item.IncomeId)}
            />
          )}
          <View style={styles.incomeInfo}>
            <Text variant="titleMedium" style={styles.paycheckTitle}>
              {item.Paycheck || 'Paycheck'}
            </Text>
            <Text variant="bodySmall" style={styles.incomeDate}>
              {formatDate(item.PaycheckDate)}
            </Text>
            
            <View style={styles.statusChips}>
              <Chip 
                mode="outlined" 
                compact 
                style={[
                  styles.statusChip,
                  { backgroundColor: item.PaycheckStatus === 'received' ? '#e8f5e8' : '#fff3e0' }
                ]}
              >
                Paycheck: {item.PaycheckStatus}
              </Chip>
              <Chip 
                mode="outlined" 
                compact 
                style={[
                  styles.statusChip,
                  { backgroundColor: item.TitheStatus === 'paid' ? '#e8f5e8' : '#ffebee' }
                ]}
              >
                Tithe: {item.TitheStatus}
              </Chip>
            </View>
          </View>
          
          <View style={styles.incomeActions}>
            <Text variant="titleLarge" style={styles.grossAmount}>
              {formatCurrency(item.GrossIncome)}
            </Text>
            <Text variant="bodyMedium" style={styles.netAmount}>
              Net: {formatCurrency(item.NetIncome)}
            </Text>
            <Text variant="bodyMedium" style={styles.titheAmount}>
              Tithe: {formatCurrency(item.TitheAmount)} ({item.TithePercentage}%)
            </Text>
            
            {!selectMode && (
              <View style={styles.actionButtons}>
                {item.TitheStatus !== 'paid' && (
                  <Button 
                    mode="outlined" 
                    compact
                    onPress={() => markTithePaid(item.IncomeId)}
                    style={styles.titheButton}
                  >
                    Mark Tithe Paid
                  </Button>
                )}
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => {
                    setSelectedIncome(item);
                    setShowEditModal(true);
                  }}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#f44336"
                  onPress={() => handleDeleteIncome(item.IncomeId)}
                />
              </View>
            )}
          </View>
        </View>
        
        {item.Notes && (
          <Text variant="bodySmall" style={styles.incomeNotes}>
            {item.Notes}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading income data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.statLabel}>Total Gross</Text>
            <Text variant="titleLarge" style={styles.statValue}>
              {formatCurrency(stats.totalGross)}
            </Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.statLabel}>Total Net</Text>
            <Text variant="titleLarge" style={styles.statValue}>
              {formatCurrency(stats.totalNet)}
            </Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.statLabel}>Total Tithe</Text>
            <Text variant="titleLarge" style={styles.statValue}>
              {formatCurrency(stats.totalTithe)}
            </Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.statLabel}>Unpaid Tithe</Text>
            <Text variant="titleLarge" style={[styles.statValue, { color: '#f44336' }]}>
              {formatCurrency(stats.unpaidTithe)}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Header Controls */}
      <View style={styles.headerControls}>
        <View style={styles.topBar}>
          <Searchbar
            placeholder="Search income records..."
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
              { value: 'tithe', label: 'Tithe' }
            ]}
            style={styles.sortButtons}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
          <Chip 
            mode={filterStatus === 'all' ? 'flat' : 'outlined'}
            onPress={() => setFilterStatus('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip 
            mode={filterStatus === 'tithe-unpaid' ? 'flat' : 'outlined'}
            onPress={() => setFilterStatus('tithe-unpaid')}
            style={styles.filterChip}
          >
            Tithe Due
          </Chip>
          <Chip 
            mode={filterStatus === 'tithe-paid' ? 'flat' : 'outlined'}
            onPress={() => setFilterStatus('tithe-paid')}
            style={styles.filterChip}
          >
            Tithe Paid
          </Chip>
          <Chip 
            mode={filterStatus === 'received' ? 'flat' : 'outlined'}
            onPress={() => setFilterStatus('received')}
            style={styles.filterChip}
          >
            Received
          </Chip>
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

      {/* Income List */}
      <FlatList
        data={filteredIncome}
        renderItem={renderIncomeItem}
        keyExtractor={item => item.IncomeId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No income records found</Text>
              <Text variant="bodySmall">Add your first paycheck to get started</Text>
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

      {/* Add Income FAB */}
      {!selectMode && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        />
      )}

      {/* Add Income Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => setShowAddModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Add New Income</Text>
                <IconButton icon="close" onPress={() => setShowAddModal(false)} />
              </View>

              <TextInput
                label="Paycheck Description"
                value={newIncome.Paycheck}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Paycheck: text }))}
                style={styles.input}
                placeholder="e.g., Regular Paycheck, Bonus"
              />

              <View style={styles.rowInputs}>
                <TextInput
                  label="Gross Income"
                  value={newIncome.GrossIncome}
                  onChangeText={(text) => setNewIncome(prev => ({ ...prev, GrossIncome: text }))}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfWidth]}
                  placeholder="0.00"
                />

                <TextInput
                  label="Net Income"
                  value={newIncome.NetIncome}
                  onChangeText={(text) => setNewIncome(prev => ({ ...prev, NetIncome: text }))}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfWidth]}
                  placeholder="0.00"
                />
              </View>

              <View style={styles.rowInputs}>
                <TextInput
                  label="Tithe %"
                  value={newIncome.TithePercentage}
                  onChangeText={(text) => setNewIncome(prev => ({ ...prev, TithePercentage: text }))}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfWidth]}
                  placeholder="10"
                />

                <TextInput
                  label="Tithe Amount"
                  value={newIncome.TitheAmount}
                  onChangeText={(text) => setNewIncome(prev => ({ ...prev, TitheAmount: text }))}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.halfWidth]}
                  placeholder="Auto-calculated"
                />
              </View>

              <TextInput
                label="Paycheck Date"
                value={newIncome.PaycheckDate}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, PaycheckDate: text }))}
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="Notes (Optional)"
                value={newIncome.Notes}
                onChangeText={(text) => setNewIncome(prev => ({ ...prev, Notes: text }))}
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
                  title="Add Income"
                  variant="primary"
                  onPress={handleAddIncome}
                  disabled={!newIncome.Paycheck || !newIncome.GrossIncome}
                  icon="plus"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Edit Income Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Edit Income</Text>
                <IconButton icon="close" onPress={() => setShowEditModal(false)} />
              </View>

              {selectedIncome && (
                <>
                  <TextInput
                    label="Paycheck Description"
                    value={selectedIncome.Paycheck || ''}
                    onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, Paycheck: text }))}
                    style={styles.input}
                  />

                  <View style={styles.rowInputs}>
                    <TextInput
                      label="Gross Income"
                      value={selectedIncome.GrossIncome?.toString() || ''}
                      onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, GrossIncome: parseFloat(text) || 0 }))}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.halfWidth]}
                    />

                    <TextInput
                      label="Net Income"
                      value={selectedIncome.NetIncome?.toString() || ''}
                      onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, NetIncome: parseFloat(text) || 0 }))}
                      keyboardType="decimal-pad"
                      style={[styles.input, styles.halfWidth]}
                    />
                  </View>

                  <TextInput
                    label="Notes"
                    value={selectedIncome.Notes || ''}
                    onChangeText={(text) => setSelectedIncome(prev => ({ ...prev, Notes: text }))}
                    style={styles.input}
                    multiline
                  />

                  <View style={styles.modalButtons}>
                    <Button mode="outlined" onPress={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button mode="contained" onPress={handleEditIncome}>
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
  statsContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  statCard: {
    marginRight: 12,
    minWidth: 120,
    elevation: 2,
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#2e7d32',
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
    marginBottom: 12,
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
  statusFilter: {
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
  incomeCard: {
    marginBottom: 12,
    elevation: 2,
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  incomeInfo: {
    flex: 1,
    marginRight: 12,
  },
  paycheckTitle: {
    marginBottom: 4,
    fontWeight: '600',
  },
  incomeDate: {
    color: '#666',
    marginBottom: 8,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  incomeActions: {
    alignItems: 'flex-end',
  },
  grossAmount: {
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 2,
  },
  netAmount: {
    color: '#666',
    marginBottom: 2,
  },
  titheAmount: {
    color: '#ff9800',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titheButton: {
    marginRight: 8,
  },
  incomeNotes: {
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
});