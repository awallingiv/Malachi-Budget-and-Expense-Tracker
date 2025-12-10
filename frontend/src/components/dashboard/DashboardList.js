import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

/**
 * TransactionItem - Individual transaction row
 */
const TransactionItem = ({ transaction, onEdit, colors }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
        <Text style={styles.itemIconText}>💸</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {transaction.Name || transaction.Description || 'Transaction'}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textDim }]}>
          {formatDate(transaction.Date)} • {transaction.TableName || transaction.Category || 'Uncategorized'}
        </Text>
      </View>
      <Text style={[styles.itemAmount, { color: colors.danger }]}>
        -${(transaction.Amount || 0).toFixed(2)}
      </Text>
      {onEdit && (
        <TouchableOpacity onPress={() => onEdit(transaction)} style={styles.itemAction}>
          <Text style={styles.itemActionText}>✏️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * IncomeItem - Individual income row
 */
const IncomeItem = ({ income, onEdit, colors }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemIcon, { backgroundColor: 'rgba(0, 212, 170, 0.1)' }]}>
        <Text style={styles.itemIconText}>💵</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {income.Description || 'Income'}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textDim }]}>
          {formatDate(income.Date)} • Tithe: ${(income.Tithe || 0).toFixed(2)}
        </Text>
      </View>
      <View style={styles.incomeAmounts}>
        <Text style={[styles.itemAmount, { color: colors.success }]}>
          +${(income.Gross || 0).toFixed(2)}
        </Text>
        <Text style={[styles.incomeNet, { color: colors.textDim }]}>
          Net: ${(income.Net || 0).toFixed(2)}
        </Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={() => onEdit(income)} style={styles.itemAction}>
          <Text style={styles.itemActionText}>✏️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * DashboardList - Displays a list of transactions or income records
 * 
 * @param {Object} props
 * @param {'transactions' | 'income'} props.type - Type of data to display
 * @param {Array} props.data - Array of items to display
 * @param {Function} props.onItemPress - Callback when an item is pressed
 * @param {Function} props.onItemEdit - Callback when edit button is pressed
 * @param {Object} props.colors - Theme-aware color palette
 * @param {string} props.title - Section title
 * @param {string} props.emptyMessage - Message to show when no data
 * @param {number} props.limit - Maximum number of items to show
 * @param {Function} props.onViewAll - Callback for "View All" button
 * @param {Object} props.style - Additional container styles
 */
const DashboardList = ({
  type = 'transactions',
  data = [],
  onItemPress,
  onItemEdit,
  colors = {},
  title,
  emptyMessage,
  limit = 5,
  onViewAll,
  style,
}) => {
  const displayData = limit ? data.slice(0, limit) : data;
  const hasMore = data.length > limit;

  const defaultTitle = type === 'income' ? 'Recent Income' : 'Recent Transactions';
  const defaultEmptyMessage = type === 'income' 
    ? 'No income records for this period' 
    : 'No transactions for this period';

  const renderItem = ({ item }) => {
    if (type === 'income') {
      return (
        <IncomeItem
          income={item}
          onEdit={onItemEdit}
          colors={colors}
        />
      );
    }
    return (
      <TransactionItem
        transaction={item}
        onEdit={onItemEdit}
        colors={colors}
      />
    );
  };

  const keyExtractor = (item) => {
    return type === 'income' 
      ? item.IncomeID || item.IncomeId || String(Math.random())
      : item.TransactionId || item.TransactionID || String(Math.random());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, style]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title || defaultTitle}
        </Text>
        {hasMore && onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              View All ({data.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List or Empty State */}
      {displayData.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {emptyMessage || defaultEmptyMessage}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {displayData.map((item, index) => (
            <TouchableOpacity
              key={keyExtractor(item)}
              onPress={() => onItemPress && onItemPress(item)}
              activeOpacity={onItemPress ? 0.7 : 1}
            >
              {type === 'income' ? (
                <IncomeItem income={item} onEdit={onItemEdit} colors={colors} />
              ) : (
                <TransactionItem transaction={item} onEdit={onItemEdit} colors={colors} />
              )}
              {index < displayData.length - 1 && (
                <View style={[styles.separator, { borderBottomColor: colors.cardBorder }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Show more indicator */}
      {hasMore && !onViewAll && (
        <Text style={[styles.moreText, { color: colors.textDim }]}>
          +{data.length - limit} more
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    gap: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  incomeAmounts: {
    alignItems: 'flex-end',
  },
  incomeNet: {
    fontSize: 11,
    marginTop: 2,
  },
  itemAction: {
    marginLeft: 8,
    padding: 4,
  },
  itemActionText: {
    fontSize: 14,
  },
  separator: {
    borderBottomWidth: 1,
    marginLeft: 52,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export { TransactionItem, IncomeItem };
export default DashboardList;
