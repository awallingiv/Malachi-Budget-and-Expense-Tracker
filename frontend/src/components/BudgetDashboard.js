import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Dimensions,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Simple budget dashboard with modern dark theme .
const BudgetDashboard = () => {
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newIncome, setNewIncome] = useState({ description: '', amount: '', date: '' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: '', date: '' });

  // Mock data for development
  const [dashboardStats, setDashboardStats] = useState({
    totalIncome: 5000,
    totalExpenses: 3200,
    totalBudget: 1800,
    titheAmount: 500,
    categoriesCount: 8
  });

  const addIncome = () => {
    if (newIncome.description && newIncome.amount) {
      const incomeItem = {
        id: Date.now(),
        description: newIncome.description,
        amount: parseFloat(newIncome.amount),
        date: newIncome.date || new Date().toISOString().split('T')[0],
        type: 'income'
      };
      setIncome([...income, incomeItem]);
      setDashboardStats(prev => ({
        ...prev,
        totalIncome: prev.totalIncome + incomeItem.amount
      }));
      setNewIncome({ description: '', amount: '', date: '' });
      setShowAddIncome(false);
    }
  };

  const addExpense = () => {
    if (newExpense.description && newExpense.amount) {
      const expenseItem = {
        id: Date.now(),
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category || 'General',
        date: newExpense.date || new Date().toISOString().split('T')[0],
        type: 'expense'
      };
      setExpenses([...expenses, expenseItem]);
      setDashboardStats(prev => ({
        ...prev,
        totalExpenses: prev.totalExpenses + expenseItem.amount
      }));
      setNewExpense({ description: '', amount: '', category: '', date: '' });
      setShowAddExpense(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ReactBudget Dashboard</Text>
        <Text style={styles.headerSubtitle}>Your Financial Overview</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={[styles.statCard, styles.incomeCard]}>
            <Text style={styles.statLabel}>Total Income</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboardStats.totalIncome)}</Text>
            <Text style={styles.statChange}>+12.5% this month</Text>
          </View>

          <View style={[styles.statCard, styles.expenseCard]}>
            <Text style={styles.statLabel}>Total Expenses</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboardStats.totalExpenses)}</Text>
            <Text style={styles.statChange}>-5.2% this month</Text>
          </View>

          <View style={[styles.statCard, styles.budgetCard]}>
            <Text style={styles.statLabel}>Remaining Budget</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboardStats.totalIncome - dashboardStats.totalExpenses)}</Text>
            <Text style={styles.statChange}>Available funds</Text>
          </View>

          <View style={[styles.statCard, styles.titheCard]}>
            <Text style={styles.statLabel}>Tithe (10%)</Text>
            <Text style={styles.statValue}>{formatCurrency(dashboardStats.totalIncome * 0.1)}</Text>
            <Text style={styles.statChange}>Giving goal</Text>
          </View>
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.addIncomeBtn]} 
              onPress={() => setShowAddIncome(true)}
            >
              <Text style={styles.actionButtonText}>+ Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.addExpenseBtn]} 
              onPress={() => setShowAddExpense(true)}
            >
              <Text style={styles.actionButtonText}>+ Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          
          {[...income, ...expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>{transaction.date}</Text>
                {transaction.category && (
                  <Text style={styles.transactionCategory}>{transaction.category}</Text>
                )}
              </View>
              <Text style={[
                styles.transactionAmount,
                transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
              ]}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))}

          {income.length === 0 && expenses.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Add your first income or expense to get started!</Text>
            </View>
          )}
        </View>

        {/* Budget Categories Preview */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Budget Categories</Text>
          <View style={styles.categoriesGrid}>
            {['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment'].map((category, index) => (
              <View key={category} style={styles.categoryCard}>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryAmount}>{formatCurrency(Math.random() * 500 + 100)}</Text>
                <View style={[styles.categoryBar, { width: `${Math.random() * 80 + 20}%` }]} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Income Modal */}
      <Modal visible={showAddIncome} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Income</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Salary)"
              placeholderTextColor="#666"
              value={newIncome.description}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, description: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newIncome.amount}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, amount: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#666"
              value={newIncome.date}
              onChangeText={(text) => setNewIncome(prev => ({ ...prev, date: text }))}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowAddIncome(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={addIncome}
              >
                <Text style={styles.saveButtonText}>Add Income</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Expense Modal */}
      <Modal visible={showAddExpense} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Groceries)"
              placeholderTextColor="#666"
              value={newExpense.description}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, description: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newExpense.amount}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, amount: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Category (e.g., Food)"
              placeholderTextColor="#666"
              value={newExpense.category}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, category: text }))}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#666"
              value={newExpense.date}
              onChangeText={(text) => setNewExpense(prev => ({ ...prev, date: text }))}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowAddExpense(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={addExpense}
              >
                <Text style={styles.saveButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#B3B3B3',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statCard: {
    width: 200,
    padding: 20,
    marginRight: 15,
    borderRadius: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  incomeCard: {
    backgroundColor: '#1A4A3A',
    borderWidth: 1,
    borderColor: '#00FF88',
  },
  expenseCard: {
    backgroundColor: '#4A1A1A',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  budgetCard: {
    backgroundColor: '#1A2A4A',
    borderWidth: 1,
    borderColor: '#0066FF',
  },
  titheCard: {
    backgroundColor: '#4A2A1A',
    borderWidth: 1,
    borderColor: '#FFA726',
  },
  statLabel: {
    fontSize: 14,
    color: '#B3B3B3',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#888',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addIncomeBtn: {
    backgroundColor: '#00FF88',
  },
  addExpenseBtn: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  recentSection: {
    padding: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#0066FF',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#00FF88',
  },
  expenseAmount: {
    color: '#FF6B6B',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
  },
  categoriesSection: {
    padding: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryName: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  categoryAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066FF',
    marginBottom: 12,
  },
  categoryBar: {
    height: 4,
    backgroundColor: '#0066FF',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.48,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  saveButton: {
    backgroundColor: '#0066FF',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BudgetDashboard;