import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  FAB,
  Portal,
  Modal,
  TextInput,
  Chip,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import ModernButton from '../components/ModernButton';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
};

export default function RecurringScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [type, setType] = useState('expense'); // 'expense' | 'income'

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    Description: '',
    TableName: '',
    Amount: '',
    Frequency: 'monthly',
    Interval: '1',
    StartDate: new Date().toISOString().split('T')[0],
    EndDate: '',
    NextOccurrence: '',
    Notes: '',
  });

  useEffect(() => {
    if (user?.UserId) {
      loadData();
    }
  }, [type, user?.UserId]);

  const loadData = async () => {
    if (!user?.UserId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await budgetService.getRecurringItems(user.UserId, {
        type,
      });
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load recurring items:', err);
      setError('Failed to load recurring items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [type]);

  const resetForm = () => {
    setForm({
      Description: '',
      TableName: '',
      Amount: '',
      Frequency: 'monthly',
      Interval: '1',
      StartDate: new Date().toISOString().split('T')[0],
      EndDate: '',
      NextOccurrence: '',
      Notes: '',
    });
    setEditingItem(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      Description: item.Description || '',
      TableName: item.TableName || '',
      Amount: (item.Amount || 0).toString(),
      Frequency: item.Frequency || 'monthly',
      Interval: (item.Interval || 1).toString(),
      StartDate: item.StartDate
        ? item.StartDate.toString().substring(0, 10)
        : new Date().toISOString().split('T')[0],
      EndDate: item.EndDate ? item.EndDate.toString().substring(0, 10) : '',
      NextOccurrence: item.NextOccurrence
        ? item.NextOccurrence.toString().substring(0, 10)
        : '',
      Notes: item.Notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.Amount || !form.Frequency) return;

    try {
      const payload = {
        UserID: user.UserId,
        Username: user.Username,
        ItemType: type,
        Description: form.Description,
        TableName: form.TableName || null,
        Amount: parseFloat(form.Amount) || 0,
        StartDate: form.StartDate,
        EndDate: form.EndDate || null,
        Frequency: form.Frequency,
        Interval: parseInt(form.Interval, 10) || 1,
        NextOccurrence: form.NextOccurrence || form.StartDate,
        Notes: form.Notes,
      };

      if (editingItem?.RecurringID) {
        await budgetService.updateRecurringItem(editingItem.RecurringID, {
          ...payload,
          IsActive: editingItem.IsActive,
        });
      } else {
        await budgetService.createRecurringItem(payload);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save recurring item:', err);
      setError('Failed to save recurring item');
    }
  };

  const handleDelete = async (recurringId) => {
    try {
      await budgetService.deleteRecurringItem(recurringId, user.UserId);
      loadData();
    } catch (err) {
      console.error('Failed to delete recurring item:', err);
      setError('Failed to delete recurring item');
    }
  };

  const now = new Date();
  const daysFromNow = (dateStr) => {
    if (!dateStr) return Infinity;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return Infinity;
    return Math.round((d - now) / (1000 * 60 * 60 * 24));
  };

  const upcomingItems = items
    .filter((i) => i.IsActive !== false)
    .map((i) => ({
      ...i,
      daysUntil: daysFromNow(i.NextOccurrence || i.StartDate),
    }))
    .filter((i) => i.daysUntil >= 0 && i.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const renderItem = (item) => (
    <Card key={item.RecurringID} style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View>
            <Text variant="titleMedium" style={styles.itemTitle}>
              {item.Description || (type === 'expense' ? 'Recurring Bill' : 'Recurring Income')}
            </Text>
            <Text variant="bodySmall" style={styles.itemSubtitle}>
              {item.TableName || (type === 'expense' ? 'Expenses' : 'Income')} •{' '}
              {item.Frequency || 'monthly'}
              {item.Interval && item.Interval > 1 ? ` (every ${item.Interval})` : ''}
            </Text>
          </View>
          <Text
            variant="titleMedium"
            style={[
              styles.amount,
              type === 'expense' ? styles.expenseAmount : styles.incomeAmount,
            ]}
          >
            {formatCurrency(item.Amount)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Next</Text>
          <Text style={styles.value}>{formatDate(item.NextOccurrence || item.StartDate)}</Text>
        </View>
        {item.EndDate && (
          <View style={styles.row}>
            <Text style={styles.label}>Ends</Text>
            <Text style={styles.value}>{formatDate(item.EndDate)}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            mode="text"
            onPress={() =>
              budgetService
                .updateRecurringItem(item.RecurringID, {
                  UserID: user.UserId,
                  IsActive: !item.IsActive,
                })
                .then(loadData)
                .catch((err) => {
                  console.error('Failed to toggle recurring item:', err);
                  setError('Failed to update recurring item');
                })
            }
          >
            {item.IsActive === false ? 'Activate' : 'Pause'}
          </Button>
          <Button mode="text" onPress={() => openEdit(item)}>
            Edit
          </Button>
          <Button
            mode="text"
            textColor="#f44336"
            onPress={() => handleDelete(item.RecurringID)}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading recurring items...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>
            Recurring {type === 'expense' ? 'Bills & Subscriptions' : 'Income'}
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={setType}
            buttons={[
              { value: 'expense', label: 'Expenses' },
              { value: 'income', label: 'Income' },
            ]}
            style={styles.segmented}
          />
        </View>

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
              <Button onPress={loadData} mode="outlined">
                Retry
              </Button>
            </Card.Content>
          </Card>
        )}

        {upcomingItems.length > 0 && (
          <Card style={styles.upcomingCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Upcoming in next 30 days</Text>
              {upcomingItems.map((i) => (
                <View key={i.RecurringID} style={styles.upcomingRow}>
                  <View>
                    <Text style={styles.upcomingName}>
                      {i.Description || i.TableName || 'Recurring'}
                    </Text>
                    <Text style={styles.upcomingMeta}>
                      Due {formatDate(i.NextOccurrence || i.StartDate)} •{' '}
                      {i.daysUntil === 0
                        ? 'today'
                        : `${i.daysUntil} day${i.daysUntil === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.upcomingAmount,
                      type === 'expense' ? styles.expenseAmount : styles.incomeAmount,
                    ]}
                  >
                    {formatCurrency(i.Amount)}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {items.length === 0 && !error && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyTitle}>No recurring {type}s yet</Text>
              <Text variant="bodySmall" style={styles.emptyText}>
                Add your regular bills, subscriptions, or paychecks so we can track
                them for you.
              </Text>
            </Card.Content>
          </Card>
        )}

        {items.map(renderItem)}

        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add" />

      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => {
            setShowModal(false);
            resetForm();
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">
                  {editingItem ? 'Edit Recurring' : 'Add Recurring'}
                </Text>
              </View>

              <TextInput
                label="Description"
                value={form.Description}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, Description: text }))
                }
                style={styles.input}
                placeholder={type === 'expense' ? 'Electric bill, Netflix...' : 'Paycheck'}
              />

              <TextInput
                label="Category/Table"
                value={form.TableName}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, TableName: text }))
                }
                style={styles.input}
                placeholder={type === 'expense' ? 'Bills, Subscriptions' : 'Income'}
              />

              <TextInput
                label="Amount"
                value={form.Amount}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, Amount: text }))
                }
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="0.00"
              />

              <TextInput
                label="Frequency (e.g., monthly, weekly)"
                value={form.Frequency}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, Frequency: text }))
                }
                style={styles.input}
              />

              <TextInput
                label="Interval (every N periods)"
                value={form.Interval}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, Interval: text }))
                }
                keyboardType="number-pad"
                style={styles.input}
              />

              <TextInput
                label="Start Date"
                value={form.StartDate}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, StartDate: text }))
                }
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="Next Occurrence (optional)"
                value={form.NextOccurrence}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, NextOccurrence: text }))
                }
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="End Date (optional)"
                value={form.EndDate}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, EndDate: text }))
                }
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="Notes (optional)"
                value={form.Notes}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, Notes: text }))
                }
                style={styles.input}
                multiline
              />

              <View style={styles.modalButtons}>
                <ModernButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <ModernButton
                  title="Save"
                  variant="primary"
                  onPress={handleSave}
                  disabled={!form.Amount || !form.Frequency}
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
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  segmented: {
    marginTop: 4,
  },
  errorCard: {
    marginBottom: 12,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  upcomingCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  upcomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '500',
  },
  upcomingMeta: {
    fontSize: 12,
    color: '#666',
  },
  upcomingAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 24,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontWeight: '700',
  },
  expenseAmount: {
    color: '#f44336',
  },
  incomeAmount: {
    color: '#4caf50',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  label: {
    color: '#666',
    fontSize: 12,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modalContent: {
    backgroundColor: 'transparent',
    padding: 20,
    margin: 20,
  },
  modalHeader: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});


