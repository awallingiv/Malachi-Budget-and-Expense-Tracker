import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Modern Dark Theme Colors - Bleeding Edge Design
export const THEMES = {
  dark: {
    // Core Colors
    primary: '#0066FF',        // Electric Blue
    secondary: '#00FF88',      // Neon Green  
    accent: '#FF6B6B',         // Coral
    error: '#FF4757',          // Red
    warning: '#FFA726',        // Orange
    success: '#00E676',        // Green
    info: '#29B6F6',          // Light Blue
    
    // Background Hierarchy
    background: '#0A0A0A',     // Deep Black
    surface: '#1A1A1A',       // Dark Gray
    card: '#252525',           // Elevated Dark
    modal: '#1F1F1F',         // Modal Background
    overlay: 'rgba(0,0,0,0.8)', // Overlay
    
    // Text Colors
    text: '#FFFFFF',           // Pure White
    textSecondary: '#B3B3B3',  // Light Gray
    textDisabled: '#666666',   // Medium Gray
    textOnPrimary: '#FFFFFF',  // White on Blue
    textOnSecondary: '#000000', // Black on Green
    
    // Border & Divider
    border: '#333333',         // Border Gray
    divider: '#2A2A2A',       // Divider Gray
    
    // Glassmorphism
    glass: 'rgba(255,255,255,0.1)',
    glassBlur: 'rgba(255,255,255,0.05)',
    
    // Gradients
    gradientPrimary: ['#0066FF', '#0052CC'],
    gradientSecondary: ['#00FF88', '#00CC6A'],
    gradientBackground: ['#0A0A0A', '#1A1A1A'],
    gradientCard: ['#252525', '#1F1F1F'],
    
    // Shadows
    shadowColor: '#000000',
    elevation: {
      small: 4,
      medium: 8,
      large: 16
    }
  },
  
  light: {
    // Core Colors  
    primary: '#0066FF',
    secondary: '#00B86B', 
    accent: '#FF6B6B',
    error: '#FF4757',
    warning: '#FFA726',
    success: '#4CAF50',
    info: '#2196F3',
    
    // Background Hierarchy
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    modal: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.5)',
    
    // Text Colors
    text: '#000000',
    textSecondary: '#666666',
    textDisabled: '#999999',
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#FFFFFF',
    
    // Border & Divider
    border: '#E0E0E0',
    divider: '#F0F0F0',
    
    // Glassmorphism
    glass: 'rgba(255,255,255,0.8)',
    glassBlur: 'rgba(255,255,255,0.4)',
    
    // Gradients
    gradientPrimary: ['#0066FF', '#0052CC'],
    gradientSecondary: ['#00B86B', '#009A5B'],
    gradientBackground: ['#FFFFFF', '#F8F9FA'],
    gradientCard: ['#FFFFFF', '#F8F9FA'],
    
    // Shadows
    shadowColor: '#000000',
    elevation: {
      small: 2,
      medium: 4,
      large: 8
    }
  }
};

// React Native Paper Theme Configuration
export const getPaperTheme = (theme) => ({
  ...theme,
  colors: {
    primary: theme.primary,
    primaryContainer: theme.glass,
    secondary: theme.secondary,
    secondaryContainer: theme.glassBlur,
    tertiary: theme.accent,
    surface: theme.surface,
    surfaceVariant: theme.card,
    background: theme.background,
    error: theme.error,
    errorContainer: 'rgba(255, 71, 87, 0.1)',
    onPrimary: theme.textOnPrimary,
    onSecondary: theme.textOnSecondary,
    onSurface: theme.text,
    onSurfaceVariant: theme.textSecondary,
    onBackground: theme.text,
    onError: '#FFFFFF',
    outline: theme.border,
    outlineVariant: theme.divider,
    inverseSurface: theme.text,
    inverseOnSurface: theme.background,
    inversePrimary: theme.primary,
    shadow: theme.shadowColor,
    scrim: theme.overlay,
    backdrop: theme.overlay,
  },
  fonts: {
    // Modern Typography Scale
    displayLarge: { 
      fontSize: 57, 
      lineHeight: 64, 
      fontWeight: '400',
      letterSpacing: -0.25 
    },
    displayMedium: { 
      fontSize: 45, 
      lineHeight: 52, 
      fontWeight: '400',
      letterSpacing: 0 
    },
    displaySmall: { 
      fontSize: 36, 
      lineHeight: 44, 
      fontWeight: '400',
      letterSpacing: 0 
    },
    headlineLarge: { 
      fontSize: 32, 
      lineHeight: 40, 
      fontWeight: '600',
      letterSpacing: 0 
    },
    headlineMedium: { 
      fontSize: 28, 
      lineHeight: 36, 
      fontWeight: '600',
      letterSpacing: 0 
    },
    headlineSmall: { 
      fontSize: 24, 
      lineHeight: 32, 
      fontWeight: '600',
      letterSpacing: 0 
    },
    titleLarge: { 
      fontSize: 22, 
      lineHeight: 28, 
      fontWeight: '500',
      letterSpacing: 0 
    },
    titleMedium: { 
      fontSize: 16, 
      lineHeight: 24, 
      fontWeight: '500',
      letterSpacing: 0.15 
    },
    titleSmall: { 
      fontSize: 14, 
      lineHeight: 20, 
      fontWeight: '500',
      letterSpacing: 0.1 
    },
    bodyLarge: { 
      fontSize: 16, 
      lineHeight: 24, 
      fontWeight: '400',
      letterSpacing: 0.5 
    },
    bodyMedium: { 
      fontSize: 14, 
      lineHeight: 20, 
      fontWeight: '400',
      letterSpacing: 0.25 
    },
    bodySmall: { 
      fontSize: 12, 
      lineHeight: 16, 
      fontWeight: '400',
      letterSpacing: 0.4 
    },
    labelLarge: { 
      fontSize: 14, 
      lineHeight: 20, 
      fontWeight: '500',
      letterSpacing: 0.1 
    },
    labelMedium: { 
      fontSize: 12, 
      lineHeight: 16, 
      fontWeight: '500',
      letterSpacing: 0.5 
    },
    labelSmall: { 
      fontSize: 11, 
      lineHeight: 16, 
      fontWeight: '500',
      letterSpacing: 0.5 
    }
  }
});

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('dark'); // Default to dark mode
  const [currentTheme, setCurrentTheme] = useState(THEMES.dark);

  // Load theme preference from storage
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when mode changes
  useEffect(() => {
    updateTheme();
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const updateTheme = () => {
    let selectedTheme;
    
    switch (themeMode) {
      case 'light':
        selectedTheme = THEMES.light;
        break;
      case 'dark':
        selectedTheme = THEMES.dark;
        break;
      case 'auto':
        selectedTheme = systemColorScheme === 'dark' ? THEMES.dark : THEMES.light;
        break;
      default:
        selectedTheme = THEMES.dark; // Default to dark
    }
    
    setCurrentTheme(selectedTheme);
  };

  const changeTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    changeTheme(nextMode);
  };

  const value = {
    theme: currentTheme,
    themeMode,
    changeTheme,
    toggleTheme,
    isDark: themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark'),
    paperTheme: getPaperTheme(currentTheme)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;