import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import { Text, useTheme, Card, ProgressBar } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const BudgetBarChart = ({ data = [], title = 'Budget vs Actual', showPercentages = true }) => {
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

  const chartHeight = isSmallMobile ? 200 : isMobile ? 220 : 240;

  // Get theme-aware text color with high contrast
  const textColor = themeColors?.chartText || (isDark ? '#FFFFFF' : '#1a1a2e');

  // Process and sort data by overspend amount
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .map(item => {
        const budgeted = parseFloat(item.budgetedAmount || item.budgeted || 0);
        const actual = parseFloat(item.actualAmount || item.actual || item.spent || 0);
        const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0;
        const overspend = actual - budgeted;

        return {
          category: item.category || item.Category || 'Unknown',
          budgeted,
          actual,
          percentage,
          overspend,
          status: percentage > 100 ? 'over' : percentage > 90 ? 'warning' : 'good'
        };
      })
      .sort((a, b) => b.overspend - a.overspend); // Sort by overspend descending
  }, [data]);

  // Handle empty data state
  if (!data || data.length === 0 || processedData.length === 0) {
    return (
      <Card style={[styles.card, isMobile && styles.cardMobile]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.title, { color: textColor }]}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: themeColors?.textMuted || theme.colors.onSurfaceVariant }}>
              No budget data available
            </Text>
            <Text variant="bodySmall" style={{ color: themeColors?.textDim || theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Set up budgets to track your spending
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  // Prepare data for bar chart - fewer items on mobile for readability
  const maxCategories = isSmallMobile ? 4 : isMobile ? 5 : 6;
  const topCategories = processedData.slice(0, maxCategories);

  // Truncate labels more aggressively on mobile
  const maxLabelLength = isSmallMobile ? 6 : isMobile ? 8 : 10;

  // Use theme colors with proper fallbacks
  const primaryColor = themeColors?.primary || theme.colors.primary;
  const gridColor = themeColors?.chartGrid || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');

  const chartConfig = {
    backgroundColor: themeColors?.cardBg || theme.colors.surface,
    backgroundGradientFrom: themeColors?.cardBg || theme.colors.surface,
    backgroundGradientTo: themeColors?.cardBg || theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => {
      // Handle hex colors properly
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
    barPercentage: 0.7,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: gridColor,
    }
  };

  const chartData = {
    labels: topCategories.map(item =>
      item.category.length > maxLabelLength ? item.category.substring(0, maxLabelLength) + '...' : item.category
    ),
    datasets: [
      {
        data: topCategories.map(item => item.budgeted),
        color: (opacity = 1) => theme.colors.outline.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
      },
      {
        data: topCategories.map(item => item.actual),
        color: (opacity = 1) => theme.colors.primary.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
      }
    ],
    legend: ['Budgeted', 'Actual']
  };

  // Calculate summary stats
  const totalBudgeted = processedData.reduce((sum, item) => sum + item.budgeted, 0);
  const totalActual = processedData.reduce((sum, item) => sum + item.actual, 0);
  const overallPercentage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'over': return theme.colors.error;
      case 'warning': return '#FFA726';
      case 'good': return theme.colors.tertiary;
      default: return theme.colors.outline;
    }
  };

  return (
    <Card style={[styles.card, isMobile && styles.cardMobile]}>
      <Card.Content style={isMobile && styles.cardContentMobile}>
        <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.title, { color: textColor }]}>{title}</Text>

        {/* Overall Summary */}
        <View style={[styles.summaryContainer, isMobile && styles.summaryContainerMobile, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <View style={[styles.summaryRow, isMobile && styles.summaryRowMobile]}>
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Total Budget</Text>
              <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.summaryValue, { color: textColor }]}>
                ${totalBudgeted.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={[styles.summaryLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Total Spent</Text>
              <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.summaryValue, { color: themeColors?.primary || theme.colors.primary }]}>
                ${totalActual.toFixed(2)}
              </Text>
            </View>
          </View>
          <ProgressBar
            progress={Math.min(overallPercentage / 100, 1)}
            color={overallPercentage > 100 ? (themeColors?.danger || theme.colors.error) : (themeColors?.primary || theme.colors.primary)}
            style={[styles.progressBar, isMobile && styles.progressBarMobile]}
          />
          <Text variant="bodySmall" style={[styles.overallPercentage, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>
            {overallPercentage.toFixed(1)}% of total budget used
          </Text>
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
            verticalLabelRotation={isSmallMobile ? 45 : 0}
          />
        </View>

        {/* Detailed List */}
        <ScrollView style={[styles.detailsContainer, isMobile && styles.detailsContainerMobile]}>
          {processedData.map((item, index) => (
            <View key={index} style={[styles.categoryRow, isMobile && styles.categoryRowMobile, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.categoryHeader, isMobile && styles.categoryHeaderMobile]}>
                <Text variant={isMobile ? "bodySmall" : "bodyMedium"} style={[styles.categoryName, { color: textColor }]} numberOfLines={1}>
                  {item.category}
                </Text>
                <View style={[styles.statusBadge, isMobile && styles.statusBadgeMobile, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text variant="bodySmall" style={[styles.statusText, isMobile && styles.statusTextMobile]}>
                    {item.status === 'over' ? 'OVER' : item.status === 'warning' ? 'HIGH' : 'OK'}
                  </Text>
                </View>
              </View>

              <View style={[styles.amountsRow, isMobile && styles.amountsRowMobile]}>
                <View style={[styles.amountItem, isMobile && styles.amountItemMobile]}>
                  <Text variant="bodySmall" style={[styles.amountLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Budget:</Text>
                  <Text variant={isMobile ? "bodySmall" : "bodyMedium"} style={{ color: textColor }}>${item.budgeted.toFixed(2)}</Text>
                </View>
                <View style={[styles.amountItem, isMobile && styles.amountItemMobile]}>
                  <Text variant="bodySmall" style={[styles.amountLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Actual:</Text>
                  <Text variant={isMobile ? "bodySmall" : "bodyMedium"} style={{ fontWeight: 'bold', color: textColor }}>
                    ${item.actual.toFixed(2)}
                  </Text>
                </View>
                {showPercentages && (
                  <View style={[styles.amountItem, isMobile && styles.amountItemMobile]}>
                    <Text variant="bodySmall" style={[styles.amountLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Used:</Text>
                    <Text
                      variant={isMobile ? "bodySmall" : "bodyMedium"}
                      style={{
                        fontWeight: 'bold',
                        color: getStatusColor(item.status)
                      }}
                    >
                      {item.percentage.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>

              <ProgressBar
                progress={Math.min(item.percentage / 100, 1)}
                color={getStatusColor(item.status)}
                style={[styles.categoryProgress, isMobile && styles.categoryProgressMobile]}
              />
            </View>
          ))}
        </ScrollView>
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
    marginBottom: 12,
    padding: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryRowMobile: {
    marginBottom: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBarMobile: {
    height: 6,
    marginBottom: 6,
  },
  overallPercentage: {
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
    overflow: 'hidden',
  },
  chartContainerMobile: {
    marginVertical: 8,
  },
  chart: {
    borderRadius: 16,
  },
  detailsContainer: {
    maxHeight: 400,
    marginTop: 16,
  },
  detailsContainerMobile: {
    maxHeight: 300,
    marginTop: 8,
  },
  categoryRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  categoryRowMobile: {
    marginBottom: 10,
    paddingBottom: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryHeaderMobile: {
    marginBottom: 6,
  },
  categoryName: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeMobile: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  statusTextMobile: {
    fontSize: 9,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountsRowMobile: {
    marginBottom: 6,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountItemMobile: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
  },
  categoryProgressMobile: {
    height: 4,
    borderRadius: 2,
  },
});

export default BudgetBarChart;
