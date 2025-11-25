import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const ModernButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  ...props
}) => {
  const { theme } = useTheme();

  const getButtonConfig = () => {
    const configs = {
      primary: {
        gradient: theme.gradientPrimary,
        textColor: theme.textOnPrimary,
        borderColor: 'transparent'
      },
      secondary: {
        gradient: theme.gradientSecondary,
        textColor: theme.textOnSecondary,
        borderColor: 'transparent'
      },
      outline: {
        gradient: ['transparent', 'transparent'],
        textColor: theme.primary,
        borderColor: theme.primary,
        borderWidth: 1
      },
      ghost: {
        gradient: ['transparent', 'transparent'],
        textColor: theme.text,
        borderColor: 'transparent'
      },
      glass: {
        gradient: [theme.glass, theme.glassBlur],
        textColor: theme.text,
        borderColor: theme.border,
        borderWidth: 1
      }
    };
    return configs[variant] || configs.primary;
  };

  const getSizeConfig = () => {
    const sizes = {
      small: {
        height: 36,
        paddingHorizontal: 16,
        fontSize: 14,
        borderRadius: 8
      },
      medium: {
        height: 48,
        paddingHorizontal: 24,
        fontSize: 16,
        borderRadius: 12
      },
      large: {
        height: 56,
        paddingHorizontal: 32,
        fontSize: 18,
        borderRadius: 16
      }
    };
    return sizes[size] || sizes.medium;
  };

  const buttonConfig = getButtonConfig();
  const sizeConfig = getSizeConfig();

  const buttonStyles = [
    styles.button,
    {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: sizeConfig.borderRadius,
      borderColor: buttonConfig.borderColor,
      borderWidth: buttonConfig.borderWidth || 0,
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.5 : 1
    },
    style
  ];

  const textStyles = [
    styles.text,
    {
      color: buttonConfig.textColor,
      fontSize: sizeConfig.fontSize,
      fontWeight: '600'
    },
    textStyle
  ];

  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <MaterialIcons
        name={icon}
        size={sizeConfig.fontSize + 2}
        color={buttonConfig.textColor}
        style={[
          iconPosition === 'left' ? styles.iconLeft : styles.iconRight
        ]}
      />
    );
  };

  const renderContent = () => (
    <View style={styles.content}>
      {iconPosition === 'left' && renderIcon()}
      <Text style={textStyles}>{title}</Text>
      {iconPosition === 'right' && renderIcon()}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyles}
      {...props}
    >
      <LinearGradient
        colors={buttonConfig.gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {renderContent()}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default ModernButton;