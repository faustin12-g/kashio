import { useColorScheme } from 'react-native';

export interface Theme {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  expense: string;
  income: string;
  danger: string;
  warning: string;
}

const light: Theme = {
  scheme: 'light',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F6',
  border: '#E2E4EC',
  text: '#12131A',
  textMuted: '#6B7080',
  primary: '#4F46E5',
  primaryText: '#FFFFFF',
  expense: '#DC2626',
  income: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
};

const dark: Theme = {
  scheme: 'dark',
  background: '#0B0C10',
  surface: '#16171F',
  surfaceAlt: '#1E1F29',
  border: '#2A2B36',
  text: '#F4F5F9',
  textMuted: '#9297A8',
  primary: '#818CF8',
  primaryText: '#0B0C10',
  expense: '#F87171',
  income: '#4ADE80',
  danger: '#F87171',
  warning: '#FBBF24',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
