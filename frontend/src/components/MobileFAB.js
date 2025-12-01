import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MobileFAB = ({ onAddExpense, onAddIncome }) => {
  const { theme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const expenseAnim = useRef(new Animated.Value(0)).current;
  const incomeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      // Open animation
      Animated.parallel([
        Animated.spring(rotateAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.stagger(40, [
          Animated.spring(incomeAnim, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(expenseAnim, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.spring(rotateAnim, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(expenseAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(incomeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleAddExpense = () => {
    setIsOpen(false);
    setTimeout(() => {
      onAddExpense?.();
    }, 100);
  };

  const handleAddIncome = () => {
    setIsOpen(false);
    setTimeout(() => {
      onAddIncome?.();
    }, 100);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Horizontal expansion - buttons appear to the left of main FAB
  const incomeTranslateX = incomeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -75],
  });

  const expenseTranslateX = expenseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
              backgroundColor: theme.overlay,
            },
          ]}
        >
          <Pressable style={styles.backdropTouchable} onPress={() => setIsOpen(false)} />
        </Animated.View>
      )}

      <View style={styles.container} pointerEvents="box-none">
        {/* Add Expense Mini FAB */}
        <Animated.View
          style={[
            styles.miniFabContainer,
            {
              opacity: expenseAnim,
              transform: [{ translateX: expenseTranslateX }, { scale: expenseAnim }],
            },
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.miniFab, { backgroundColor: theme.accent }]}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <Text style={styles.miniFabIcon}>💳</Text>
          </TouchableOpacity>
          <Text style={[styles.miniFabLabel, { color: theme.text }]}>Expense</Text>
        </Animated.View>

        {/* Add Income Mini FAB */}
        <Animated.View
          style={[
            styles.miniFabContainer,
            {
              opacity: incomeAnim,
              transform: [{ translateX: incomeTranslateX }, { scale: incomeAnim }],
            },
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.miniFab, { backgroundColor: theme.secondary }]}
            onPress={handleAddIncome}
            activeOpacity={0.8}
          >
            <Text style={styles.miniFabIcon}>💵</Text>
          </TouchableOpacity>
          <Text style={[styles.miniFabLabel, { color: theme.text }]}>Income</Text>
        </Animated.View>

        {/* Main FAB */}
        <Animated.View
          style={[
            styles.mainFabContainer,
            {
              transform: [{ rotate: rotateInterpolate }],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.mainFab,
              {
                backgroundColor: isOpen ? theme.primary : theme.primary,
                shadowColor: theme.shadowColor,
              },
            ]}
            onPress={toggleMenu}
            activeOpacity={0.9}
          >
            <Text style={[styles.mainFabIcon, { color: theme.textOnPrimary }]}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
  },
  mainFabContainer: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainFabIcon: {
    fontSize: 30,
    fontWeight: '300',
    marginTop: -2,
  },
  miniFabContainer: {
    position: 'absolute',
    right: 0,
    alignItems: 'center',
  },
  miniFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  miniFabIcon: {
    fontSize: 20,
  },
  miniFabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default MobileFAB;
