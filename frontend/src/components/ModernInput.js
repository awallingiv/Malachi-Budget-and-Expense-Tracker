import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const ModernInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  disabled = false,
  required = false,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const containerStyles = [
    styles.container,
    {
      borderColor: error ? theme.error : isFocused ? theme.primary : theme.border,
      backgroundColor: theme.surface,
      borderWidth: 1,
    },
    disabled && { opacity: 0.5 },
    style
  ];

  const inputStyles = [
    styles.input,
    {
      color: theme.text,
      fontSize: 16,
      minHeight: multiline ? numberOfLines * 20 : 48,
    },
    inputStyle
  ];

  const labelStyles = [
    styles.label,
    {
      color: error ? theme.error : isFocused ? theme.primary : theme.textSecondary,
    }
  ];

  const errorStyles = [
    styles.error,
    { color: theme.error }
  ];

  const handleRightIconPress = () => {
    if (secureTextEntry) {
      setShowPassword(!showPassword);
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const renderRightIcon = () => {
    if (secureTextEntry) {
      return (
        <TouchableOpacity onPress={handleRightIconPress} style={styles.iconButton}>
          <MaterialIcons
            name={showPassword ? 'visibility-off' : 'visibility'}
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      );
    }
    
    if (rightIcon) {
      return (
        <TouchableOpacity onPress={onRightIconPress} style={styles.iconButton}>
          <MaterialIcons
            name={rightIcon}
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={labelStyles}>
          {label}
          {required && <Text style={{ color: theme.error }}> *</Text>}
        </Text>
      )}
      
      <View style={containerStyles}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <MaterialIcons
              name={leftIcon}
              size={24}
              color={theme.textSecondary}
            />
          </View>
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textDisabled}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={inputStyles}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          {...props}
        />
        
        {renderRightIcon()}
      </View>
      
      {error && <Text style={errorStyles}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  leftIconContainer: {
    marginRight: 12,
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default ModernInput;