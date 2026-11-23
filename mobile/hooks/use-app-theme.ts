import { palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colorScheme: isDark ? 'dark' : 'light',
    isDark,
    colors: palette[isDark ? 'dark' : 'light'],
  } as const;
}
