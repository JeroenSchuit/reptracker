import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Premium color palette - modern, minimal, clean
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366F1', // Indigo - premium feel
    primaryContainer: '#E0E7FF',
    secondary: '#8B5CF6', // Violet
    secondaryContainer: '#EDE9FE',
    tertiary: '#EC4899', // Pink accent
    tertiaryContainer: '#FCE7F3',
    surface: '#FFFFFF',
    surfaceVariant: '#F8FAFC',
    surfaceDisabled: 'rgba(15, 23, 42, 0.08)',
    background: '#F8FAFC', // Slight off-white for depth
    error: '#EF4444',
    errorContainer: '#FEE2E2',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#312E81',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#4C1D95',
    onTertiary: '#FFFFFF',
    onTertiaryContainer: '#831843',
    onSurface: '#0F172A', // Slate 900
    onSurfaceVariant: '#64748B', // Slate 500
    onSurfaceDisabled: 'rgba(15, 23, 42, 0.38)',
    onError: '#FFFFFF',
    onErrorContainer: '#7F1D1D',
    onBackground: '#0F172A',
    outline: '#CBD5E1', // Slate 300
    outlineVariant: '#E2E8F0', // Slate 200
    inverseSurface: '#1E293B', // Slate 800
    inverseOnSurface: '#F8FAFC',
    inversePrimary: '#A5B4FC',
    shadow: 'rgba(15, 23, 42, 0.08)',
    scrim: 'rgba(15, 23, 42, 0.5)',
    backdrop: 'rgba(15, 23, 42, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8', // Lighter indigo for dark mode
    primaryContainer: '#3730A3',
    secondary: '#A78BFA', // Lighter violet
    secondaryContainer: '#5B21B6',
    tertiary: '#F472B6', // Lighter pink
    tertiaryContainer: '#9D174D',
    surface: '#1E293B', // Slate 800
    surfaceVariant: '#334155', // Slate 700
    surfaceDisabled: 'rgba(248, 250, 252, 0.08)',
    background: '#0F172A', // Slate 900
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onPrimary: '#1E1B4B',
    onPrimaryContainer: '#E0E7FF',
    onSecondary: '#2E1065',
    onSecondaryContainer: '#EDE9FE',
    onTertiary: '#500724',
    onTertiaryContainer: '#FCE7F3',
    onSurface: '#F8FAFC',
    onSurfaceVariant: '#94A3B8', // Slate 400
    onSurfaceDisabled: 'rgba(248, 250, 252, 0.38)',
    onError: '#450A0A',
    onErrorContainer: '#FEE2E2',
    onBackground: '#F8FAFC',
    outline: '#475569', // Slate 600
    outlineVariant: '#334155', // Slate 700
    inverseSurface: '#F8FAFC',
    inverseOnSurface: '#1E293B',
    inversePrimary: '#4F46E5',
    shadow: 'rgba(0, 0, 0, 0.3)',
    scrim: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    elevation: {
      level0: 'transparent',
      level1: '#1E293B',
      level2: '#263244',
      level3: '#2D3B4E',
      level4: '#334457',
      level5: '#3A4D61',
    },
  },
};

// Heatmap color palettes - GitHub-inspired but with theme colors
export const heatmapColors = {
  light: {
    empty: '#F1F5F9', // Slate 100
    level1: '#C7D2FE', // Indigo 200
    level2: '#A5B4FC', // Indigo 300
    level3: '#818CF8', // Indigo 400
    level4: '#6366F1', // Indigo 500
  },
  dark: {
    empty: '#1E293B', // Slate 800
    level1: '#312E81', // Indigo 900
    level2: '#3730A3', // Indigo 800
    level3: '#4F46E5', // Indigo 600
    level4: '#818CF8', // Indigo 400
  },
};

export function getHeatmapColor(intensity: number, isDark: boolean): string {
  const palette = isDark ? heatmapColors.dark : heatmapColors.light;

  switch (intensity) {
    case 0:
      return palette.empty;
    case 1:
      return palette.level1;
    case 2:
      return palette.level2;
    case 3:
      return palette.level3;
    case 4:
      return palette.level4;
    default:
      return palette.empty;
  }
}

// Badge tier colors
export const badgeTierColors = {
  bronze: {
    light: '#B87333',
    dark: '#CD7F32',
  },
  silver: {
    light: '#9CA3AF',
    dark: '#D1D5DB',
  },
  gold: {
    light: '#D97706',
    dark: '#FCD34D',
  },
  platinum: {
    light: '#7C3AED',
    dark: '#A78BFA',
  },
};

// Progress ring colors
export const progressColors = {
  light: {
    track: '#E2E8F0',
    incomplete: '#6366F1',
    complete: '#10B981', // Emerald for success
  },
  dark: {
    track: '#334155',
    incomplete: '#818CF8',
    complete: '#34D399',
  },
};

// Spacing constants for consistent UI
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Border radius for premium card feel
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};
