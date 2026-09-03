import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  PanResponder,
  Platform,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthSelector({ selectedDate, onDateChange, onCustomRange }) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [pickerYear, setPickerYear] = useState(selectedDate.getFullYear());

  // Track screen dimensions for responsive design
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const isMobile = dimensions.width < 600;
  const isSmallMobile = dimensions.width < 400;

  const translateX = useRef(new Animated.Value(0)).current;
  
  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx * 0.3);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe right - go to previous month
          goToPreviousMonth();
        } else if (gestureState.dx < -50) {
          // Swipe left - go to next month
          goToNextMonth();
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const selectMonth = (monthIndex) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    onDateChange(newDate);
    setShowPicker(false);
  };

  const handleCustomRange = () => {
    if (customStartDate && customEndDate) {
      onCustomRange?.(customStartDate, customEndDate);
      setShowPicker(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const formatMonth = (date) => {
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedDate.getMonth() === now.getMonth() && 
           selectedDate.getFullYear() === now.getFullYear();
  };

  return (
    <View style={[styles.container, { paddingHorizontal: isMobile ? 12 : 20, paddingVertical: isMobile ? 10 : 12 }]}>
      {/* Arrow Navigation */}
      <TouchableOpacity
        style={[styles.arrowButton, { backgroundColor: theme.surface, width: isSmallMobile ? 36 : 40, height: isSmallMobile ? 36 : 40 }]}
        onPress={goToPreviousMonth}
      >
        <Text style={[styles.arrowText, { color: theme.text, fontSize: isSmallMobile ? 24 : 28 }]}>‹</Text>
      </TouchableOpacity>

      {/* Month Display with Swipe */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.monthDisplay,
          { transform: [{ translateX }] }
        ]}
      >
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={[styles.monthText, { color: theme.text, fontSize: isSmallMobile ? 16 : isMobile ? 18 : 20 }]}>
            {formatMonth(selectedDate)}
          </Text>
          <Text style={[styles.tapHint, { color: theme.textSecondary, fontSize: isSmallMobile ? 10 : 11 }]}>
            Tap to select range
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Arrow Navigation */}
      <TouchableOpacity
        style={[
          styles.arrowButton,
          { backgroundColor: theme.surface, width: isSmallMobile ? 36 : 40, height: isSmallMobile ? 36 : 40 },
        ]}
        onPress={goToNextMonth}
      >
        <Text style={[
          styles.arrowText,
          { color: theme.text, fontSize: isSmallMobile ? 24 : 28 }
        ]}>›</Text>
      </TouchableOpacity>

      {/* Date Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.modalOverlay, { padding: isMobile ? 12 : 20 }]}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: theme.background, padding: isMobile ? 16 : 20, maxWidth: isMobile ? '100%' : 360 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Period</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Year Selector */}
            <View style={styles.yearSelector}>
              <TouchableOpacity 
                style={[styles.yearArrow, { backgroundColor: theme.surface }]}
                onPress={() => setPickerYear(y => y - 1)}
              >
                <Text style={[styles.yearArrowText, { color: theme.text }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: theme.text }]}>{pickerYear}</Text>
              <TouchableOpacity 
                style={[styles.yearArrow, { backgroundColor: theme.surface }]}
                onPress={() => setPickerYear(y => y + 1)}
              >
                <Text style={[styles.yearArrowText, { color: theme.text }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <View style={styles.monthGrid}>
              {MONTHS.map((month, index) => {
                const isSelected = selectedDate.getMonth() === index && 
                                   selectedDate.getFullYear() === pickerYear;
                const isFuture = new Date(pickerYear, index, 1) > new Date();
                
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthGridItem,
                      { borderColor: theme.border },
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                      isFuture && styles.monthGridItemDisabled
                    ]}
                    onPress={() => !isFuture && selectMonth(index)}
                    disabled={isFuture}
                  >
                    <Text style={[
                      styles.monthGridText,
                      { color: theme.text },
                      isSelected && { color: theme.textOnPrimary },
                      isFuture && { color: theme.textDisabled }
                    ]}>
                      {month.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Date Range */}
            <View style={[styles.customRangeSection, { borderTopColor: theme.border }]}>
              <Text style={[styles.customRangeTitle, { color: theme.textSecondary }]}>
                Or select custom range:
              </Text>
              <View style={styles.customRangeInputs}>
                <TextInput
                  style={[styles.dateInput, { 
                    backgroundColor: theme.surface, 
                    borderColor: theme.border,
                    color: theme.text 
                  }]}
                  placeholder="Start (YYYY-MM-DD)"
                  placeholderTextColor={theme.textDisabled}
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                />
                <Text style={[styles.rangeSeparator, { color: theme.textSecondary }]}>to</Text>
                <TextInput
                  style={[styles.dateInput, { 
                    backgroundColor: theme.surface, 
                    borderColor: theme.border,
                    color: theme.text 
                  }]}
                  placeholder="End (YYYY-MM-DD)"
                  placeholderTextColor={theme.textDisabled}
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  { backgroundColor: theme.primary },
                  (!customStartDate || !customEndDate) && { opacity: 0.5 }
                ]}
                onPress={handleCustomRange}
                disabled={!customStartDate || !customEndDate}
              >
                <Text style={[styles.applyButtonText, { color: theme.textOnPrimary }]}>
                  Apply Custom Range
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presets}>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: theme.border }]}
                onPress={() => {
                  onDateChange(new Date());
                  setShowPicker(false);
                }}
              >
                <Text style={[styles.presetText, { color: theme.primary }]}>This Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: theme.border }]}
                onPress={() => {
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  onDateChange(lastMonth);
                  setShowPicker(false);
                }}
              >
                <Text style={[styles.presetText, { color: theme.primary }]}>Last Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetButton, { borderColor: theme.border }]}
                onPress={() => {
                  const threeMonthsAgo = new Date();
                  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                  const start = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
                  const now = new Date();
                  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
                  onCustomRange?.(start, end);
                  setShowPicker(false);
                }}
              >
                <Text style={[styles.presetText, { color: theme.primary }]}>Last 3 Months</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.5,
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '300',
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  yearArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearArrowText: {
    fontSize: 22,
    fontWeight: '300',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 24,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  monthGridItem: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  monthGridItemDisabled: {
    opacity: 0.4,
  },
  monthGridText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customRangeSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  customRangeTitle: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  customRangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  rangeSeparator: {
    fontSize: 14,
  },
  applyButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
  },
});



