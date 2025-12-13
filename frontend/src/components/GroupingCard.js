import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal } from 'react-native';

/**
 * GroupingCard - Compact half-width dashboard card for expense groupings
 * Displays grouping name, transaction count, total spending, and all transactions in scrollable list
 */
const GroupingCard = ({
  grouping,
  transactions,
  colors,
  onAddExpense,
  onEditTransaction,
  onEditGrouping,
  isExpanded = false,
  onToggleExpand,
  onTransactionDragStart,
  onTransactionDrop,
  isDragOver
}) => {
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc
  const [filterText, setFilterText] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);

  // Filter transactions for this grouping and sort by date
  const groupTransactions = useMemo(() => {
    let filtered = transactions
      .filter(t => t.GroupingID === grouping.GroupingID);
    
    // Apply text filter
    if (filterText.trim()) {
      const search = filterText.toLowerCase();
      filtered = filtered.filter(t => 
        (t.Name?.toLowerCase().includes(search)) ||
        (t.Category?.toLowerCase().includes(search)) ||
        (t.Notes?.toLowerCase().includes(search))
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date-asc':
          return new Date(a.Date) - new Date(b.Date);
        case 'date-desc':
          return new Date(b.Date) - new Date(a.Date);
        case 'amount-asc':
          return parseFloat(a.Amount) - parseFloat(b.Amount);
        case 'amount-desc':
          return parseFloat(b.Amount) - parseFloat(a.Amount);
        default:
          return new Date(b.Date) - new Date(a.Date);
      }
    });
  }, [transactions, grouping.GroupingID, sortBy, filterText]);

  // Calculate total spending for this grouping
  const totalSpending = useMemo(() => {
    return groupTransactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
  }, [groupTransactions]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyFull = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const transactionCount = groupTransactions.length;

  return (
    <View 
      style={[
        styles.container,
        isDragOver && styles.containerDragOver
      ]}
      onDragOver={(e) => {
        if (Platform.OS === 'web') {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (Platform.OS === 'web' && onTransactionDrop) {
          e.preventDefault();
          onTransactionDrop(grouping.GroupingID);
        }
      }}
    >
      {/* Color accent bar */}
      <View style={[styles.colorBar, { backgroundColor: grouping.Color || '#00d4aa' }]} />
      
      {/* Header with Name and Add Button */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {grouping.Icon && grouping.Icon.trim() && (
              <Text style={{ fontSize: 18 }}>{grouping.Icon}</Text>
            )}
            <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              {grouping.GroupingName}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerControls}>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={() => setShowSortModal(true)}
          >
            <Text style={[styles.sortButtonText, { color: colors.text }]}>Sort</Text>
          </TouchableOpacity>
          <Text style={[styles.sortLabel, { color: colors.textMuted }]}>
            {sortBy === 'date-desc' ? 'Date ↓' : 
             sortBy === 'date-asc' ? 'Date ↑' :
             sortBy === 'amount-desc' ? 'Amount ↓' : 'Amount ↑'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {onToggleExpand && (
            <TouchableOpacity
              onPress={() => onToggleExpand(grouping.GroupingID)}
              style={[styles.expandButton, { backgroundColor: colors.inputBg }]}
            >
              <Text style={[styles.expandButtonText, { color: colors.textMuted }]}>
                {isExpanded ? '⇱' : '⇲'}
              </Text>
            </TouchableOpacity>
          )}
          {onEditGrouping && (
            <TouchableOpacity
              onPress={() => onEditGrouping(grouping)}
              style={[styles.menuButton, { backgroundColor: colors.inputBg }]}
            >
              <Text style={[styles.menuButtonText, { color: colors.textMuted }]}>⋮</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onAddExpense(grouping)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Transactions List */}
      <ScrollView
        style={styles.transactionsList}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {groupTransactions.length > 0 ? (
          groupTransactions.map((txn) => (
            <TouchableOpacity
              key={txn.TransactionId}
              style={[
                styles.transactionRow,
                { borderBottomColor: colors.cardBorder }
              ]}
              onPress={() => onEditTransaction(txn)}
              draggable={Platform.OS === 'web'}
              onDragStart={(e) => {
                if (Platform.OS === 'web' && onTransactionDragStart) {
                  e.dataTransfer.effectAllowed = 'move';
                  onTransactionDragStart(txn);
                }
              }}
            >
              <View style={styles.transactionContent}>
                <Text
                  style={[styles.transactionDesc, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {txn.Name}
                </Text>
                {txn.Category && (
                  <Text
                    style={[styles.transactionCategory, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {txn.Category}
                  </Text>
                )}
                {txn.Notes && (
                  <Text
                    style={[styles.transactionNotes, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {txn.Notes}
                  </Text>
                )}
                <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                  {formatDate(txn.Date)}
                </Text>
              </View>
              <Text style={[styles.transactionAmount, { color: colors.danger || '#ef4444' }]}>
                {formatCurrency(txn.Amount)}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No expenses yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Tap + to add one
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Total Amount - Prominent Display at Bottom */}
      <View style={[styles.totalContainer, { backgroundColor: colors.inputBg }]}>
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Spent</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrencyFull(totalSpending)}
        </Text>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sortModal, styles.solidModalBg, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.sortModalTitle, { color: colors.text }]}>Sort By</Text>
              {[
                { value: 'date-desc', label: 'Date (Newest First)' },
                { value: 'date-asc', label: 'Date (Oldest First)' },
                { value: 'amount-desc', label: 'Amount (Highest First)' },
                { value: 'amount-asc', label: 'Amount (Lowest First)' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.sortOption, sortBy === option.value && { backgroundColor: colors.inputBg }]}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortModal(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, { color: sortBy === option.value ? colors.primary : colors.text }]}>
                    {option.label}
                  </Text>
                  {sortBy === option.value && <Text style={{ color: colors.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 12,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sortModal: {
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  solidModalBg: {
    backgroundColor: '#1a1a1a',
    opacity: 1,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sortOptionText: {
    fontSize: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    fontSize: 24,
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  totalContainer: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  transactionsList: {
    flex: 1,
    maxHeight: 300,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 120,
  },
  transactionCategory: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  transactionNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  transactionDate: {
    fontSize: 13,
    marginLeft: 'auto',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 0,
    minWidth: 70,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyHint: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default GroupingCard;
