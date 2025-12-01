import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Screens
import MobileHomeScreen from '../screens/MobileHomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import IncomeScreen from '../screens/IncomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MobileNavigator() {
  const { theme, isDark } = useTheme();

  const getTabBarIcon = (routeName, focused, color, size) => {
    let iconName;

    switch (routeName) {
      case 'Home':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'Expenses':
        iconName = focused ? 'credit-card' : 'credit-card-outline';
        break;
      case 'Income':
        iconName = focused ? 'cash-multiple' : 'cash';
        break;
      case 'Profile':
        iconName = focused ? 'account-circle' : 'account-circle-outline';
        break;
      default:
        iconName = 'circle';
    }

    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => 
            getTabBarIcon(route.name, focused, color, size),
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
            height: Platform.OS === 'ios' ? 88 : 64,
            elevation: theme.elevation?.medium || 8,
            shadowColor: theme.shadowColor,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          headerShown: false,
          tabBarHideOnKeyboard: true,
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={MobileHomeScreen}
          options={{
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen 
          name="Expenses" 
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
    </NavigationContainer>
  );
}
