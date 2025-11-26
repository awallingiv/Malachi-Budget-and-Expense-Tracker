import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, Dimensions, PanResponder, Animated, TouchableOpacity } from 'react-native';

// Web-specific imports (only loaded on web)
let Draggable = null;
if (Platform.OS === 'web') {
  try {
    Draggable = require('react-draggable').default;
  } catch (e) {
    console.warn('react-draggable not found, falling back to PanResponder');
  }
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Web-specific draggable window component
const WebDraggableWindow = ({ 
  title, 
  children, 
  initialPosition = { x: 100, y: 100 }, 
  initialSize = { width: 400, height: 300 },
  onClose,
  zIndex = 1,
  isLocked = false
}) => {
  const [windowSize, setWindowSize] = useState(initialSize);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(initialPosition);

  const handleDrag = (e, data) => {
    if (!isLocked) {
      setPosition({ x: data.x, y: data.y });
    }
  };

  const windowHeight = isMinimized ? 40 : windowSize.height;

  const WindowContent = (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: windowSize.width,
        height: windowHeight,
        zIndex: zIndex,
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #333',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: isLocked ? '#1a1a1a' : '#2a2a2a',
          padding: '8px 12px',
          borderBottom: '1px solid #333',
          cursor: isLocked ? 'default' : 'move',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
          {isLocked && '🔒 '}{title}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#ffa500',
              color: '#000',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMinimized ? '□' : '_'}
          </button>
          <button
            onClick={onClose}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#ff5555',
              color: '#000',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Window Content */}
      {!isMinimized && (
        <div style={{ padding: '16px', height: 'calc(100% - 40px)', overflow: 'auto' }}>
          {children}
        </div>
      )}

      {/* Resize Handle */}
      {!isMinimized && (
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '20px',
            height: '20px',
            color: '#666',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'se-resize',
          }}
        >
          ⋱
        </div>
      )}
    </div>
  );

  if (Draggable && !isLocked) {
    return (
      <Draggable
        handle="div:first-child" // Only allow dragging from title bar
        position={position}
        onDrag={handleDrag}
        bounds="parent"
      >
        {WindowContent}
      </Draggable>
    );
  }

  // Fallback for locked windows or when react-draggable isn't available
  return WindowContent;
};

// Mobile-specific draggable window component (original PanResponder implementation)
const MobileDraggableWindow = ({ 
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
      if (isLocked) return false;
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

// Main platform-aware component
const DraggableWindow = (props) => {
  if (Platform.OS === 'web') {
    return <WebDraggableWindow {...props} />;
  } else {
    return <MobileDraggableWindow {...props} />;
  }
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
  },
  titleBarLocked: {
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