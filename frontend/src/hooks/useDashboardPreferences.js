import { useState, useEffect, useCallback, useRef } from 'react';
import storage from '../utils/storage';
import { preferencesService } from '../services/apiService';

/**
 * Theme presets configuration
 */
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

/**
 * Background presets configuration
 */
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

/**
 * Default widget visibility configuration
 */
const DEFAULT_WIDGET_VISIBILITY = {
  financialSummary: true,
  topGroupings: true,
  categoriesByGroup: true,
  income: true,
  spending: true,
  expenseGroups: true,
  budgetSummary: true,
  quickActions: true,
};

/**
 * Get theme-aware color palette
 */
export const getColors = (isDark, bgPreset = 'default', themePreset = 'default') => {
  const bg = BACKGROUND_PRESETS[bgPreset] || BACKGROUND_PRESETS.default;
  const theme = THEME_PRESETS[themePreset] || THEME_PRESETS.default;
  const background = isDark ? bg.dark : bg.light;

  return {
    background,
    cardBg: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    cardBorder: theme.colors.cardBorder || (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    accent: theme.colors.accent,
    purple: '#667eea',
    text: isDark ? '#ffffff' : '#1a1a2e',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    textDim: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    inputBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    inputBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    modalBg: isDark ? bg.dark : '#ffffff',
    orbOpacity: isDark ? 0.05 : 0.08,
  };
};

/**
 * Custom hook for managing dashboard preferences
 * Handles theme preset, background preset, and widget visibility
 * Syncs with backend preferences API
 * 
 * @param {string} userId - The user ID for syncing preferences
 * @param {boolean} isDark - Whether dark mode is enabled (from ThemeContext)
 * @returns {Object} Preferences state and utilities
 */
export const useDashboardPreferences = (userId, isDark) => {
  // Preferences state
  const [selectedThemePreset, setSelectedThemePreset] = useState('default');
  const [selectedBackground, setSelectedBackground] = useState('default');
  const [widgetVisibility, setWidgetVisibility] = useState(DEFAULT_WIDGET_VISIBILITY);
  const [titheTrackingEnabled, setTitheTrackingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Debounce timer ref for saving
  const saveTimeoutRef = useRef(null);

  /**
   * Load preferences from backend or AsyncStorage fallback
   */
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);

      // Try to load from backend first
      if (userId) {
        try {
          const prefs = await preferencesService.getPreferences(userId);
          if (prefs) {
            if (prefs.ThemePreset) setSelectedThemePreset(prefs.ThemePreset);
            if (prefs.BackgroundPreset) setSelectedBackground(prefs.BackgroundPreset);
            if (prefs.WidgetVisibility) setWidgetVisibility(prefs.WidgetVisibility);
            setTitheTrackingEnabled(!!prefs.TitheTrackingEnabled);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.log('Backend preferences not available, using local storage');
        }
      }

      // Fallback to storage
      const [savedTheme, savedBg, savedVisibility] = await Promise.all([
        storage.getItem('selectedThemePreset'),
        storage.getItem('selectedBackground'),
        storage.getItem('widgetVisibility'),
      ]);

      if (savedTheme) setSelectedThemePreset(savedTheme);
      if (savedBg) setSelectedBackground(savedBg);
      if (savedVisibility) setWidgetVisibility(JSON.parse(savedVisibility));
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Save preferences to backend and AsyncStorage
   */
  const savePreferences = useCallback(async (themePreset, bgPreset, visibility) => {
    try {
      setSaving(true);

      // Save to storage immediately
      await Promise.all([
        storage.setItem('selectedThemePreset', themePreset),
        storage.setItem('selectedBackground', bgPreset),
        storage.setItem('widgetVisibility', JSON.stringify(visibility)),
      ]);

      // Sync to backend if userId available
      if (userId) {
        try {
          await preferencesService.updatePreferences(userId, {
            ThemePreset: themePreset,
            BackgroundPreset: bgPreset,
            WidgetVisibility: visibility,
          });
        } catch (err) {
          console.error('Failed to sync preferences to backend:', err);
          // Don't throw - local storage is saved
        }
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  }, [userId]);

  /**
   * Debounced save - saves 500ms after last change
   */
  const debouncedSave = useCallback((themePreset, bgPreset, visibility) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePreferences(themePreset, bgPreset, visibility);
    }, 500);
  }, [savePreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Save preferences when they change (debounced)
  useEffect(() => {
    if (!loading) {
      debouncedSave(selectedThemePreset, selectedBackground, widgetVisibility);
    }
  }, [selectedThemePreset, selectedBackground, widgetVisibility, loading, debouncedSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Get applied theme colors based on current preset
   */
  const appliedThemeColors = selectedThemePreset && selectedThemePreset !== 'default'
    ? THEME_PRESETS[selectedThemePreset]?.colors
    : null;

  /**
   * Get fully computed colors object
   */
  const colors = getColors(isDark, selectedBackground, selectedThemePreset);

  /**
   * Update a specific widget visibility
   */
  const setWidgetVisible = useCallback((widgetKey, visible) => {
    setWidgetVisibility((prev) => ({
      ...prev,
      [widgetKey]: visible,
    }));
  }, []);

  /**
   * Reset all preferences to defaults
   */
  const resetToDefaults = useCallback(() => {
    setSelectedThemePreset('default');
    setSelectedBackground('default');
    setWidgetVisibility(DEFAULT_WIDGET_VISIBILITY);
  }, []);

  return {
    // State
    selectedThemePreset,
    selectedBackground,
    widgetVisibility,
    titheTrackingEnabled,
    loading,
    saving,

    // Computed
    colors,
    appliedThemeColors,

    // Setters
    setSelectedThemePreset,
    setSelectedBackground,
    setWidgetVisibility,
    setWidgetVisible,

    // Actions
    loadPreferences,
    savePreferences,
    resetToDefaults,

    // Constants (for rendering options)
    themePresets: THEME_PRESETS,
    backgroundPresets: BACKGROUND_PRESETS,
  };
};

export default useDashboardPreferences;
