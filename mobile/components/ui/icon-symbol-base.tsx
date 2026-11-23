// Font-backed icons avoid mounting an Expo native SymbolView on iOS.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue, StyleProp, TextStyle } from 'react-native';

type IconMapping = Partial<
  Record<Extract<SymbolViewProps['name'], string>, ComponentProps<typeof MaterialIcons>['name']>
>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'list.bullet.rectangle.fill': 'receipt-long',
  'doc.text.fill': 'receipt',
  'banknote.fill': 'savings',
  'person.crop.circle.fill': 'account-circle',
  'chart.bar.fill': 'bar-chart',
  'chart.pie.fill': 'pie-chart',
  'wallet.bifold.fill': 'account-balance-wallet',
  'calendar': 'calendar-month',
  'arrow.up.right': 'north-east',
  'arrow.down.right': 'south-east',
  'arrow.right.square.fill': 'logout',
  'exclamationmark.triangle.fill': 'warning',
  'checkmark.circle.fill': 'check-circle',
  'arrow.clockwise': 'refresh',
  'plus': 'add',
  'chevron.right': 'chevron-right',
} satisfies IconMapping;

/**
 * Material Icons are shared across iOS, Android and web.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons size={size} name={MAPPING[name]} style={[{ color }, style]} />;
}
