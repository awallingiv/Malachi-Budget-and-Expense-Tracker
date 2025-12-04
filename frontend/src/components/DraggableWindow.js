import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Animated, TouchableOpacity } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DraggableWindow = ({ 
  title, 
  children, 
  initialPosition = { x: 100, y: 100 }, 
  initialSize = { width: 400, height: 300 },
  onClose,
  zIndex = 1,
  isLocked = false
}) => {
  const [pan] = useState(new Animated.ValueXY(initialPosition));
  const [windowSize, setWindowSize] = useState(initialSize);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Don't allow dragging if locked
      if (isLocked) return false;
      
      // Only allow dragging from title bar area and with sufficient movement
      const hasMovement = Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      return hasMovement;
    },
    onPanResponderGrant: () => {
      if (isLocked) return;
      
      setIsDragging(true);
      pan.setOffset({
        x: pan.x._value,
        y: pan.y._value,
      });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (evt, gestureState) => {
      if (isLocked) return;
      
      // Use direct setValue for smoother performance.
      pan.setValue({
        x: gestureState.dx,
        y: gestureState.dy
      });
    },
    onPanResponderRelease: () => {
      if (isLocked) return;
      
      setIsDragging(false);
      pan.flattenOffset();
      
      // Keep window within screen bounds
      const currentX = pan.x._value;
      const currentY = pan.y._value;
      
      let newX = Math.max(0, Math.min(currentX, screenWidth - windowSize.width));
      let newY = Math.max(0, Math.min(currentY, screenHeight - windowSize.height));
      
      if (newX !== currentX || newY !== currentY) {
        Animated.timing(pan, {
          toValue: { x: newX, y: newY },
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const windowHeight = isMinimized ? 40 : windowSize.height;

  return (
    <Animated.View
      style={[
        styles.window,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          width: windowSize.width,
          height: windowHeight,
          zIndex: zIndex,
        },
      ]}
    >
      {/* Title Bar */}
      <View 
        style={[
          styles.titleBar, 
          isLocked && styles.titleBarLocked,
          isDragging && styles.titleBarDragging
        ]} 
        {...(!isLocked ? panResponder.panHandlers : {})}
      >
        <Text style={styles.titleText}>
          {isLocked && '🔒 '}{title}
        </Text>
        <View style={styles.windowControls}>
          <TouchableOpacity 
            style={[styles.controlButton, styles.minimizeButton]}
            onPress={() => setIsMinimized(!isMinimized)}
          >
            <Text style={styles.controlButtonText}>
              {isMinimized ? '□' : '_'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.controlButton, styles.closeButton]} 
            onPress={onClose}
          >
            <Text style={styles.controlButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Window Content */}
      {!isMinimized && (
        <View style={styles.windowContent}>
          {children}
        </View>
      )}

      {/* Resize Handle */}
      {!isMinimized && (
        <View style={styles.resizeHandle}>
          <Text style={styles.resizeIndicator}>⋱</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    cursor: 'move',
  },
  titleBarLocked: {
    cursor: 'default',
    backgroundColor: '#1a1a1a',
  },
  titleBarDragging: {
    backgroundColor: '#0066ff',
  },
  titleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  windowControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizeButton: {
    backgroundColor: '#ffa500',
  },
  closeButton: {
    backgroundColor: '#ff5555',
  },
  controlButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  windowContent: {
    flex: 1,
    padding: 16,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeIndicator: {
    color: '#666',
    fontSize: 16,
  },
});

export default DraggableWindow;