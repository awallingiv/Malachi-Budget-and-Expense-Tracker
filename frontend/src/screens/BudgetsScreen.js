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
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import ModernButton from '../components/ModernButton';

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);

export default function BudgetsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedMonth] = useState(new Date());
  const { start: periodStart, end: periodEnd } = getMonthRange(selectedMonth);

  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    CategoryName: '',
    Amount: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.UserId) return;

    try {
      setError(null);
      setLoading(true);

      const [budgetsData, transactionsData, categoriesData] = await Promise.all([
        budgetService.getBudgets(user.UserId, {
          startDate: periodStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0],
        }),
        budgetService.getTransactions(user.UserId),
        budgetService.getUserCategories(user.UserId),
      ]);

      setBudgets(budgetsData || []);
      setTransactions(transactionsData || []);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error('Failed to load budgets data:', err);
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const resetForm = () => {
    setBudgetForm({
      CategoryName: '',
      Amount: '',
    });
    setEditingBudget(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (budget) => {
    setEditingBudget(budget);
    setBudgetForm({
      CategoryName: budget.CategoryName,
      Amount: (budget.Amount || 0).toString(),
    });
    setShowModal(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetForm.CategoryName || !budgetForm.Amount) return;

    try {
      const payload = {
        UserID: user.UserId,
        Username: user.Username,
        CategoryName: budgetForm.CategoryName,
        PeriodStart: periodStart.toISOString().split('T')[0],
        PeriodEnd: periodEnd.toISOString().split('T')[0],
        Amount: parseFloat(budgetForm.Amount) || 0,
        Currency: 'USD',
      };

      if (editingBudget?.BudgetID) {
        await budgetService.updateBudget(editingBudget.BudgetID, {
          ...payload,
          // allow changing category if user edited it
        });
      } else {
        await budgetService.upsertBudget(payload);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save budget:', err);
      setError('Failed to save budget');
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    try {
      await budgetService.deleteBudget(budgetId, user.UserId);
      loadData();
    } catch (err) {
      console.error('Failed to delete budget:', err);
      setError('Failed to delete budget');
    }
  };

  // Compute actual spending per category for current period
  const actualByCategory = transactions.reduce((acc, txn) => {
    const date = new Date(txn.Date || txn.CreationTime);
    if (isNaN(date.getTime())) return acc;
    if (date < periodStart || date > periodEnd) return acc;

    const key = txn.TableName || 'Other';
    acc[key] = (acc[key] || 0) + (txn.Amount || 0);
    return acc;
  }, {});

  const monthLabel = selectedMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const renderBudgetRow = (budget) => {
    const planned = budget.Amount || 0;
    const actual = actualByCategory[budget.CategoryName] || 0;
    const remaining = planned - actual;
    const usedPct = planned > 0 ? actual / planned : 0;

    let statusColor = '#4caf50';
    if (usedPct >= 1) {
      statusColor = '#f44336';
    } else if (usedPct >= 0.8) {
      statusColor = '#ff9800';
    }

    return (
      <Card key={budget.BudgetID} style={styles.budgetCard}>
        <Card.Content>
          <View style={styles.budgetHeader}>
            <View>
              <Text variant="titleMedium" style={styles.budgetCategory}>
                {budget.CategoryName}
              </Text>
              <Text variant="bodySmall" style={styles.budgetPeriod}>
                {monthLabel}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: statusColor + '22' }]}
              textStyle={{ color: statusColor }}
            >
              {Math.round(usedPct * 100)}% used
            </Chip>
          </View>

          <View style={styles.budgetRow}>
            <Text style={styles.label}>Planned</Text>
            <Text style={styles.value}>{formatCurrency(planned)}</Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.label}>Actual</Text>
            <Text style={styles.value}>{formatCurrency(actual)}</Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.label}>Remaining</Text>
            <Text
              style={[
                styles.value,
                remaining < 0 ? styles.negative : styles.positive,
              ]}
            >
              {formatCurrency(remaining)}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <Button
              mode="text"
              onPress={() => openEdit(budget)}
            >
              Edit
            </Button>
            <Button
              mode="text"
              textColor="#f44336"
              onPress={() => handleDeleteBudget(budget.BudgetID)}
            >
              Delete
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading budgets...</Text>
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
            Monthly Budgets
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {monthLabel}
          </Text>
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

        {budgets.length === 0 && !error && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyTitle}>No budgets set yet</Text>
              <Text variant="bodySmall" style={styles.emptyText}>
                Create budgets per category to track your planned spending for
                the month.
              </Text>
            </Card.Content>
          </Card>
        )}

        {budgets.map(renderBudgetRow)}

        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={openCreate}
        label="Add Budget"
      />

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
                  {editingBudget ? 'Edit Budget' : 'Add Budget'}
                </Text>
              </View>

              <TextInput
                label="Category"
                value={budgetForm.CategoryName}
                onChangeText={(text) =>
                  setBudgetForm((prev) => ({ ...prev, CategoryName: text }))
                }
                style={styles.input}
                placeholder="e.g., Groceries, Bills"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryChips}
              >
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    style={styles.categoryChip}
                    selected={budgetForm.CategoryName === cat}
                    onPress={() =>
                      setBudgetForm((prev) => ({ ...prev, CategoryName: cat }))
                    }
                  >
                    {cat}
                  </Chip>
                ))}
              </ScrollView>

              <TextInput
                label="Amount"
                value={budgetForm.Amount}
                onChangeText={(text) =>
                  setBudgetForm((prev) => ({ ...prev, Amount: text }))
                }
                keyboardType="decimal-pad"
                style={styles.input}
                placeholder="0.00"
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
                  onPress={handleSaveBudget}
                  disabled={!budgetForm.CategoryName || !budgetForm.Amount}
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
  },
  subtitle: {
    color: '#666',
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
  budgetCard: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetCategory: {
    fontWeight: '600',
  },
  budgetPeriod: {
    color: '#666',
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '600',
  },
  positive: {
    color: '#2e7d32',
  },
  negative: {
    color: '#c62828',
  },
  cardActions: {
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
  categoryChips: {
    marginBottom: 12,
    maxHeight: 40,
  },
  categoryChip: {
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});


