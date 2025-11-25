import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { Card, Text, IconButton, Chip, Divider } from 'react-native-paper';
import { budgetService } from '../services/apiService';

const WINDOW_THEMES = {
  blue: { primary: '#1976d2', light: '#e3f2fd', accent: '#0d47a1' },
  green: { primary: '#388e3c', light: '#e8f5e9', accent: '#1b5e20' },
  orange: { primary: '#f57c00', light: '#fff3e0', accent: '#e65100' },
  purple: { primary: '#7b1fa2', light: '#f3e5f5', accent: '#4a148c' },
  red: { primary: '#d32f2f', light: '#ffebee', accent: '#b71c1c' },
  teal: { primary: '#00796b', light: '#e0f2f1', accent: '#004d40' }
};

export const CategoryWindow = ({ 
  window, 
  onUpdate, 
  onDelete, 
  onFocus, 
  zIndex,
  isWeb = true 
}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  
  const panRef = useRef();
  const windowRef = useRef();
  
  const theme = WINDOW_THEMES[window.ColorTheme] || WINDOW_THEMES.blue;
  const screenDimensions = Dimensions.get('window');

  // Load transactions for this window
  useEffect(() => {
    loadTransactions();
  }, [window.CategoryName]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getWindowTransactions(
        window.UserID, 
        window.CategoryName,
        { limit: 5 }
      );
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load window transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pan responder for dragging (web and mobile)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => dragEnabled,
    onMoveShouldSetPanResponder: () => dragEnabled,
    
    onPanResponderGrant: () => {
      onFocus(window.WindowID);
    },
    
    onPanResponderMove: (evt, gestureState) => {
      if (!dragEnabled) return;
      
      // Calculate new position
      const newX = Math.max(0, Math.min(
        window.PositionX + gestureState.dx,
        screenDimensions.width - window.Width
      ));
      const newY = Math.max(0, Math.min(
        window.PositionY + gestureState.dy,
        screenDimensions.height - window.Height
      ));
      
      // Update position in real-time
      if (windowRef.current) {
        windowRef.current.setNativeProps({
          style: {
            left: newX,
            top: newY,
          }
        });
      }
    },
    
    onPanResponderRelease: (evt, gestureState) => {
      if (!dragEnabled) return;
      
      const newX = Math.max(0, Math.min(
        window.PositionX + gestureState.dx,
        screenDimensions.width - window.Width
      ));
      const newY = Math.max(0, Math.min(
        window.PositionY + gestureState.dy,
        screenDimensions.height - window.Height
      ));
      
      // Update the window position
      onUpdate(window.WindowID, {
        PositionX: newX,
        PositionY: newY
      });
      
      setDragEnabled(false);
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleMinimize = () => {
    onUpdate(window.WindowID, {
      IsMinimized: !window.IsMinimized
    });
  };

  const handleResize = (newWidth, newHeight) => {
    onUpdate(window.WindowID, {
      Width: Math.max(250, Math.min(newWidth, 600)),
      Height: Math.max(200, Math.min(newHeight, 500))
    });
  };

  const totalAmount = transactions.reduce((sum, t) => sum + (t.Amount || 0), 0);

  return (
    <View
      ref={windowRef}
      style={[
        styles.windowContainer,
        {
          left: window.PositionX,
          top: window.PositionY,
          width: window.Width,
          height: window.IsMinimized ? 60 : window.Height,
          zIndex: zIndex,
        }
      ]}
      {...panResponder.panHandlers}
    >
      <Card style={[styles.window, { borderColor: theme.primary }]}>
        {/* Window Title Bar */}
        <View 
          style={[styles.titleBar, { backgroundColor: theme.primary }]}
          onTouchStart={() => setDragEnabled(true)}
        >
          <View style={styles.titleContent}>
            <Text variant="titleSmall" style={styles.titleText}>
              {window.DisplayName}
            </Text>
            <Chip 
              mode="outlined" 
              compact 
              textStyle={styles.chipText}
              style={[styles.amountChip, { borderColor: 'rgba(255,255,255,0.3)' }]}
            >
              {formatCurrency(totalAmount)}
            </Chip>
          </View>
          
          <View style={styles.windowControls}>
            <IconButton
              icon={window.IsMinimized ? "window-maximize" : "window-minimize"}
              iconColor="white"
              size={16}
              onPress={handleMinimize}
            />
            <IconButton
              icon="close"
              iconColor="white"
              size={16}
              onPress={() => onDelete(window.WindowID)}
            />
          </View>
        </View>

        {/* Window Content */}
        {!window.IsMinimized && (
          <Card.Content style={styles.windowContent}>
            {window.Description && (
              <Text variant="bodySmall" style={styles.description}>
                {window.Description}
              </Text>
            )}
            
            <Divider style={styles.divider} />
            
            {loading ? (
              <Text variant="bodySmall" style={styles.loadingText}>
                Loading transactions...
              </Text>
            ) : transactions.length > 0 ? (
              <View style={styles.transactionsList}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Recent Transactions
                </Text>
                {transactions.slice(0, 3).map((transaction, index) => (
                  <View key={transaction.TransactionId || index} style={styles.transactionItem}>
                    <View style={styles.transactionInfo}>
                      <Text variant="bodySmall" style={styles.transactionDescription}>
                        {transaction.Description || 'No description'}
                      </Text>
                      <Text variant="bodySmall" style={styles.transactionDate}>
                        {formatDate(transaction.Date)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={styles.transactionAmount}>
                      -{formatCurrency(transaction.Amount)}
                    </Text>
                  </View>
                ))}
                
                {transactions.length > 3 && (
                  <Text variant="bodySmall" style={styles.moreTransactions}>
                    +{transactions.length - 3} more transactions
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text variant="bodySmall" style={styles.emptyText}>
                  No transactions yet
                </Text>
                <Text variant="bodySmall" style={styles.emptyHint}>
                  Add your first {window.CategoryName} expense
                </Text>
              </View>
            )}
          </Card.Content>
        )}
      </Card>
    </View>
  );
};

export const WindowManager = ({ 
  windows = [], 
  onWindowUpdate, 
  onWindowDelete,
  children 
}) => {
  const [focusedWindowId, setFocusedWindowId] = useState(null);
  
  const handleFocus = (windowId) => {
    setFocusedWindowId(windowId);
    
    // Bring window to front by updating Z-index
    const maxZIndex = Math.max(...windows.map(w => w.ZIndex || 0));
    if (windows.find(w => w.WindowID === windowId)?.ZIndex !== maxZIndex + 1) {
      onWindowUpdate(windowId, {
        ZIndex: maxZIndex + 1
      });
    }
  };

  return (
    <View style={styles.desktop}>
      {/* Background/Desktop */}
      {children}
      
      {/* Windows */}
      {windows.map((window) => (
        <CategoryWindow
          key={window.WindowID}
          window={window}
          onUpdate={onWindowUpdate}
          onDelete={onWindowDelete}
          onFocus={handleFocus}
          zIndex={window.ZIndex || 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  windowContainer: {
    position: 'absolute',
  },
  window: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 10,
  },
  amountChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipText: {
    color: 'white',
    fontSize: 11,
  },
  windowControls: {
    flexDirection: 'row',
  },
  windowContent: {
    flex: 1,
    padding: 12,
  },
  description: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    color: '#333',
    fontWeight: '600',
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: '#333',
    fontWeight: '500',
  },
  transactionDate: {
    color: '#666',
    fontSize: 10,
  },
  transactionAmount: {
    color: '#f44336',
    fontWeight: '600',
  },
  moreTransactions: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyHint: {
    color: '#999',
    textAlign: 'center',
    fontSize: 10,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 20,
  },
});