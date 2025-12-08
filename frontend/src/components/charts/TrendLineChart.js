import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';

const TrendLineChart = ({ data = [], title = 'Spending Trends', showAverage = true }) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 600);

  // Sort data by date and fill missing months
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return { labels: [], values: [], average: 0 };

    // Sort by date
    const sorted = [...data].sort((a, b) => {
      const dateA = new Date(a.month || a.date || 0);
      const dateB = new Date(b.month || b.date || 0);
      return dateA - dateB;
    });

    // Extract labels and values
    const labels = sorted.map(item => {
      const date = new Date(item.month || item.date);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    const values = sorted.map(item => parseFloat(item.amount || item.totalAmount || 0));
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;

    return { labels, values, average };
  }, [data]);

  // Handle empty data state
  if (!data || data.length === 0 || processedData.values.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No trend data available
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Add transactions over multiple months to see trends
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.primaryContainer,
    backgroundGradientTo: theme.colors.secondaryContainer,
    backgroundGradientFromOpacity: 0.2,
    backgroundGradientToOpacity: 0.1,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.colors.primary.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
    labelColor: (opacity = 1) => theme.dark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: theme.colors.primary
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    }
  };

  const chartData = {
    labels: processedData.labels,
    datasets: [
      {
        data: processedData.values,
        color: (opacity = 1) => theme.colors.primary.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
        strokeWidth: 3
      }
    ]
  };

  // Calculate trend direction
  const firstValue = processedData.values[0];
  const lastValue = processedData.values[processedData.values.length - 1];
  const trendChange = lastValue - firstValue;
  const trendPercentage = firstValue > 0 ? ((trendChange / firstValue) * 100).toFixed(1) : 0;
  const isIncreasing = trendChange > 0;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>{title}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={styles.statLabel}>Current</Text>
            <Text variant="titleMedium" style={styles.statValue}>${lastValue.toFixed(2)}</Text>
          </View>
          
          {showAverage && (
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={styles.statLabel}>Average</Text>
              <Text variant="titleMedium" style={styles.statValue}>
                ${processedData.average.toFixed(2)}
              </Text>
            </View>
          )}
          
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={styles.statLabel}>Trend</Text>
            <Text 
              variant="titleMedium" 
              style={[
                styles.statValue, 
                { color: isIncreasing ? theme.colors.error : theme.colors.tertiary }
              ]}
            >
              {isIncreasing ? '↑' : '↓'} {Math.abs(trendPercentage)}%
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={240}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
            fromZero={true}
            segments={4}
          />
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: theme.colors.primary }]} />
            <Text variant="bodySmall">Monthly Spending</Text>
          </View>
          {showAverage && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDash, { borderColor: theme.colors.outline }]} />
              <Text variant="bodySmall">Average: ${processedData.average.toFixed(2)}</Text>
            </View>
          )}
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
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
    marginVertical: 8,
  },
  chart: {
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  legendDash: {
    width: 24,
    height: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});

export default TrendLineChart;
