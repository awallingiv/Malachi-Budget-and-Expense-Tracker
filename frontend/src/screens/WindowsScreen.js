import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Text, 
  FAB, 
  Portal, 
  Modal, 
  Card, 
  TextInput, 
  SegmentedButtons,
  Chip,
  IconButton
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import { WindowManager } from '../components/WindowManager';
import ModernButton from '../components/ModernButton';
import ModernInput from '../components/ModernInput';

const PRESET_CATEGORIES = [
  { name: 'Bills', displayName: 'Monthly Bills', description: 'Recurring monthly expenses', color: 'red' },
  { name: 'Utilities', displayName: 'Utilities', description: 'Electric, water, gas, internet', color: 'orange' },
  { name: 'Groceries', displayName: 'Groceries', description: 'Food and household items', color: 'green' },
  { name: 'Transportation', displayName: 'Transportation', description: 'Gas, car maintenance, transit', color: 'blue' },
  { name: 'Entertainment', displayName: 'Entertainment', description: 'Movies, dining out, hobbies', color: 'purple' },
  { name: 'Healthcare', displayName: 'Healthcare', description: 'Medical expenses and insurance', color: 'teal' },
];

export default function WindowsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [windows, setWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState(null);

  // New window form state
  const [newWindow, setNewWindow] = useState({
    CategoryName: '',
    DisplayName: '',
    Description: '',
    ColorTheme: 'blue',
    PositionX: 100,
    PositionY: 100,
    Width: 300,
    Height: 250
  });
  const [createMode, setCreateMode] = useState('preset'); // 'preset' or 'custom'

  useEffect(() => {
    if (user?.UserId) {
      loadWindows();
    }
  }, [user?.UserId]);

  const loadWindows = async () => {
    try {
      setError(null);
      const data = await budgetService.getCategoryWindows(user.UserId);
      setWindows(data);
    } catch (err) {
      console.error('Failed to load windows:', err);
      setError('Failed to load category windows');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWindows();
  }, []);

  const handleCreateWindow = async (categoryData = null) => {
    try {
      const windowData = categoryData || newWindow;
      
      // Find a good position for new window (avoid overlaps)
      const occupiedPositions = windows.map(w => ({ x: w.PositionX, y: w.PositionY }));
      let positionX = 100;
      let positionY = 100;
      
      // Simple positioning algorithm to avoid overlaps
      for (let i = 0; i < occupiedPositions.length; i++) {
        const overlap = occupiedPositions.find(pos => 
          Math.abs(pos.x - positionX) < 50 && Math.abs(pos.y - positionY) < 50
        );
        if (overlap) {
          positionX += 50;
          positionY += 30;
          if (positionX > 500) {
            positionX = 100;
            positionY += 100;
          }
        }
      }

      const result = await budgetService.createCategoryWindow({
        UserID: user.UserId,
        Username: user.Username,
        CategoryName: windowData.CategoryName,
        DisplayName: windowData.DisplayName,
        Description: windowData.Description,
        ColorTheme: windowData.ColorTheme || 'blue',
        PositionX: positionX,
        PositionY: positionY,
        Width: windowData.Width || 300,
        Height: windowData.Height || 250
      });

      if (result.success) {
        loadWindows(); // Reload to get the new window
        setShowCreateModal(false);
        resetNewWindow();
      }
    } catch (error) {
      console.error('Failed to create window:', error);
      setError('Failed to create category window');
    }
  };

  const handleUpdateWindow = async (windowId, updates) => {
    try {
      const result = await budgetService.updateCategoryWindow(windowId, {
        UserID: user.UserId,
        ...updates
      });

      if (result.success) {
        // Update local state immediately for smooth UI
        setWindows(prev => 
          prev.map(w => 
            w.WindowID === windowId 
              ? { ...w, ...updates, LastEdit: new Date().toISOString() }
              : w
          )
        );
      }
    } catch (error) {
      console.error('Failed to update window:', error);
      setError('Failed to update window');
    }
  };

  const handleDeleteWindow = async (windowId) => {
    try {
      const result = await budgetService.deleteCategoryWindow(windowId, user.UserId);
      
      if (result.success) {
        setWindows(prev => prev.filter(w => w.WindowID !== windowId));
      }
    } catch (error) {
      console.error('Failed to delete window:', error);
      setError('Failed to delete window');
    }
  };

  const resetNewWindow = () => {
    setNewWindow({
      CategoryName: '',
      DisplayName: '',
      Description: '',
      ColorTheme: 'blue',
      PositionX: 100,
      PositionY: 100,
      Width: 300,
      Height: 250
    });
  };

  const handlePresetSelect = (preset) => {
    handleCreateWindow({
      CategoryName: preset.name,
      DisplayName: preset.displayName,
      Description: preset.description,
      ColorTheme: preset.color,
      Width: 300,
      Height: 250
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading budget windows...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WindowManager
        windows={windows}
        onWindowUpdate={handleUpdateWindow}
        onWindowDelete={handleDeleteWindow}
      >
        {/* Desktop Background Content */}
        <ScrollView 
          style={styles.backgroundContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && (
            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorText}>{error}</Text>
                <Button onPress={loadWindows} mode="outlined" style={styles.retryButton}>
                  Retry
                </Button>
              </Card.Content>
            </Card>
          )}

          {windows.length === 0 && !loading && (
            <Card style={styles.welcomeCard}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.welcomeTitle}>
                  🏠 Welcome to Your Budget Desktop
                </Text>
                <Text variant="bodyMedium" style={styles.welcomeText}>
                  Create category windows to organize your expenses like apps on a desktop. 
                  You can drag them around, resize them, and manage your budget visually!
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => setShowCreateModal(true)}
                  style={styles.getStartedButton}
                >
                  Create Your First Category
                </Button>
              </Card.Content>
            </Card>
          )}

          {windows.length > 0 && (
            <View style={styles.statsPanel}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.statsTitle}>
                    📊 Budget Overview
                  </Text>
                  <Text variant="bodyMedium">
                    {windows.length} active categories
                  </Text>
                  <Text variant="bodySmall" style={styles.statsHint}>
                    Drag windows around • Double-tap to minimize • Create new categories with the + button
                  </Text>
                </Card.Content>
              </Card>
            </View>
          )}
        </ScrollView>
      </WindowManager>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        label="Add Category"
      />

      {/* Create Window Modal */}
      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Create New Category Window</Text>
                <IconButton
                  icon="close"
                  onPress={() => setShowCreateModal(false)}
                />
              </View>

              {/* Mode Selection */}
              <SegmentedButtons
                value={createMode}
                onValueChange={setCreateMode}
                buttons={[
                  { value: 'preset', label: 'Quick Setup' },
                  { value: 'custom', label: 'Custom' }
                ]}
                style={styles.modeSelector}
              />

              {createMode === 'preset' ? (
                <View style={styles.presetGrid}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Choose a preset category:
                  </Text>
                  <View style={styles.presetOptions}>
                    {PRESET_CATEGORIES.map((preset, index) => (
                      <Chip
                        key={index}
                        mode="outlined"
                        onPress={() => handlePresetSelect(preset)}
                        style={[styles.presetChip, { borderColor: preset.color }]}
                      >
                        {preset.displayName}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.customForm}>
                  <TextInput
                    label="Category Name"
                    value={newWindow.CategoryName}
                    onChangeText={(text) => setNewWindow(prev => ({ ...prev, CategoryName: text }))}
                    style={styles.input}
                    placeholder="e.g., Bills, Groceries"
                  />
                  
                  <TextInput
                    label="Display Name"
                    value={newWindow.DisplayName}
                    onChangeText={(text) => setNewWindow(prev => ({ ...prev, DisplayName: text }))}
                    style={styles.input}
                    placeholder="e.g., Monthly Bills"
                  />
                  
                  <TextInput
                    label="Description (Optional)"
                    value={newWindow.Description}
                    onChangeText={(text) => setNewWindow(prev => ({ ...prev, Description: text }))}
                    style={styles.input}
                    placeholder="Brief description of this category"
                    multiline
                  />

                  <Text variant="titleSmall" style={styles.colorLabel}>Color Theme:</Text>
                  <View style={styles.colorOptions}>
                    {Object.keys({ blue: 1, green: 1, orange: 1, purple: 1, red: 1, teal: 1 }).map(color => (
                      <Chip
                        key={color}
                        mode={newWindow.ColorTheme === color ? 'flat' : 'outlined'}
                        selected={newWindow.ColorTheme === color}
                        onPress={() => setNewWindow(prev => ({ ...prev, ColorTheme: color }))}
                        style={styles.colorChip}
                      >
                        {color}
                      </Chip>
                    ))}
                  </View>

                  <View style={styles.modalButtons}>
                    <ModernButton
                      title="Cancel"
                      variant="outline"
                      onPress={() => setShowCreateModal(false)}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <ModernButton
                      title="Create"
                      variant="primary"
                      onPress={() => handleCreateWindow()}
                      disabled={!newWindow.CategoryName || !newWindow.DisplayName}
                      icon="plus"
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f4fd',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
  },
  backgroundContent: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    marginTop: 50,
    marginBottom: 20,
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#1976d2',
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  getStartedButton: {
    marginTop: 10,
  },
  statsPanel: {
    marginTop: 20,
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  statsTitle: {
    marginBottom: 10,
    color: '#333',
  },
  statsHint: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    marginBottom: 20,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 0,
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modeSelector: {
    marginBottom: 20,
  },
  presetGrid: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 15,
    color: '#333',
  },
  presetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    marginBottom: 8,
    marginRight: 8,
  },
  customForm: {
    gap: 15,
  },
  input: {
    marginBottom: 10,
  },
  colorLabel: {
    marginBottom: 10,
    marginTop: 10,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  colorChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.45,
  },
});