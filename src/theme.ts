import { Platform } from 'react-native';

const serif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});
const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const theme = {
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    accent: '#4F46E5',
    accentSoft: '#EEF2FF',
    border: '#E5E7EB',
    track: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    error: '#DC2626',
  },
  fonts: { serif, mono },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { card: 16, pill: 999, fab: 28, sheet: 24, bar: 3 },
  text: {
    caps: {
      fontFamily: mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    time: { fontFamily: serif, fontSize: 28 },
    title: { fontFamily: serif, fontSize: 22 },
    body: { fontSize: 15 },
  },
  layout: {
    fabSize: 56,
    fabOffset: 20,
    listBottomPadding: 112,
    durationBarHeight: 6,
    DURATION_BAR_MAX_MINUTES: 720,
  },
} as const;
