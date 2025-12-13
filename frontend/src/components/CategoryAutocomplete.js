import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { groupingService } from '../services/apiService';

const CategoryAutocomplete = ({
  groupingId,
  userId,
  value,
  onSelect,
  placeholder = 'Enter category...',
  style
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Load categories for this grouping
  useEffect(() => {
    if (groupingId && userId) {
      loadCategories();
    }
  }, [groupingId, userId]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categories = await groupingService.getCategoriesInGrouping(userId, groupingId);
      setAllCategories(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim() === '') {
      setSuggestions(allCategories);
    } else {
      const filtered = allCategories.filter(cat =>
        cat.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
    }
  }, [inputValue, allCategories]);

  const handleSelect = (category) => {
    setInputValue(category);
    setShowDropdown(false);
    onSelect(category);
  };

  const handleInputChange = (text) => {
    setInputValue(text);
    setShowDropdown(true);
  };

  const handleCreateNew = () => {
    // User typed something that doesn't match - create new category
    handleSelect(inputValue);
  };

  const handleBlur = () => {
    // Delay closing dropdown to allow click events to register
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={inputValue}
        onChangeText={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor="#666"
      />

      {showDropdown && (suggestions.length > 0 || inputValue.trim() !== '') && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item}-${index}`}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              inputValue.trim() !== '' && (
                <TouchableOpacity
                  style={[styles.suggestionItem, styles.createNew]}
                  onPress={handleCreateNew}
                >
                  <Text style={styles.createNewText}>
                    Create "{inputValue}"
                  </Text>
                </TouchableOpacity>
              )
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 16,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    maxHeight: 200,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 2000,
    ...Platform.select({
      web: {
        overflowY: 'auto',
      },
    }),
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  createNew: {
    backgroundColor: '#0066cc22',
  },
  createNewText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CategoryAutocomplete;
