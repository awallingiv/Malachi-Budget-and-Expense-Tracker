import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { useTheme as useAppTheme } from '../../context/ThemeContext';

const SpendingPieChart = ({ data = [], title = 'Spending Breakdown' }) => {
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

  // More responsive chart sizing for mobile web
  const chartWidth = isSmallMobile
    ? screenWidth - 20
    : isMobile
      ? Math.min(screenWidth - 30, 350)
      : Math.min(screenWidth - 40, 400);

  const chartHeight = isSmallMobile ? 180 : isMobile ? 200 : 220;

  // Generate colors for pie chart - using theme-aware colors with better contrast
  const chartColors = [
    themeColors?.primary || '#00d4aa',
    themeColors?.secondary || '#ff6b6b',
    themeColors?.accent || '#4ecdc4',
    '#ffd93d', '#9966FF',
    '#FF9F40', '#45b7d1', '#96ceb4', '#a29bfe', '#fd79a8'
  ];

  // Get the proper text color based on theme - ensure high contrast
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

        <View style={[styles.chartContainer, isMobile && styles.chartContainerMobile]}>
          <PieChart
            data={chartData}
            width={chartWidth}
            height={chartHeight}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft={isSmallMobile ? "-10" : "0"}
            absolute={false}
            hasLegend={false}
            center={isSmallMobile ? [chartWidth / 4, 0] : [chartWidth / 5, 0]}
          />
        </View>

        <ScrollView style={[styles.legendContainer, isMobile && styles.legendContainerMobile]}>
          {chartData.map((item, index) => {
            const percentage = ((item.amount / total) * 100).toFixed(1);
            return (
              <View key={index} style={[
                styles.legendItem,
                isMobile && styles.legendItemMobile,
                { borderBottomColor: themeColors?.chartGrid || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
              ]}>
                <View style={[styles.legendRow, isMobile && styles.legendRowMobile]}>
                  <View style={[styles.colorBox, isMobile && styles.colorBoxMobile, { backgroundColor: item.color }]} />
                  <Text
                    variant={isMobile ? "bodySmall" : "bodyMedium"}
                    style={[styles.legendText, isMobile && styles.legendTextMobile, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>
                <View style={[styles.amountContainer, isMobile && styles.amountContainerMobile]}>
                  <Text variant={isMobile ? "bodySmall" : "bodyMedium"} style={[styles.amount, isMobile && styles.amountMobile, { color: textColor }]}>
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" style={[styles.percentage, isMobile && styles.percentageMobile, { color: themeColors?.textMuted || (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)') }]}>
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
    overflow: 'hidden',
  },
  chartContainerMobile: {
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  legendContainerMobile: {
    maxHeight: 160,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  legendItemMobile: {
    paddingVertical: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendRowMobile: {
    flex: 0.6,
  },
  colorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  colorBoxMobile: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
  },
  legendTextMobile: {
    fontSize: 12,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountContainerMobile: {
    flex: 0.4,
  },
  amount: {
    fontWeight: 'bold',
  },
  amountMobile: {
    fontSize: 12,
  },
  percentage: {
    fontSize: 11,
    opacity: 0.7,
  },
  percentageMobile: {
    fontSize: 10,
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
