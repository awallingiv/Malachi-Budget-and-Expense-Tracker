import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text, useTheme, Card, ProgressBar } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';

const BudgetBarChart = ({ data = [], title = 'Budget vs Actual', showPercentages = true }) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 600);

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
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No budget data available
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Set up budgets to track your spending
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  // Prepare data for bar chart (top 6 categories for readability)
  const topCategories = processedData.slice(0, 6);
  
  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.colors.primary.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
    labelColor: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    barPercentage: 0.7,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    }
  };

  const chartData = {
    labels: topCategories.map(item => 
      item.category.length > 10 ? item.category.substring(0, 10) + '...' : item.category
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
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>{title}</Text>
        
        {/* Overall Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Total Budget</Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                ${totalBudgeted.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="bodySmall" style={styles.summaryLabel}>Total Spent</Text>
              <Text variant="titleMedium" style={[styles.summaryValue, { color: theme.colors.primary }]}>
                ${totalActual.toFixed(2)}
              </Text>
            </View>
          </View>
          <ProgressBar 
            progress={Math.min(overallPercentage / 100, 1)} 
            color={overallPercentage > 100 ? theme.colors.error : theme.colors.primary}
            style={styles.progressBar}
          />
          <Text variant="bodySmall" style={styles.overallPercentage}>
            {overallPercentage.toFixed(1)}% of total budget used
          </Text>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={chartWidth}
            height={240}
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

        {/* Detailed List */}
        <ScrollView style={styles.detailsContainer}>
          {processedData.map((item, index) => (
            <View key={index} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Text variant="bodyMedium" style={styles.categoryName}>
                  {item.category}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text variant="bodySmall" style={styles.statusText}>
                    {item.status === 'over' ? 'OVER' : item.status === 'warning' ? 'HIGH' : 'OK'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.amountsRow}>
                <View style={styles.amountItem}>
                  <Text variant="bodySmall" style={styles.amountLabel}>Budget:</Text>
                  <Text variant="bodyMedium">${item.budgeted.toFixed(2)}</Text>
                </View>
                <View style={styles.amountItem}>
                  <Text variant="bodySmall" style={styles.amountLabel}>Actual:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                    ${item.actual.toFixed(2)}
                  </Text>
                </View>
                {showPercentages && (
                  <View style={styles.amountItem}>
                    <Text variant="bodySmall" style={styles.amountLabel}>Used:</Text>
                    <Text 
                      variant="bodyMedium" 
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
                style={styles.categoryProgress}
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    opacity: 0.7,
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
  overallPercentage: {
    textAlign: 'center',
    opacity: 0.7,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  chart: {
    borderRadius: 16,
  },
  detailsContainer: {
    maxHeight: 400,
    marginTop: 16,
  },
  categoryRow: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    opacity: 0.7,
    fontSize: 11,
    marginBottom: 2,
  },
  categoryProgress: {
    height: 6,
    borderRadius: 3,
  },
});

export default BudgetBarChart;
