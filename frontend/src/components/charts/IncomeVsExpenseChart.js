import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const IncomeVsExpenseChart = ({ data = [], title = 'Income vs Expenses', showSavings = true }) => {
  const theme = useTheme();
  const { colors: themeColors, isDark } = useAppTheme();

  // Track screen dimensions for responsive design
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const screenWidth = dimensions.width;
  const isMobile = screenWidth < 600;
  const isSmallMobile = screenWidth < 400;

  // Responsive chart sizing
  const chartWidth = isSmallMobile
    ? screenWidth - 20
    : isMobile
      ? Math.min(screenWidth - 30, 500)
      : Math.min(screenWidth - 40, 600);

  const chartHeight = isSmallMobile ? 200 : isMobile ? 230 : 260;

  // Get theme-aware text color with high contrast
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
      <Card style={[styles.card, isMobile && styles.cardMobile]}>
        <Card.Content>
          <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.title, { color: textColor }]}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: themeColors?.textMuted || theme.colors.onSurfaceVariant }}>
              No income/expense data available
            </Text>
            <Text variant="bodySmall" style={{ color: themeColors?.textDim || theme.colors.onSurfaceVariant, marginTop: 8 }}>
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

  // Use theme-aware success/danger colors
  const successColor = themeColors?.success || '#4CAF50';
  const dangerColor = themeColors?.danger || '#F44336';

  return (
    <Card style={[styles.card, isMobile && styles.cardMobile]}>
      <Card.Content style={isMobile && styles.cardContentMobile}>
        <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.title, { color: textColor }]}>{title}</Text>

        {/* Current Month Summary */}
        <View style={[styles.summaryContainer, isMobile && styles.summaryContainerMobile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <Text variant={isMobile ? "bodyMedium" : "titleSmall"} style={[styles.sectionTitle, { color: textColor }]}>Current Month</Text>
          <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
            <View style={styles.statBox}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Income</Text>
              <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.statValue, { color: successColor }]}>
                ${currentIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Expenses</Text>
              <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.statValue, { color: dangerColor }]}>
                ${currentExpenses.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Net</Text>
              <Text
                variant={isMobile ? "titleSmall" : "titleMedium"}
                style={[
                  styles.statValue,
                  { color: currentSavings >= 0 ? successColor : dangerColor }
                ]}
              >
                {currentSavings >= 0 ? '+' : ''}${currentSavings.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={[styles.chartContainer, isMobile && styles.chartContainerMobile]}>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            style={styles.chart}
            showBarTops={false}
            fromZero={true}
            segments={isSmallMobile ? 3 : 4}
            withInnerLines={true}
            yAxisLabel="$"
            yAxisSuffix=""
            verticalLabelRotation={isSmallMobile ? 30 : 0}
          />
        </View>

        {/* Period Summary */}
        {showSavings && (
          <View style={[styles.periodSummary, isMobile && styles.periodSummaryMobile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            <Text variant={isMobile ? "bodyMedium" : "titleSmall"} style={[styles.sectionTitle, { color: textColor }]}>Period Summary</Text>

            <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Total Income</Text>
                <Text variant={isMobile ? "bodyMedium" : "titleSmall"} style={[styles.summaryAmount, { color: successColor }]}>
                  ${totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Total Expenses</Text>
                <Text variant={isMobile ? "bodyMedium" : "titleSmall"} style={[styles.summaryAmount, { color: dangerColor }]}>
                  ${totalExpenses.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Avg Monthly Income</Text>
                <Text variant={isMobile ? "bodyMedium" : "titleSmall"} style={[styles.summaryAmount, { color: textColor }]}>
                  ${avgIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryColumn}>
                <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Avg Monthly Expenses</Text>
                <Text variant={isMobile ? "bodyMedium" : "titleSmall"} style={[styles.summaryAmount, { color: textColor }]}>
                  ${avgExpenses.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={[styles.savingsContainer, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <View style={[styles.savingsRow, isMobile && styles.savingsRowMobile]}>
                <View style={styles.savingsColumn}>
                  <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Total Savings</Text>
                  <Text
                    variant={isMobile ? "titleMedium" : "titleLarge"}
                    style={[
                      styles.savingsAmount,
                      isMobile && styles.savingsAmountMobile,
                      { color: totalSavings >= 0 ? successColor : dangerColor }
                    ]}
                  >
                    {totalSavings >= 0 ? '+' : ''}${totalSavings.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.savingsColumn}>
                  <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Savings Rate</Text>
                  <Text
                    variant={isMobile ? "titleMedium" : "titleLarge"}
                    style={[
                      styles.savingsAmount,
                      isMobile && styles.savingsAmountMobile,
                      { color: savingsRate >= 20 ? successColor : savingsRate >= 0 ? (themeColors?.warning || '#FFA726') : dangerColor }
                    ]}
                  >
                    {savingsRate.toFixed(1)}%
                  </Text>
                </View>
              </View>
              <Text variant="bodySmall" style={[styles.savingsNote, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>
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
  cardMobile: {
    marginHorizontal: 8,
    marginVertical: 6,
  },
  cardContentMobile: {
    padding: 12,
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
    borderRadius: 8,
  },
  summaryContainerMobile: {
    marginBottom: 10,
    padding: 10,
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
  statsGridMobile: {
    gap: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
    overflow: 'hidden',
  },
  chartContainerMobile: {
    marginVertical: 10,
  },
  chart: {
    borderRadius: 16,
  },
  periodSummary: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  periodSummaryMobile: {
    marginTop: 10,
    padding: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryRowMobile: {
    marginBottom: 8,
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
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
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  savingsRowMobile: {
    marginBottom: 6,
  },
  savingsColumn: {
    alignItems: 'center',
  },
  savingsAmount: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  savingsAmountMobile: {
    fontSize: 18,
  },
  savingsNote: {
    textAlign: 'center',
    marginTop: 8,
  },
});

export default IncomeVsExpenseChart;
