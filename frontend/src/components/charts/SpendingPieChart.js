import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const SpendingPieChart = ({ data = [], title = 'Spending Breakdown' }) => {
  const theme = useTheme();
  const { colors: themeColors, isDark } = useAppTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 400);

  // Generate colors for pie chart - using theme-aware colors
  const chartColors = [
    themeColors?.primary || '#FF6384',
    themeColors?.secondary || '#36A2EB',
    themeColors?.accent || '#FFCE56',
    '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];

  // Get the proper text color based on theme
  const textColor = themeColors?.chartText || (isDark ? '#FFFFFF' : '#1a1a2e');

  // Transform data for chart library
  const chartData = data.map((item, index) => ({
    name: item.category || item.Category || 'Unknown',
    amount: parseFloat(item.totalAmount || item.amount || 0),
    color: chartColors[index % chartColors.length],
    legendFontColor: textColor,
    legendFontSize: 12
  }));

  // Calculate total for percentages
  const total = chartData.reduce((sum, item) => sum + item.amount, 0);

  // Handle empty data state
  if (!data || data.length === 0 || total === 0) {
    return (
      <View style={styles.card}>
          {title ? <Text variant="titleMedium" style={[styles.title, { color: textColor }]}>{title}</Text> : null}
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: themeColors?.textMuted || (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)') }}>
              No spending data available
            </Text>
            <Text variant="bodySmall" style={{ color: themeColors?.textDim || (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'), marginTop: 8 }}>
              Start adding transactions to see your spending breakdown
            </Text>
          </View>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    }
  };

  return (
    <View style={styles.card}>
        {title ? <Text variant="titleMedium" style={[styles.title, { color: textColor }]}>{title}</Text> : null}

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
              <View key={index} style={[styles.legendItem, { borderBottomColor: themeColors?.chartGrid || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }]}>
                <View style={styles.legendRow}>
                  <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                  <Text variant="bodyMedium" style={[styles.legendText, { color: textColor }]}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text variant="bodyMedium" style={[styles.amount, { color: textColor }]}>
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" style={[styles.percentage, { color: themeColors?.textMuted || (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)') }]}>
                    {percentage}%
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.totalContainer, { borderTopColor: themeColors?.chartGrid || (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') }]}>
          <Text variant="titleSmall" style={[styles.totalLabel, { color: textColor }]}>Total Spending:</Text>
          <Text variant="titleMedium" style={[styles.totalAmount, { color: themeColors?.primary || theme.colors.primary }]}>
            ${total.toFixed(2)}
          </Text>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: 'transparent',
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
