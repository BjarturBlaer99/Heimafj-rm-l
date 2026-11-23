import { Platform } from 'react-native';

export const palette = {
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F5',
    text: '#111318',
    textSecondary: '#606878',
    border: '#DEE2E8',
    primary: '#2F4FE4',
    primarySoft: '#E9EDFF',
    positive: '#087A55',
    positiveSoft: '#E7F7F0',
    negative: '#C53D4D',
    negativeSoft: '#FCEAEC',
    warning: '#9B6500',
    shadow: '#111318',
  },
  dark: {
    background: '#090B10',
    surface: '#14171E',
    surfaceMuted: '#1E232D',
    text: '#F4F6FA',
    textSecondary: '#A5ADBC',
    border: '#2A303B',
    primary: '#8096FF',
    primarySoft: '#202947',
    positive: '#46C995',
    positiveSoft: '#11372C',
    negative: '#FF7C88',
    negativeSoft: '#452329',
    warning: '#F1C453',
    shadow: '#000000',
  },
} as const;

export const Colors = {
  light: {
    text: palette.light.text,
    background: palette.light.background,
    tint: palette.light.primary,
    icon: palette.light.textSecondary,
    tabIconDefault: palette.light.textSecondary,
    tabIconSelected: palette.light.primary,
  },
  dark: {
    text: palette.dark.text,
    background: palette.dark.background,
    tint: palette.dark.primary,
    icon: palette.dark.textSecondary,
    tabIconDefault: palette.dark.textSecondary,
    tabIconSelected: palette.dark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
