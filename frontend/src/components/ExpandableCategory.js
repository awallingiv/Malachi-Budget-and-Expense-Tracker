import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ExpandableCategory({ 
  categoryName, 
  total, 
  transactions = [],
  onTransactionPress,
  formatCurrency,
  formatDate,
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.container}>
      {/* Category Header */}
      <TouchableOpacity 
        style={[styles.header, { borderBottomColor: theme.border }]}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Animated.Text 
            style={[
              styles.expandIcon, 
              { color: theme.textSecondary, transform: [{ rotate: rotation }] }
            ]}
          >
            ▶
          </Animated.Text>
          <Text style={[styles.categoryName, { color: theme.text }]}>
            {categoryName}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: theme.surface }]}>
            <Text style={[styles.countText, { color: theme.textSecondary }]}>
              {transactions.length}
            </Text>
          </View>
        </View>
        <Text style={[styles.total, { color: theme.accent }]}>
          {formatCurrency ? formatCurrency(total) : `$${total.toFixed(2)}`}
        </Text>
      </TouchableOpacity>

      {/* Expanded Transaction List */}
      {expanded && (
        <View style={[styles.transactionList, { backgroundColor: theme.surface }]}>
          {transactions.length > 0 ? (
            transactions.map((transaction, index) => (
              <TouchableOpacity
                key={transaction.TransactionId || index}
                style={[
                  styles.transactionRow,
                  index < transactions.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }
                ]}
                onPress={() => onTransactionPress?.(transaction)}
                activeOpacity={0.7}
              >
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDesc, { color: theme.text }]} numberOfLines={1}>
                    {transaction.Description || transaction.TableName || 'Expense'}
                  </Text>
                  <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                    {formatDate ? formatDate(transaction.Date) : transaction.Date}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, { color: theme.accent }]}>
                  -{formatCurrency ? formatCurrency(transaction.Amount) : `$${transaction.Amount}`}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No transactions
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// Section component that groups categories by TableName
export function TableSection({ 
  tableName, 
  transactions = [],
  formatCurrency,
  formatDate,
  onTransactionPress,
  theme,
}) {
  const [collapsed, setCollapsed] = useState(false);
  
  // Group transactions by Category within this table
  const groupedByCategory = transactions.reduce((acc, t) => {
    const category = t.Category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { transactions: [], total: 0 };
    }
    acc[category].transactions.push(t);
    acc[category].total += parseFloat(t.Amount) || 0;
    return acc;
  }, {});

  const sectionTotal = transactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
  const categories = Object.keys(groupedByCategory).sort();

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(!collapsed);
  };

  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Section Header */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={toggleCollapse}
        activeOpacity={0.8}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionIcon, { color: theme.textSecondary }]}>
            {collapsed ? '▶' : '▼'}
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {tableName}
          </Text>
        </View>
        <View style={styles.sectionHeaderRight}>
          <Text style={[styles.sectionTotal, { color: theme.accent }]}>
            {formatCurrency ? formatCurrency(sectionTotal) : `$${sectionTotal.toFixed(2)}`}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Categories within section */}
      {!collapsed && (
        <View style={styles.categoriesContainer}>
          {categories.length > 0 ? (
            categories.map((category) => (
              <ExpandableCategory
                key={category}
                categoryName={category}
                total={groupedByCategory[category].total}
                transactions={groupedByCategory[category].transactions}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onTransactionPress={onTransactionPress}
              />
            ))
          ) : (
            <Text style={[styles.emptySection, { color: theme.textSecondary }]}>
              No transactions this period
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandIcon: {
    fontSize: 10,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
  },
  total: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionList: {
    paddingHorizontal: 16,
    paddingLeft: 36,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDesc: {
    fontSize: 14,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    padding: 12,
    textAlign: 'center',
  },
  // Section styles
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 12,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  sectionHeaderRight: {
    alignItems: 'flex-end',
  },
  sectionTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoriesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  emptySection: {
    padding: 20,
    textAlign: 'center',
    fontSize: 14,
  },
});

