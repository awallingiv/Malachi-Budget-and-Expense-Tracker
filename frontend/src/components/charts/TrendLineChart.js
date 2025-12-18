import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const TrendLineChart = ({ data = [], title = 'Spending Trends', showAverage = true }) => {
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

  // Get theme-aware colors with high contrast
  const textColor = themeColors?.chartText || (isDark ? '#FFFFFF' : '#1a1a2e');
  const gridColor = themeColors?.chartGrid || (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)');
  const primaryColor = themeColors?.primary || theme.colors.primary;

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
      <Card style={[styles.card, isMobile && styles.cardMobile]}>
        <Card.Content>
          <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.title, { color: textColor }]}>{title}</Text>
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ color: themeColors?.textMuted || theme.colors.onSurfaceVariant }}>
              No trend data available
            </Text>
            <Text variant="bodySmall" style={{ color: themeColors?.textDim || theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Add transactions over multiple months to see trends
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  // Helper to convert hex to rgba
  const hexToRgba = (hex, opacity) => {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return hex.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
  };

  const chartConfig = {
    backgroundColor: themeColors?.cardBg || theme.colors.surface,
    backgroundGradientFrom: themeColors?.cardBg || theme.colors.primaryContainer,
    backgroundGradientTo: themeColors?.cardBg || theme.colors.secondaryContainer,
    backgroundGradientFromOpacity: 0.2,
    backgroundGradientToOpacity: 0.1,
    decimalPlaces: 0,
    color: (opacity = 1) => hexToRgba(primaryColor, opacity),
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: primaryColor
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: gridColor,
    }
  };

  const chartData = {
    labels: processedData.labels,
    datasets: [
      {
        data: processedData.values,
        color: (opacity = 1) => hexToRgba(primaryColor, opacity),
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

  // Use theme-aware colors for trend
  const successColor = themeColors?.success || theme.colors.tertiary;
  const dangerColor = themeColors?.danger || theme.colors.error;

  return (
    <Card style={[styles.card, isMobile && styles.cardMobile]}>
      <Card.Content style={isMobile && styles.cardContentMobile}>
        <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.title, { color: textColor }]}>{title}</Text>

        <View style={[styles.statsRow, isMobile && styles.statsRowMobile]}>
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={[styles.statLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Current</Text>
            <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.statValue, { color: textColor }]}>${lastValue.toFixed(2)}</Text>
          </View>

          {showAverage && (
            <View style={styles.statItem}>
              <Text variant="bodySmall" style={[styles.statLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Average</Text>
              <Text variant={isMobile ? "titleSmall" : "titleMedium"} style={[styles.statValue, { color: textColor }]}>
                ${processedData.average.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.statItem}>
            <Text variant="bodySmall" style={[styles.statLabel, { color: themeColors?.textMuted || theme.colors.onSurfaceVariant }]}>Trend</Text>
            <Text
              variant={isMobile ? "titleSmall" : "titleMedium"}
              style={[
                styles.statValue,
                { color: isIncreasing ? dangerColor : successColor }
              ]}
            >
              {isIncreasing ? '↑' : '↓'} {Math.abs(trendPercentage)}%
            </Text>
          </View>
        </View>

        <View style={[styles.chartContainer, isMobile && styles.chartContainerMobile]}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={!isSmallMobile}
            withShadow={false}
            fromZero={true}
            segments={isSmallMobile ? 3 : 4}
          />
        </View>

        <View style={[styles.legendContainer, isMobile && styles.legendContainerMobile]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, isMobile && styles.legendLineMobile, { backgroundColor: primaryColor }]} />
            <Text variant="bodySmall" style={{ color: textColor }}>Monthly Spending</Text>
          </View>
          {showAverage && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDash, isMobile && styles.legendDashMobile, { borderColor: themeColors?.textMuted || theme.colors.outline }]} />
              <Text variant="bodySmall" style={{ color: textColor }}>Avg: ${processedData.average.toFixed(2)}</Text>
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
  },
  statsRowMobile: {
    marginBottom: 10,
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
    overflow: 'hidden',
  },
  chartContainerMobile: {
    marginVertical: 6,
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
  legendContainerMobile: {
    marginTop: 10,
    gap: 12,
    flexWrap: 'wrap',
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
  legendLineMobile: {
    width: 18,
    height: 2,
  },
  legendDash: {
    width: 24,
    height: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  legendDashMobile: {
    width: 18,
  },
});

export default TrendLineChart;
