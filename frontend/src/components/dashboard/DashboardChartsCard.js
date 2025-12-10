import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SpendingPieChart } from '../charts';

/**
 * DashboardChartsCard - Displays spending pie chart and category breakdown
 * 
 * @param {Object} props
 * @param {Array} props.categoryTotals - Array of { Category, totalAmount, transactionCount }
 * @param {Object} props.colors - Theme-aware color palette
 * @param {boolean} props.isDark - Whether dark mode is enabled
 * @param {boolean} props.isCollapsed - Whether the chart is collapsed
 * @param {Function} props.onToggleCollapse - Callback when collapse button is pressed
 * @param {Function} props.onCategoryPress - Callback when a category is pressed
 * @param {Object} props.style - Additional container styles
 */
const DashboardChartsCard = ({
  categoryTotals = [],
  colors = {},
  isDark = true,
  isCollapsed = false,
  onToggleCollapse,
  onCategoryPress,
  style,
}) => {
  // Category colors for visual distinction
  const categoryColors = ['#00d4aa', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff6b6b', '#a29bfe', '#fd79a8'];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Prepare data for pie chart
  const chartData = categoryTotals
    .filter((c) => c.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 8) // Limit to top 8 categories
    .map((c, index) => ({
      name: c.Category,
      amount: c.totalAmount,
      color: categoryColors[index % categoryColors.length],
      legendFontColor: colors.text || '#ffffff',
      legendFontSize: 12,
    }));

  const totalSpending = categoryTotals.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

  if (categoryTotals.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, style]}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Overview</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No spending data available for this period
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, style]}>
      {/* Header with collapse toggle */}
      <TouchableOpacity style={styles.headerRow} onPress={onToggleCollapse}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Overview</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>
            {formatCurrency(totalSpending)}
          </Text>
          <Text style={[styles.collapseIcon, { color: colors.textMuted }]}>
            {isCollapsed ? '▼' : '▲'}
          </Text>
        </View>
      </TouchableOpacity>

      {!isCollapsed && (
        <>
          {/* Pie Chart */}
          <View style={styles.chartContainer}>
            <SpendingPieChart
              data={chartData}
              isDark={isDark}
              width={280}
              height={200}
            />
          </View>

          {/* Category List */}
          <View style={styles.categoryList}>
            {chartData.map((category, index) => (
              <TouchableOpacity
                key={category.name}
                style={styles.categoryItem}
                onPress={() => onCategoryPress && onCategoryPress(category)}
              >
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                    {category.name}
                  </Text>
                </View>
                <Text style={[styles.categoryAmount, { color: category.color }]}>
                  {formatCurrency(category.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Show more indicator if there are more categories */}
          {categoryTotals.length > 8 && (
            <Text style={[styles.moreText, { color: colors.textDim }]}>
              +{categoryTotals.length - 8} more categories
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapseIcon: {
    fontSize: 12,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    flex: 1,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

export default DashboardChartsCard;
