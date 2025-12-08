import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';

const SpendingPieChart = ({ data = [], title = 'Spending Breakdown' }) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 400);

  // Generate colors for pie chart
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];

  // Transform data for chart library
  const chartData = data.map((item, index) => ({
    name: item.category || item.Category || 'Unknown',
    amount: parseFloat(item.totalAmount || item.amount || 0),
    color: colors[index % colors.length],
    legendFontColor: theme.dark ? '#FFFFFF' : '#333333',
    legendFontSize: 12
  }));

  // Calculate total for percentages
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);

  // Handle empty data state
  if (!data || data.length === 0 || total === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No spending data available
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Start adding transactions to see your spending breakdown
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>{title}</Text>
        
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute={false}
            hasLegend={false}
          />
        </View>

        <ScrollView style={styles.legendContainer}>
          {chartData.map((item, index) => {
            const percentage = ((item.amount / total) * 100).toFixed(1);
            return (
              <View key={index} style={styles.legendItem}>
                <View style={styles.legendRow}>
                  <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                  <Text variant="bodyMedium" style={styles.legendText}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text variant="bodyMedium" style={styles.amount}>
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" style={styles.percentage}>
                    {percentage}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.totalContainer}>
          <Text variant="titleSmall" style={styles.totalLabel}>Total Spending:</Text>
          <Text variant="titleMedium" style={[styles.totalAmount, { color: theme.colors.primary }]}>
            ${total.toFixed(2)}
          </Text>
        </View>
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
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  legendContainer: {
    maxHeight: 200,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: 'bold',
  },
  percentage: {
    fontSize: 11,
    opacity: 0.7,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default SpendingPieChart;
