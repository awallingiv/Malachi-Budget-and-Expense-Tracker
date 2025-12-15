import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const IncomeVsExpenseChart = ({ data = [], title = 'Income vs Expenses', showSavings = true }) => {
  const theme = useTheme();
  const { colors: themeColors, isDark } = useAppTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 600);

  // Get theme-aware text color
  const textColor = themeColors?.chartText || (isDark ? '#FFFFFF' : '#1a1a2e');
  const gridColor = themeColors?.chartGrid || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');

  // Process monthly data
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return { labels: [], income: [], expenses: [], savings: [] };

    // Sort by date
    const sorted = [...data].sort((a, b) => {
      const dateA = new Date(a.month || a.date || 0);
      const dateB = new Date(b.month || b.date || 0);
      return dateA - dateB;
    });

    const labels = sorted.map(item => {
      const date = new Date(item.month || item.date);
      return date.toLocaleDateString('en-US', { month: 'short' });
    });

    const income = sorted.map(item => parseFloat(item.income || item.totalIncome || 0));
    const expenses = sorted.map(item => parseFloat(item.expenses || item.totalExpenses || item.spent || 0));
    const savings = income.map((inc, idx) => inc - expenses[idx]);

    return { labels, income, expenses, savings };
  }, [data]);

  // Handle empty data state
  if (!data || data.length === 0 || processedData.income.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No income/expense data available
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Add income and expenses to see comparisons
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const chartConfig = {
    backgroundColor: themeColors?.cardBg || theme.colors.surface,
    backgroundGradientFrom: themeColors?.cardBg || theme.colors.surface,
    backgroundGradientTo: themeColors?.cardBg || theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      const primaryColor = themeColors?.primary || theme.colors.primary;
      if (primaryColor.startsWith('#')) {
        const r = parseInt(primaryColor.slice(1, 3), 16);
        const g = parseInt(primaryColor.slice(3, 5), 16);
        const b = parseInt(primaryColor.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      return primaryColor.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
    },
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    barPercentage: 0.8,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: gridColor,
    }
  };

  const chartData = {
    labels: processedData.labels,
    datasets: [
      {
        data: processedData.income,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
      },
      {
        data: processedData.expenses,
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`, // Red
      }
    ],
    legend: ['Income', 'Expenses']
  };

  // Calculate summary statistics
  const totalIncome = processedData.income.reduce((sum, val) => sum + val, 0);
  const totalExpenses = processedData.expenses.reduce((sum, val) => sum + val, 0);
  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // Calculate average monthly values
  const avgIncome = totalIncome / processedData.income.length;
  const avgExpenses = totalExpenses / processedData.expenses.length;
  const avgSavings = avgIncome - avgExpenses;

  // Get current month values (last in array)
  const currentIncome = processedData.income[processedData.income.length - 1];
  const currentExpenses = processedData.expenses[processedData.expenses.length - 1];
  const currentSavings = currentIncome - currentExpenses;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>{title}</Text>
        
        {/* Current Month Summary */}
        <View style={styles.summaryContainer}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Current Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text variant="bodySmall" style={styles.statLabel}>Income</Text>
              <Text variant="titleMedium" style={[styles.statValue, { color: '#4CAF50' }]}>
                ${currentIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="bodySmall" style={styles.statLabel}>Expenses</Text>
              <Text variant="titleMedium" style={[styles.statValue, { color: '#F44336' }]}>
                ${currentExpenses.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="bodySmall" style={styles.statLabel}>Net</Text>
              <Text 
                variant="titleMedium" 
                style={[
                  styles.statValue, 
                  { color: currentSavings >= 0 ? '#4CAF50' : '#F44336' }
                ]}
              >
                {currentSavings >= 0 ? '+' : ''}${currentSavings.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={260}
            chartConfig={chartConfig}
            style={styles.chart}
            showBarTops={false}
            fromZero={true}
            segments={4}
            withInnerLines={true}
            yAxisLabel="$"
            yAxisSuffix=""
          />
        </View>

        {/* Period Summary */}
        {showSavings && (
          <View style={styles.periodSummary}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Period Summary</Text>
            
            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Total Income</Text>
                <Text variant="titleSmall" style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                  ${totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Total Expenses</Text>
                <Text variant="titleSmall" style={[styles.summaryAmount, { color: '#F44336' }]}>
                  ${totalExpenses.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Avg Monthly Income</Text>
                <Text variant="titleSmall" style={styles.summaryAmount}>
                  ${avgIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={styles.summaryLabel}>Avg Monthly Expenses</Text>
                <Text variant="titleSmall" style={styles.summaryAmount}>
                  ${avgExpenses.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.savingsContainer}>
              <View style={styles.savingsRow}>
                <View style={styles.savingsColumn}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>Total Savings</Text>
                  <Text 
                    variant="titleLarge" 
                    style={[
                      styles.savingsAmount, 
                      { color: totalSavings >= 0 ? '#4CAF50' : '#F44336' }
                    ]}
                  >
                    {totalSavings >= 0 ? '+' : ''}${totalSavings.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.savingsColumn}>
                  <Text variant="bodySmall" style={styles.summaryLabel}>Savings Rate</Text>
                  <Text 
                    variant="titleLarge" 
                    style={[
                      styles.savingsAmount, 
                      { color: savingsRate >= 20 ? '#4CAF50' : savingsRate >= 0 ? '#FFA726' : '#F44336' }
                    ]}
                  >
                    {savingsRate.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text variant="bodySmall" style={styles.savingsNote}>
                {savingsRate >= 20 
                  ? '🎉 Excellent savings rate!' 
                  : savingsRate >= 10 
                  ? '👍 Good savings rate' 
                  : savingsRate >= 0 
                  ? '⚠️ Consider saving more'
                  : '⚠️ Spending exceeds income'}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  summaryContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  chart: {
    borderRadius: 16,
  },
  periodSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    opacity: 0.7,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryAmount: {
    fontWeight: 'bold',
  },
  savingsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  savingsColumn: {
    alignItems: 'center',
  },
  savingsAmount: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  savingsNote: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 8,
  },
});

export default IncomeVsExpenseChart;
