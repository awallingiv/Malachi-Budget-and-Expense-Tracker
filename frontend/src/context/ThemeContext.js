import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import storage from '../utils/storage';

// Theme presets - matching web ModernDashboard
export const THEME_PRESETS = {
  default: {
    name: 'Default (Emerald)',
    colors: {
      primary: '#00d4aa',
      secondary: '#ff6b6b',
      accent: '#4ecdc4',
      success: '#00d4aa',
      warning: '#ffd93d',
      danger: '#ff6b6b',
      cardBorder: 'rgba(0, 212, 170, 0.4)',
    }
  },
  ocean: {
    name: 'Ocean Blue',
    colors: {
      primary: '#0066FF',
      secondary: '#00B4D8',
      accent: '#90E0EF',
      success: '#00E676',
      warning: '#FFB74D',
      danger: '#FF5252',
      cardBorder: 'rgba(0, 102, 255, 0.4)',
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#FFD93D',
      success: '#6BCB77',
      warning: '#FFE66D',
      danger: '#FF4757',
      cardBorder: 'rgba(255, 107, 53, 0.4)',
    }
  },
  lavender: {
    name: 'Lavender Dreams',
    colors: {
      primary: '#9B59B6',
      secondary: '#E056FD',
      accent: '#A29BFE',
      success: '#00D4AA',
      warning: '#FDCB6E',
      danger: '#E74C3C',
      cardBorder: 'rgba(155, 89, 182, 0.4)',
    }
  },
  forest: {
    name: 'Forest Green',
    colors: {
      primary: '#2ECC71',
      secondary: '#27AE60',
      accent: '#1ABC9C',
      success: '#2ECC71',
      warning: '#F39C12',
      danger: '#E74C3C',
      cardBorder: 'rgba(46, 204, 113, 0.4)',
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#5352ED',
      secondary: '#70A1FF',
      accent: '#7BED9F',
      success: '#2ED573',
      warning: '#FFA502',
      danger: '#FF4757',
      cardBorder: 'rgba(83, 82, 237, 0.4)',
    }
  },
};

// Background presets - matching web ModernDashboard
export const BACKGROUND_PRESETS = {
  default: {
    name: 'Default',
    dark: '#0a0f1a',
    light: '#f8fafc',
  },
  midnight: {
    name: 'Midnight Blue',
    dark: '#0d1b2a',
    light: '#e8f1f8',
  },
  charcoal: {
    name: 'Charcoal',
    dark: '#1a1a2e',
    light: '#f5f5f5',
  },
  navy: {
    name: 'Deep Navy',
    dark: '#0a192f',
    light: '#e6eef5',
  },
  graphite: {
    name: 'Graphite',
    dark: '#16161a',
    light: '#fffffe',
  },
};

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

// Helper to compute dynamic colors based on theme preset and background
export const getColors = (isDark, themePreset = 'default', bgPreset = 'default') => {
  const bg = BACKGROUND_PRESETS[bgPreset] || BACKGROUND_PRESETS.default;
  const preset = THEME_PRESETS[themePreset] || THEME_PRESETS.default;
  const background = isDark ? bg.dark : bg.light;

  return {
    background,
    cardBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    cardBorder: preset.colors.cardBorder,
    primary: preset.colors.primary,
    secondary: preset.colors.secondary,
    accent: preset.colors.accent,
    success: preset.colors.success,
    warning: preset.colors.warning,
    danger: preset.colors.danger,
    text: isDark ? '#ffffff' : '#1a1a2e',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    textDim: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    modalBg: isDark ? bg.dark : '#ffffff',
    orbOpacity: isDark ? 0.05 : 0.08,
    // Chart-specific text colors that adapt to theme
    chartText: isDark ? '#ffffff' : '#1a1a2e',
    chartTextMuted: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    chartGrid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('dark'); // Default to dark mode
  const [currentTheme, setCurrentTheme] = useState(THEMES.dark);
  const [themePreset, setThemePreset] = useState('default'); // Theme color preset
  const [backgroundPreset, setBackgroundPreset] = useState('default'); // Background preset

  // Load theme preference from storage
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when mode changes
  useEffect(() => {
    updateTheme();
  }, [themeMode, systemColorScheme, themePreset, backgroundPreset]);

  const loadThemePreference = async () => {
    try {
      const [savedTheme, savedPreset, savedBg] = await Promise.all([
        storage.getItem('themeMode'),
        storage.getItem('themePreset'),
        storage.getItem('backgroundPreset'),
      ]);
      if (savedTheme) setThemeMode(savedTheme);
      if (savedPreset) setThemePreset(savedPreset);
      if (savedBg) setBackgroundPreset(savedBg);
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const updateTheme = () => {
    let baseTheme;

    switch (themeMode) {
      case 'light':
        baseTheme = THEMES.light;
        break;
      case 'dark':
        baseTheme = THEMES.dark;
        break;
      case 'auto':
        baseTheme = systemColorScheme === 'dark' ? THEMES.dark : THEMES.light;
        break;
      default:
        baseTheme = THEMES.dark; // Default to dark
    }

    // Merge theme preset colors into base theme
    const preset = THEME_PRESETS[themePreset] || THEME_PRESETS.default;

    // Helper to darken a color for gradient
    const darkenColor = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const darkerR = Math.floor(r * 0.8);
      const darkerG = Math.floor(g * 0.8);
      const darkerB = Math.floor(b * 0.8);
      return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    };

    const selectedTheme = {
      ...baseTheme,
      primary: preset.colors.primary,
      secondary: preset.colors.secondary,
      accent: preset.colors.accent,
      success: preset.colors.success,
      warning: preset.colors.warning,
      error: preset.colors.danger,
      // Update gradients to use preset colors with darker shade
      gradientPrimary: [preset.colors.primary, darkenColor(preset.colors.primary)],
      gradientSecondary: [preset.colors.secondary, darkenColor(preset.colors.secondary)],
    };

    setCurrentTheme(selectedTheme);
  };

  const changeTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await storage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    changeTheme(nextMode);
  };

  const changeThemePreset = async (preset) => {
    try {
      setThemePreset(preset);
      await storage.setItem('themePreset', preset);
    } catch (error) {
      console.error('Failed to save theme preset:', error);
    }
  };

  const changeBackgroundPreset = async (preset) => {
    try {
      setBackgroundPreset(preset);
      await storage.setItem('backgroundPreset', preset);
    } catch (error) {
      console.error('Failed to save background preset:', error);
    }
  };

  // Compute isDark based on themeMode
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');

  // Get the computed colors using current presets
  const colors = getColors(isDark, themePreset, backgroundPreset);

  const value = {
    theme: currentTheme,
    themeMode,
    changeTheme,
    toggleTheme,
    isDark,
    paperTheme: getPaperTheme(currentTheme),
    // New preset-related exports
    themePreset,
    backgroundPreset,
    changeThemePreset,
    changeBackgroundPreset,
    colors, // Computed colors based on presets
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