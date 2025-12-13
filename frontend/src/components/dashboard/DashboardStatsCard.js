import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * DashboardStatsCard - Displays financial summary statistics
 * 
 * @param {Object} props
 * @param {Object} props.incomeTotals - { totalGross, totalNet, totalTithe, count }
 * @param {Object} props.expenseTotals - { totalAmount, count }
 * @param {number} props.netPosition - Net position (income - expenses)
 * @param {number} props.savingsRate - Savings rate percentage
 * @param {Object} props.colors - Theme-aware color palette
 * @param {Object} props.style - Additional container styles
 */
const DashboardStatsCard = ({
  incomeTotals = {},
  expenseTotals = {},
  netPosition = 0,
  savingsRate = 0,
  colors = {},
  style,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const isPositive = netPosition >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, style]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Summary</Text>
      
      {/* Net Position - Large display */}
      <View style={styles.netPositionContainer}>
        <Text style={[styles.netPositionLabel, { color: colors.textMuted }]}>Net Position</Text>
        <Text style={[
          styles.netPositionValue, 
          { color: isPositive ? colors.success : colors.danger }
        ]}>
          {isPositive ? '+' : ''}{formatCurrency(netPosition)}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Gross Income */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Gross Income</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(incomeTotals.totalGross)}
          </Text>
        </View>

        {/* Net Income */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Net Income</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {formatCurrency(incomeTotals.totalNet)}
          </Text>
        </View>

        {/* Tithe */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Tithe</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {formatCurrency(incomeTotals.totalTithe)}
          </Text>
        </View>

        {/* Expenses */}
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Expenses</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {formatCurrency(expenseTotals.totalAmount)}
          </Text>
        </View>
      </View>

      {/* Savings Rate */}
      <View style={styles.savingsContainer}>
        <Text style={[styles.savingsLabel, { color: colors.textMuted }]}>Savings Rate</Text>
        <View style={styles.savingsBarContainer}>
          <View style={[styles.savingsBarBg, { backgroundColor: colors.inputBg }]}>
            <View 
              style={[
                styles.savingsBarFill, 
                { 
                  width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                  backgroundColor: savingsRate >= 20 ? colors.success : savingsRate >= 10 ? colors.warning : colors.danger
                }
              ]} 
            />
          </View>
          <Text style={[
            styles.savingsValue, 
            { color: savingsRate >= 20 ? colors.success : savingsRate >= 10 ? colors.warning : colors.danger }
          ]}>
            {savingsRate.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Transaction/Income counts */}
      <View style={styles.countsRow}>
        <Text style={[styles.countText, { color: colors.textDim }]}>
          {incomeTotals.count || 0} income records • {expenseTotals.count || 0} transactions
        </Text>
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  netPositionContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  netPositionLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  netPositionValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  savingsContainer: {
    marginBottom: 12,
  },
  savingsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  savingsBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savingsBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  savingsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  savingsValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  countsRow: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  countText: {
    fontSize: 12,
  },
});

export default DashboardStatsCard;
