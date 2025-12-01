import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import MobileFAB from '../components/MobileFAB';

const { width: screenWidth } = Dimensions.get('window');

// Animated card component
const AnimatedCard = ({ children, delay = 0, style, theme }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default function MobileHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAllData = async () => {
    if (!user?.UserId) return;

    try {
      setLoading(true);
      const [stats, txns, income] = await Promise.all([
        budgetService.getDashboardStats(user.UserId).catch(() => null),
        budgetService.getTransactions(user.UserId).catch(() => []),
        budgetService.getIncome(user.UserId).catch(() => []),
      ]);

      setDashboardData(stats);
      setTransactions(txns || []);
      setIncomeList(income || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Calculate totals
  const totalGross = incomeList.reduce((sum, i) => sum + (parseFloat(i.Gross || i.GrossIncome) || 0), 0);
  const totalNet = incomeList.reduce((sum, i) => sum + (parseFloat(i.Net || i.NetIncome) || 0), 0);
  const totalExpenses = transactions.reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);
  const netPosition = totalNet - totalExpenses;
  const savingsRate = totalNet > 0 ? ((totalNet - totalExpenses) / totalNet) * 100 : 0;

  // Get recent activity (combine and sort)
  const recentActivity = [
    ...transactions.slice(0, 10).map((t) => ({
      id: t.TransactionId,
      type: 'expense',
      description: t.Description || t.TableName || 'Expense',
      amount: -(parseFloat(t.Amount) || 0),
      date: t.Date || t.CreationTime,
      category: t.TableName,
    })),
    ...incomeList.slice(0, 10).map((i) => ({
      id: i.IncomeId,
      type: 'income',
      description: i.Description || i.Paycheck || 'Income',
      amount: parseFloat(i.Net || i.NetIncome) || 0,
      date: i.Date || i.PaycheckDate,
      category: 'Income',
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAddExpense = () => {
    navigation.navigate('Expenses');
  };

  const handleAddIncome = () => {
    navigation.navigate('Income');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background decorations */}
      <View style={[styles.bgOrb1, { backgroundColor: theme.primary, opacity: isDark ? 0.08 : 0.06 }]} />
      <View style={[styles.bgOrb2, { backgroundColor: theme.secondary, opacity: isDark ? 0.06 : 0.04 }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>{getGreeting()},</Text>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user?.Name || user?.Username || 'User'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.surface }]}
              onPress={toggleTheme}
            >
              <Text style={styles.headerButtonIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.surface }]}
              onPress={loadAllData}
            >
              <Text style={styles.headerButtonIcon}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Position Hero Card */}
        <AnimatedCard delay={0} theme={theme} style={styles.heroCard}>
          <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>NET POSITION</Text>
          <Text
            style={[
              styles.heroValue,
              { color: netPosition >= 0 ? theme.secondary : theme.accent },
            ]}
          >
            {formatCurrency(netPosition)}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textDisabled }]}>Income</Text>
              <Text style={[styles.heroStatValue, { color: theme.secondary }]}>
                {formatCurrency(totalNet)}
              </Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: theme.textDisabled }]}>Expenses</Text>
              <Text style={[styles.heroStatValue, { color: theme.accent }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <AnimatedCard delay={100} theme={theme} style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={[styles.statLabel, { color: theme.textDisabled }]}>Gross</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(totalGross)}</Text>
          </AnimatedCard>

          <AnimatedCard delay={150} theme={theme} style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={[styles.statLabel, { color: theme.textDisabled }]}>Savings</Text>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    savingsRate >= 20 ? theme.secondary : savingsRate >= 0 ? theme.warning : theme.accent,
                },
              ]}
            >
              {Math.max(0, savingsRate).toFixed(0)}%
            </Text>
          </AnimatedCard>
        </View>

        {/* Recent Activity */}
        <AnimatedCard delay={200} theme={theme} style={styles.activityCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>

          {recentActivity.length > 0 ? (
            recentActivity.map((item, index) => (
              <View
                key={item.id || index}
                style={[
                  styles.activityRow,
                  index < recentActivity.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.divider,
                  },
                ]}
              >
                <View
                  style={[
                    styles.activityIcon,
                    {
                      backgroundColor:
                        item.type === 'income'
                          ? `${theme.secondary}20`
                          : `${theme.accent}20`,
                    },
                  ]}
                >
                  <Text style={styles.activityIconText}>
                    {item.type === 'income' ? '💵' : '💳'}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityDesc, { color: theme.text }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <Text style={[styles.activityMeta, { color: theme.textDisabled }]}>
                    {item.category} • {formatDate(item.date)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.activityAmount,
                    { color: item.amount >= 0 ? theme.secondary : theme.accent },
                  ]}
                >
                  {item.amount >= 0 ? '+' : ''}
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No recent activity
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textDisabled }]}>
                Add your first transaction to get started
              </Text>
            </View>
          )}

          {recentActivity.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Expenses')}
            >
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View all transactions</Text>
            </TouchableOpacity>
          )}
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard delay={300} theme={theme} style={styles.quickActionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: `${theme.accent}15` }]}
              onPress={() => navigation.navigate('Expenses')}
            >
              <Text style={styles.quickActionIcon}>💳</Text>
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: `${theme.secondary}15` }]}
              onPress={() => navigation.navigate('Income')}
            >
              <Text style={styles.quickActionIcon}>💵</Text>
              <Text style={[styles.quickActionLabel, { color: theme.text }]}>Add Income</Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Spacer for bottom navigation */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <MobileFAB onAddExpense={handleAddExpense} onAddIncome={handleAddIncome} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgOrb1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  bgOrb2: {
    position: 'absolute',
    top: 150,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 15,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonIcon: {
    fontSize: 18,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  heroCard: {
    padding: 24,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    marginBottom: 20,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 16,
  },
  heroStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  activityCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  activityDesc: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 3,
  },
  activityMeta: {
    fontSize: 12,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsCard: {
    padding: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
