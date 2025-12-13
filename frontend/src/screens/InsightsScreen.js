import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Chip, SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import { 
  SpendingPieChart, 
  TrendLineChart, 
  BudgetBarChart, 
  IncomeVsExpenseChart 
} from '../components/charts';

const computeMonthRange = (offsetMonths = 0) => {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  };
};

export default function InsightsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [rangeMode, setRangeMode] = useState('this'); // 'this' | 'last'
  const [chartView, setChartView] = useState('pie'); // 'pie' | 'trend' | 'budget' | 'income'
  const [summary, setSummary] = useState([]);
  const [budgetData, setBudgetData] = useState([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);

  useEffect(() => {
    loadSummary();
    loadBudgetData();
    loadIncomeExpenseData();
  }, [rangeMode]);

  const loadSummary = async () => {
    if (!user?.UserId) return;
    try {
      setError(null);
      setLoading(true);

      const { start, end } =
        rangeMode === 'this' ? computeMonthRange(0) : computeMonthRange(-1);

      const data = await budgetService.getCategorySummary(user.UserId, {
        startDate: start,
        endDate: end,
      });

      setSummary(data || []);
    } catch (err) {
      console.error('Failed to load category summary:', err);
      setError('Failed to load category summary');
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetData = async () => {
    if (!user?.UserId) return;
    try {
      const { start, end } =
        rangeMode === 'this' ? computeMonthRange(0) : computeMonthRange(-1);

      // Get budget vs actual from backend using new endpoint
      const data = await budgetService.getBudgetComparison(user.UserId, {
        startDate: start,
        endDate: end,
      });

      // Transform to chart format
      const budgetFormatted = data.map(item => ({
        category: item.Category,
        actualAmount: parseFloat(item.ActualAmount) || 0,
        budgetedAmount: parseFloat(item.BudgetedAmount) || 0,
        percentageUsed: parseFloat(item.PercentageUsed) || 0,
        transactionCount: parseInt(item.TransactionCount) || 0,
      }));

      setBudgetData(budgetFormatted);
    } catch (err) {
      console.error('Failed to load budget data:', err);
    }
  };

  const loadIncomeExpenseData = async () => {
    if (!user?.UserId) return;
    try {
      // Get last 6 months of income vs expense data from backend
      const data = await budgetService.getIncomeExpenseSummary(user.UserId, {
        months: 6,
      });

      // Transform to chart format
      const formatted = data.map(item => ({
        month: item.Month, // This is the MonthStart date
        income: parseFloat(item.Income) || 0,
        expenses: parseFloat(item.Expenses) || 0,
        netSavings: parseFloat(item.NetSavings) || 0,
        savingsRate: parseFloat(item.SavingsRate) || 0,
      }));

      setIncomeExpenseData(formatted);
    } catch (err) {
      console.error('Failed to load income/expense data:', err);
    }
  };

  const total = summary.reduce((sum, c) => sum + (parseFloat(c.TotalAmount) || 0), 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);

  const loadTrends = async (category) => {
    if (!user?.UserId || !category) return;
    try {
      setTrendError(null);
      setTrendLoading(true);
      setSelectedCategory(category);

      const data = await budgetService.getCategoryTrends(user.UserId, {
        category,
        months: 12,
      });

      setTrendData(data || []);
    } catch (err) {
      console.error('Failed to load category trends:', err);
      setTrendError('Failed to load category trends');
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const computeAverages = () => {
    if (!trendData || trendData.length === 0) return null;

    const points = trendData
      .map((d) => ({
        label: `${d.Month}/${d.Year}`,
        year: d.Year,
        month: d.Month,
        value: parseFloat(d.TotalAmount) || 0,
      }))
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    const current = points[points.length - 1];
    if (!current) return null;

    const lastN = (n) => points.slice(-n);

    const avg = (arr) =>
      arr.length === 0
        ? 0
        : arr.reduce((sum, p) => sum + p.value, 0) / arr.length;

    const last3 = lastN(3);
    const last6 = lastN(6);
    const last12 = lastN(12);

    return {
      points,
      current,
      avg3: avg(last3),
      avg6: avg(last6),
      avg12: avg(last12),
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Insights</Text>

        {/* Chart Type Selector */}
        <SegmentedButtons
          value={chartView}
          onValueChange={setChartView}
          buttons={[
            { value: 'pie', label: 'Spending', icon: 'chart-pie' },
            { value: 'trend', label: 'Trends', icon: 'chart-line' },
            { value: 'budget', label: 'Budget', icon: 'chart-bar' },
            { value: 'income', label: 'Income', icon: 'cash-multiple' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Month Range Selector */}
        <View style={styles.chipContainer}>
          <Chip
            mode={rangeMode === 'this' ? 'flat' : 'outlined'}
            onPress={() => setRangeMode('this')}
            style={styles.rangeChip}
          >
            This month
          </Chip>
          <Chip
            mode={rangeMode === 'last' ? 'flat' : 'outlined'}
            onPress={() => setRangeMode('last')}
            style={styles.rangeChip}
          >
            Last month
          </Chip>
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {!loading && error && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* Chart Views */}
            {chartView === 'pie' && (
              <SpendingPieChart 
                data={summary.map(cat => ({
                  category: cat.Category,
                  totalAmount: cat.TotalAmount,
                }))}
                title="Spending by Category"
              />
            )}

            {chartView === 'trend' && selectedCategory && (
              <TrendLineChart
                data={trendData.map(t => ({
                  month: `${t.Year}-${String(t.Month).padStart(2, '0')}-01`,
                  amount: t.TotalAmount,
                }))}
                title={`Trend: ${selectedCategory}`}
                showAverage={true}
              />
            )}

            {chartView === 'trend' && !selectedCategory && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.emptyText}>
                    Select a category below to view trends
                  </Text>
                </Card.Content>
              </Card>
            )}

            {chartView === 'budget' && (
              <BudgetBarChart
                data={budgetData}
                title="Budget vs Actual"
                showPercentages={true}
              />
            )}

            {chartView === 'income' && (
              <IncomeVsExpenseChart
                data={incomeExpenseData}
                title="Income vs Expenses"
                showSavings={true}
              />
            )}

            {/* Category List for selecting trends */}
            {summary.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Category Details</Text>
                  {summary.map((cat) => {
                    const value = parseFloat(cat.TotalAmount) || 0;
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <View
                        key={cat.Category}
                        style={styles.row}
                      >
                        <View style={styles.rowHeader}>
                          <Text
                            style={[
                              styles.categoryName,
                              selectedCategory === cat.Category && styles.selectedCategory
                            ]}
                            onPress={() => {
                              setChartView('trend');
                              loadTrends(cat.Category);
                            }}
                          >
                            {cat.Category}
                          </Text>
                          <Text style={styles.categoryAmount}>
                            {formatCurrency(value)}
                          </Text>
                        </View>
                        <View style={styles.barBackground}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${Math.min(100, pct)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.percentText}>
                          {pct.toFixed(1)}% • {cat.TransactionCount} tx
                        </Text>
                      </View>
                    );
                  })}
                </Card.Content>
              </Card>
            )}

            {summary.length === 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.emptyText}>No data for this period</Text>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rangeChip: {
    marginHorizontal: 4,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  row: {
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6200ee',
  },
  selectedCategory: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#6200ee',
  },
  percentText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});


