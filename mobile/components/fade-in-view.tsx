import { PropsWithChildren, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleProp, ViewStyle } from 'react-native';

type FadeInViewProps = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeInView({ children, delay = 0, style }: FadeInViewProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(10));

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const reveal = () => { opacity.setValue(1); translateY.setValue(0); };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (enabled) { animation?.stop(); reveal(); }
    });

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        reveal();
        return;
      }

      animation = Animated.parallel([
        Animated.timing(opacity, {
          delay,
          duration: 360,
          toValue: 1,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          delay,
          duration: 360,
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
      animation.start();
    }).catch(() => { if (active) reveal(); });

    return () => {
      active = false;
      animation?.stop();
      subscription.remove();
    };
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
