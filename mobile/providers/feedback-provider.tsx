import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';

const FeedbackContext = createContext<(message: string) => void>(() => {});
export function FeedbackProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const notify = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    timer.current = setTimeout(() => setMessage(''), 6000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <FeedbackContext.Provider value={notify}>
    {children}
    {message ? <View pointerEvents="box-none" style={[styles.position, { top: insets.top + 8 }]}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: colors.positiveSoft, borderColor: colors.positive }]}>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Loka staðfestingu" onPress={() => setMessage('')} style={styles.close}><Text style={{ color: colors.text, fontSize: 24 }}>×</Text></Pressable>
      </View>
    </View> : null}
  </FeedbackContext.Provider>;
}
export const useFeedback = () => useContext(FeedbackContext);
const styles = StyleSheet.create({ position: { position: 'absolute', zIndex: 1000, left: 14, right: 14, alignItems: 'center' }, notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingLeft: 16, paddingVertical: 6, maxWidth: 600, width: '100%' }, message: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } });
