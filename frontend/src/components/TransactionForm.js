import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { budgetService, categoryService } from '../services/apiService';

const TransactionForm = ({ 
  transaction = null, 
  isVisible, 
  onClose, 
  onSave,
  categoryName = null // Pre-selected category from window
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    tableName: categoryName || '',
    due: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    notes: '',
    category: '',
    status: 'Active'
  });
  
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadUserCategories();
    
    // Load transaction data if editing
    if (transaction) {
      setFormData({
        description: transaction.description || '',
        amount: transaction.amount?.toString() || '',
        tableName: transaction.category || transaction.tableName || '',
        due: transaction.dueDate ? new Date(transaction.dueDate).toISOString().split('T')[0] : '',
        date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
        notes: transaction.notes || '',
        category: transaction.category || '',
        status: transaction.status || 'Active'
      });
    }
    
    // Load draft from storage
    loadDraft();
  }, [transaction]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (isDraft) {
      const timer = setInterval(saveDraft, 30000);
      return () => clearInterval(timer);
    }
  }, [formData, isDraft]);

  const loadUserCategories = async () => {
    try {
      const userTables = await categoryService.getUserTables(user.UserId);
      const commonCategories = ['Bills', 'Subscriptions', 'Groceries', 'Entertainment', 'Transportation', 'Healthcare', 'Other'];
      
      // Combine user's existing categories with common ones
      const allCategories = [...new Set([...userTables.map(t => t.TableName), ...commonCategories])];
      setCategories(allCategories.map(name => ({ name, displayName: name })));
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback to common categories
      setCategories([
        'Bills', 'Subscriptions', 'Groceries', 'Entertainment', 
        'Transportation', 'Healthcare', 'Other'
      ].map(name => ({ name, displayName: name })));
    }
  };

  const saveDraft = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('transactionDraft', JSON.stringify(formData));
    }
    // For React Native, use AsyncStorage (would need import)
  };

  const loadDraft = () => {
    if (!transaction && Platform.OS === 'web') {
      const draft = localStorage.getItem('transactionDraft');
      if (draft) {
        setFormData(JSON.parse(draft));
        setIsDraft(true);
      }
    }
  };

  const clearDraft = () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('transactionDraft');
    }
    setIsDraft(false);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 150) {
      newErrors.description = 'Description must be 150 characters or less';
    }
    
    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
      newErrors.amount = 'Valid amount is required';
    } else if (parseFloat(formData.amount) < 0) {
      newErrors.amount = 'Amount must be positive';
    }
    
    if (!formData.tableName) {
      newErrors.tableName = 'Category is required';
    }
    
    if (formData.notes && formData.notes.length > 60) {
      newErrors.notes = 'Notes must be 60 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const transactionData = {
        UserID: user.UserId,
        Username: user.Username,
        TableName: formData.tableName,
        Description: formData.description,
        Amount: parseFloat(formData.amount),
        Due: formData.due ? new Date(formData.due).toISOString() : null,
        Date: formData.date ? new Date(formData.date).toISOString() : null,
        Notes: formData.notes,
        Category: formData.category || formData.tableName,
        Status: formData.status
      };

      let result;
      if (transaction?.id) {
        // Update existing transaction
        result = await budgetService.updateTransaction(transaction.id, transactionData);
      } else {
        // Create new transaction
        result = await budgetService.createTransaction(transactionData);
      }

      if (result) {
        clearDraft();
        onSave && onSave(result);
        onClose();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      setErrors({ submit: error.message || 'Failed to save transaction' });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDraft(true);
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const formatCurrency = (value) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(numValue) ? '' : numValue.toFixed(2);
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {transaction ? 'Edit Transaction' : 'Add New Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Draft Indicator */}
          {isDraft && (
            <View style={styles.draftIndicator}>
              <Text style={styles.draftText}>💾 Draft auto-saved</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, errors.description && styles.inputError]}
                value={formData.description}
                onChangeText={(value) => handleFieldChange('description', value)}
                placeholder="Enter transaction description"
                maxLength={150}
                placeholderTextColor="#666"
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              <Text style={styles.charCount}>{formData.description.length}/150</Text>
            </View>

            {/* Amount */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Amount *</Text>
              <View style={styles.currencyContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.currencyInput, errors.amount && styles.inputError]}
                  value={formData.amount}
                  onChangeText={(value) => handleFieldChange('amount', value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  onBlur={() => {
                    if (formData.amount) {
                      handleFieldChange('amount', formatCurrency(formData.amount));
                    }
                  }}
                  placeholderTextColor="#666"
                />
              </View>
              {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.categoryChip,
                        formData.tableName === cat.name && styles.categoryChipSelected
                      ]}
                      onPress={() => handleFieldChange('tableName', cat.name)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        formData.tableName === cat.name && styles.categoryChipTextSelected
                      ]}>
                        {cat.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {errors.tableName && <Text style={styles.errorText}>{errors.tableName}</Text>}
            </View>

            {/* Date Fields */}
            <View style={styles.dateRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.date}
                  onChangeText={(value) => handleFieldChange('date', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                />
              </View>
              
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Due Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.due}
                  onChangeText={(value) => handleFieldChange('due', value)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Status */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                {['Active', 'Pending', 'Paid', 'Cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      formData.status === status && styles.statusOptionSelected
                    ]}
                    onPress={() => handleFieldChange('status', status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      formData.status === status && styles.statusOptionTextSelected
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.textArea, errors.notes && styles.inputError]}
                value={formData.notes}
                onChangeText={(value) => handleFieldChange('notes', value)}
                placeholder="Additional notes (optional)"
                multiline
                numberOfLines={3}
                maxLength={60}
                placeholderTextColor="#666"
              />
              {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
              <Text style={styles.charCount}>{formData.notes.length}/60</Text>
            </View>
          </View>

          {/* Submit Error */}
          {errors.submit && (
            <View style={styles.submitErrorContainer}>
              <Text style={styles.submitErrorText}>{errors.submit}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : (transaction ? 'Update' : 'Add Transaction')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  draftIndicator: {
    backgroundColor: '#2a4d3a',
    padding: 8,
    borderRadius: 5,
    marginBottom: 15,
  },
  draftText: {
    color: '#4caf50',
    fontSize: 12,
    textAlign: 'center',
  },
  form: {
    gap: 15,
  },
  fieldGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  inputError: {
    borderColor: '#ff4757',
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  currencySymbol: {
    color: '#fff',
    fontSize: 16,
    paddingLeft: 12,
    paddingRight: 5,
  },
  currencyInput: {
    flex: 1,
    padding: 12,
    paddingLeft: 5,
    color: '#fff',
    fontSize: 16,
  },
  categoryContainer: {
    marginTop: 5,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryChipSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  categoryChipText: {
    color: '#ccc',
    fontSize: 14,
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  statusOptionSelected: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  statusOptionText: {
    color: '#ccc',
    fontSize: 12,
  },
  statusOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#888',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 3,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 12,
    marginTop: 3,
  },
  submitErrorContainer: {
    backgroundColor: '#4a1e1e',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  submitErrorText: {
    color: '#ff4757',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#0066cc',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TransactionForm;