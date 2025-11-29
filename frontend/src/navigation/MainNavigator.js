import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import DashboardScreen from '../screens/DashboardScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import WindowsScreen from '../screens/WindowsScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RecurringScreen from '../screens/RecurringScreen';
import InsightsScreen from '../screens/InsightsScreen';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Budgets') {
            iconName = focused ? 'cash-check' : 'cash';
          } else if (route.name === 'Insights') {
            iconName = focused ? 'chart-donut' : 'chart-donut';
          } else if (route.name === 'Recurring') {
            iconName = focused ? 'calendar-clock' : 'calendar';
          } else if (route.name === 'Windows') {
            iconName = focused ? 'window-maximize' : 'window-restore';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'credit-card' : 'credit-card-outline';
          } else if (route.name === 'Income') {
            iconName = focused ? 'cash-multiple' : 'cash';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          elevation: 8,
          shadowColor: theme.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Overview',
        }}
      />
      <Tab.Screen 
        name="Budgets" 
        component={BudgetsScreen}
        options={{
          tabBarLabel: 'Budgets',
        }}
      />
      <Tab.Screen 
        name="Insights" 
        component={InsightsScreen}
        options={{
          tabBarLabel: 'Insights',
        }}
      />
      <Tab.Screen 
        name="Recurring" 
        component={RecurringScreen}
        options={{
          tabBarLabel: 'Recurring',
        }}
      />
      <Tab.Screen 
        name="Windows" 
        component={WindowsScreen}
        options={{
          tabBarLabel: 'Categories',
        }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'Expenses',
        }}
      />
      <Tab.Screen 
        name="Income" 
        component={IncomeScreen}
        options={{
          tabBarLabel: 'Income',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}