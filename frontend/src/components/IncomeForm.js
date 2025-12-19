import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { budgetService } from '../services/apiService';

const IncomeForm = ({ 
  income = null, 
  isVisible, 
  onClose, 
  onSave 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    gross: '',
    net: '',
    tithe: '',
    tithePercentage: '10', // Default 10%
    titheStatus: 'Pending',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format for database
    paycheckStatus: 'Received',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [calculationMode, setCalculationMode] = useState('gross'); // 'gross' or 'net'
  const [titheCalculationMode, setTitheCalculationMode] = useState('auto'); // 'auto' or 'manual'
  
  // Paycheck templates for quick entry
  const [templates, setTemplates] = useState([
    { name: 'Regular Paycheck', gross: 0, description: 'Bi-weekly salary' },
    { name: 'Overtime', gross: 0, description: 'Overtime pay' },
    { name: 'Bonus', gross: 0, description: 'Performance bonus' },
    { name: 'Commission', gross: 0, description: 'Sales commission' }
  ]);

  useEffect(() => {
    if (income) {
      // Format date from database (DATETIME) to YYYY-MM-DD for input
      let formattedDate = new Date().toISOString().split('T')[0];
      if (income.date) {
        try {
          formattedDate = new Date(income.date).toISOString().split('T')[0];
        } catch (e) {
          formattedDate = income.date; // Fallback to original if parsing fails
        }
      }

      setFormData({
        description: income.description || '',
        gross: income.gross?.toString() || '',
        net: income.net?.toString() || '',
        tithe: income.tithe?.toString() || '',
        tithePercentage: income.tithePercentage?.toString() || '10',
        titheStatus: income.titheStatus || 'Pending',
        date: formattedDate,
        paycheckStatus: income.paycheckStatus || 'Received',
        notes: income.notes || ''
      });
    }

    loadTemplates();
  }, [income]);

  // Auto-calculate tithe when gross/net changes
  useEffect(() => {
    if (titheCalculationMode === 'auto') {
      calculateTithe();
    }
  }, [formData.gross, formData.net, formData.tithePercentage, calculationMode, titheCalculationMode]);

  const loadTemplates = () => {
    // In a real app, load from AsyncStorage or API
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('incomeTemplates');
      if (saved) {
        setTemplates(JSON.parse(saved));
      }
    }
  };

  const saveTemplates = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('incomeTemplates', JSON.stringify(templates));
    }
  };

  const calculateTithe = () => {
    const percentage = parseFloat(formData.tithePercentage) / 100;
    let baseAmount = 0;
    
    if (calculationMode === 'gross' && formData.gross) {
      baseAmount = parseFloat(formData.gross);
    } else if (calculationMode === 'net' && formData.net) {
      baseAmount = parseFloat(formData.net);
    }
    
    if (baseAmount > 0 && percentage > 0) {
      const titheAmount = (baseAmount * percentage).toFixed(2);
      setFormData(prev => ({ ...prev, tithe: titheAmount }));
    }
  };

  const calculateNet = () => {
    // Simple net calculation (gross - estimated taxes)
    const grossAmount = parseFloat(formData.gross);
    if (grossAmount > 0) {
      // Rough estimation: 25% tax rate
      const estimatedNet = (grossAmount * 0.75).toFixed(2);
      setFormData(prev => ({ ...prev, net: estimatedNet }));
    }
  };

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      description: template.description,
      gross: template.gross.toString()
    }));
    
    if (template.gross > 0) {
      // Auto-calculate net if we have a gross amount
      const estimatedNet = (template.gross * 0.75).toFixed(2);
      setFormData(prev => ({ ...prev, net: estimatedNet }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 45) {
      newErrors.description = 'Description must be 45 characters or less';
    }
    
    if (!formData.gross && !formData.net) {
      newErrors.amount = 'Either gross or net amount is required';
    }
    
    if (formData.gross && (isNaN(parseFloat(formData.gross)) || parseFloat(formData.gross) < 0)) {
      newErrors.gross = 'Valid gross amount required';
    }
    
    if (formData.net && (isNaN(parseFloat(formData.net)) || parseFloat(formData.net) < 0)) {
      newErrors.net = 'Valid net amount required';
    }
    
    if (formData.tithe && (isNaN(parseFloat(formData.tithe)) || parseFloat(formData.tithe) < 0)) {
      newErrors.tithe = 'Valid tithe amount required';
    }
    
    const percentage = parseFloat(formData.tithePercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      newErrors.tithePercentage = 'Percentage must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const incomeData = {
        UserID: user.UserId,
        Username: user.Username,
        Description: formData.description,
        Gross: formData.gross ? parseFloat(formData.gross) : null,
        Net: formData.net ? parseFloat(formData.net) : null,
        Tithe: formData.tithe ? parseFloat(formData.tithe) : null,
        TitheStatus: formData.titheStatus,
        Date: formData.date, // Store as VARCHAR in database
        PaycheckStatus: formData.paycheckStatus,
        Notes: formData.notes
      };

      let result;
      if (income?.id) {
        result = await budgetService.updateIncome(income.id, incomeData);
      } else {
        result = await budgetService.createIncome(incomeData);
      }

      if (result) {
        // Update templates with this entry if it's significant
        if (parseFloat(formData.gross) > 0 && formData.description) {
          updateTemplates();
        }
        
        onSave && onSave(result);
        onClose();
      }
    } catch (error) {
      console.error('Error saving income:', error);
      setErrors({ submit: error.message || 'Failed to save income' });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplates = () => {
    const newTemplate = {
      name: formData.description,
      gross: parseFloat(formData.gross) || 0,
      description: formData.description
    };
    
    const updatedTemplates = [...templates];
    const existingIndex = updatedTemplates.findIndex(t => t.name === newTemplate.name);
    
    if (existingIndex >= 0) {
      updatedTemplates[existingIndex] = newTemplate;
    } else if (updatedTemplates.length < 10) { // Limit to 10 templates
      updatedTemplates.push(newTemplate);
    }
    
    setTemplates(updatedTemplates);
    saveTemplates();
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
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

  // Calculate year-to-date and monthly totals for display
  const yearToDate = {
    gross: 45000, // Would come from API
    net: 33750,
    tithe: 4500
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {income ? 'Edit Income' : 'Add New Income'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Year-to-Date Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Year-to-Date Summary</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Gross</Text>
                <Text style={styles.summaryValue}>${yearToDate.gross.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net</Text>
                <Text style={styles.summaryValue}>${yearToDate.net.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Tithe</Text>
                <Text style={styles.summaryValue}>${yearToDate.tithe.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Quick Templates */}
          {!income && templates.length > 0 && (
            <View style={styles.templatesContainer}>
              <Text style={styles.sectionTitle}>Quick Templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {templates.map((template, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.templateCard}
                    onPress={() => applyTemplate(template)}
                  >
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateAmount}>
                      ${template.gross.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
                placeholder="e.g., Bi-weekly salary, Bonus, Freelance"
                maxLength={45}
                placeholderTextColor="#666"
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              <Text style={styles.charCount}>{formData.description.length}/45</Text>
            </View>

            {/* Amount Section */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>Income Amounts</Text>
              
              {/* Gross Amount */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Gross Income</Text>
                  <TouchableOpacity
                    style={styles.calculationModeButton}
                    onPress={() => setCalculationMode('gross')}
                  >
                    <Text style={[
                      styles.calculationModeText,
                      calculationMode === 'gross' && styles.calculationModeTextActive
                    ]}>
                      Use for Tithe
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.currencyContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.currencyInput, errors.gross && styles.inputError]}
                    value={formData.gross}
                    onChangeText={(value) => handleFieldChange('gross', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onBlur={() => {
                      if (formData.gross) {
                        handleFieldChange('gross', formatCurrency(formData.gross));
                      }
                    }}
                    placeholderTextColor="#666"
                  />
                  <TouchableOpacity
                    style={styles.calculateButton}
                    onPress={calculateNet}
                  >
                    <Text style={styles.calculateButtonText}>Calc Net</Text>
                  </TouchableOpacity>
                </View>
                {errors.gross && <Text style={styles.errorText}>{errors.gross}</Text>}
              </View>

              {/* Net Amount */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Net Income (Take-home)</Text>
                  <TouchableOpacity
                    style={styles.calculationModeButton}
                    onPress={() => setCalculationMode('net')}
                  >
                    <Text style={[
                      styles.calculationModeText,
                      calculationMode === 'net' && styles.calculationModeTextActive
                    ]}>
                      Use for Tithe
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.currencyContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.currencyInput, errors.net && styles.inputError]}
                    value={formData.net}
                    onChangeText={(value) => handleFieldChange('net', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onBlur={() => {
                      if (formData.net) {
                        handleFieldChange('net', formatCurrency(formData.net));
                      }
                    }}
                    placeholderTextColor="#666"
                  />
                </View>
                {errors.net && <Text style={styles.errorText}>{errors.net}</Text>}
              </View>
            </View>

            {/* Tithe Section */}
            <View style={styles.titheSection}>
              <View style={styles.titheSectionHeader}>
                <Text style={styles.sectionTitle}>Tithe Calculation</Text>
                <View style={styles.titheToggle}>
                  <TouchableOpacity
                    style={[
                      styles.titheToggleOption,
                      titheCalculationMode === 'auto' && styles.titheToggleOptionActive
                    ]}
                    onPress={() => setTitheCalculationMode('auto')}
                  >
                    <Text style={[
                      styles.titheToggleText,
                      titheCalculationMode === 'auto' && styles.titheToggleTextActive
                    ]}>Auto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.titheToggleOption,
                      titheCalculationMode === 'manual' && styles.titheToggleOptionActive
                    ]}
                    onPress={() => setTitheCalculationMode('manual')}
                  >
                    <Text style={[
                      styles.titheToggleText,
                      titheCalculationMode === 'manual' && styles.titheToggleTextActive
                    ]}>Manual</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tithe Percentage */}
              {titheCalculationMode === 'auto' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Tithe Percentage</Text>
                  <View style={styles.percentageContainer}>
                    <TextInput
                      style={[styles.percentageInput, errors.tithePercentage && styles.inputError]}
                      value={formData.tithePercentage}
                      onChangeText={(value) => handleFieldChange('tithePercentage', value)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#666"
                    />
                    <Text style={styles.percentageSymbol}>%</Text>
                  </View>
                  {errors.tithePercentage && <Text style={styles.errorText}>{errors.tithePercentage}</Text>}
                  <Text style={styles.calculationNote}>
                    Based on {calculationMode} income
                  </Text>
                </View>
              )}

              {/* Tithe Amount */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tithe Amount</Text>
                <View style={styles.currencyContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[
                      styles.currencyInput, 
                      errors.tithe && styles.inputError,
                      titheCalculationMode === 'auto' && styles.inputReadonly
                    ]}
                    value={formData.tithe}
                    onChangeText={(value) => handleFieldChange('tithe', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    editable={titheCalculationMode === 'manual'}
                    onBlur={() => {
                      if (formData.tithe && titheCalculationMode === 'manual') {
                        handleFieldChange('tithe', formatCurrency(formData.tithe));
                      }
                    }}
                    placeholderTextColor="#666"
                  />
                </View>
                {errors.tithe && <Text style={styles.errorText}>{errors.tithe}</Text>}
              </View>

              {/* Tithe Status */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Tithe Status</Text>
                <View style={styles.statusContainer}>
                  {['Pending', 'Paid', 'Deferred', 'N/A'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        formData.titheStatus === status && styles.statusOptionSelected
                      ]}
                      onPress={() => handleFieldChange('titheStatus', status)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        formData.titheStatus === status && styles.statusOptionTextSelected
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Additional Details */}
            <View style={styles.additionalSection}>
              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Pay Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.date}
                  onChangeText={(value) => handleFieldChange('date', value)}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#666"
                />
              </View>

              {/* Paycheck Status */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Paycheck Status</Text>
                <View style={styles.statusContainer}>
                  {['Received', 'Pending', 'Processing', 'Deposited'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        formData.paycheckStatus === status && styles.statusOptionSelected
                      ]}
                      onPress={() => handleFieldChange('paycheckStatus', status)}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        formData.paycheckStatus === status && styles.statusOptionTextSelected
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
                  style={styles.textArea}
                  value={formData.notes}
                  onChangeText={(value) => handleFieldChange('notes', value)}
                  placeholder="Additional notes (optional)"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#666"
                />
              </View>
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
                {loading ? 'Saving...' : (income ? 'Update Income' : 'Add Income')}
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
    maxWidth: 600,
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
  summaryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  summaryValue: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  templatesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  templateCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  templateName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  templateAmount: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  form: {
    gap: 20,
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  calculationModeButton: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  calculationModeText: {
    color: '#888',
    fontSize: 11,
  },
  calculationModeTextActive: {
    color: '#4caf50',
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
  inputReadonly: {
    backgroundColor: '#1a1a1a',
    color: '#888',
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
  calculateButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 5,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  amountSection: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 15,
  },
  titheSection: {
    backgroundColor: '#2a4d3a',
    borderRadius: 10,
    padding: 15,
  },
  titheSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titheToggle: {
    flexDirection: 'row',
    backgroundColor: '#1a3329',
    borderRadius: 15,
    padding: 2,
  },
  titheToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 13,
  },
  titheToggleOptionActive: {
    backgroundColor: '#4caf50',
  },
  titheToggleText: {
    color: '#888',
    fontSize: 12,
  },
  titheToggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    width: 100,
  },
  percentageInput: {
    flex: 1,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  percentageSymbol: {
    color: '#fff',
    fontSize: 16,
    paddingRight: 12,
  },
  calculationNote: {
    color: '#888',
    fontSize: 11,
    marginTop: 5,
    fontStyle: 'italic',
  },
  additionalSection: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 15,
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
    backgroundColor: '#4caf50',
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

export default IncomeForm;