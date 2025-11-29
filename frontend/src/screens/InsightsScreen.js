import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';

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
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);

  useEffect(() => {
    loadSummary();
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

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Category Breakdown</Text>
              <View style={styles.chipRow}>
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
            </View>

            {loading && (
              <View style={styles.center}>
                <ActivityIndicator />
              </View>
            )}

            {!loading && error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {!loading && !error && summary.length === 0 && (
              <Text style={styles.emptyText}>No expenses for this period.</Text>
            )}

            {!loading && !error && summary.length > 0 && (
              <>
                {/* Simple horizontal bar \"pie\" with tap-to-view trends */}
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
                          style={styles.categoryName}
                          onPress={() => loadTrends(cat.Category)}
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

                {/* Top 3 categories */}
                <View style={styles.topCategories}>
                  <Text style={styles.subTitle}>Top categories</Text>
                  {summary.slice(0, 3).map((cat) => (
                    <Text key={cat.Category} style={styles.topCategoryItem}>
                      • {cat.Category} — {formatCurrency(cat.TotalAmount)}
                    </Text>
                  ))}
                </View>

                {/* Category trend details */}
                {selectedCategory && (
                  <View style={styles.trendSection}>
                    <Text style={styles.subTitle}>
                      Trend — {selectedCategory}
                    </Text>
                    {trendLoading && (
                      <View style={styles.center}>
                        <ActivityIndicator />
                      </View>
                    )}
                    {!trendLoading && trendError && (
                      <Text style={styles.errorText}>{trendError}</Text>
                    )}
                    {!trendLoading && !trendError && trendData.length === 0 && (
                      <Text style={styles.emptyText}>
                        No trend data available.
                      </Text>
                    )}
                    {!trendLoading && !trendError && trendData.length > 0 && (
                      <>
                        {(() => {
                          const stats = computeAverages();
                          if (!stats) return null;
                          const { current, avg3, avg6, avg12 } = stats;
                          return (
                            <View style={styles.trendSummary}>
                              <Text style={styles.trendSummaryText}>
                                This month: {formatCurrency(current.value)}
                              </Text>
                              <Text style={styles.trendSummaryText}>
                                3‑month avg: {formatCurrency(avg3)}
                              </Text>
                              <Text style={styles.trendSummaryText}>
                                6‑month avg: {formatCurrency(avg6)}
                              </Text>
                              <Text style={styles.trendSummaryText}>
                                12‑month avg: {formatCurrency(avg12)}
                              </Text>
                            </View>
                          );
                        })()}
                        {computeAverages()?.points.map((p) => (
                          <View key={`${p.year}-${p.month}`} style={styles.row}>
                            <View style={styles.rowHeader}>
                              <Text style={styles.categoryName}>{p.label}</Text>
                              <Text style={styles.categoryAmount}>
                                {formatCurrency(p.value)}
                              </Text>
                            </View>
                            <View style={styles.barBackground}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    width: `${Math.min(
                                      100,
                                      p.value > 0
                                        ? (p.value /
                                            Math.max(
                                              ...computeAverages().points.map(
                                                (pt) => pt.value || 0
                                              )
                                            )) *
                                          100
                                        : 0
                                    )}%`,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
  },
  rangeChip: {
    marginLeft: 6,
  },
  errorText: {
    color: '#d32f2f',
  },
  emptyText: {
    color: '#666',
  },
  row: {
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
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
  topCategories: {
    marginTop: 16,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  topCategoryItem: {
    fontSize: 14,
    color: '#333',
  },
});


