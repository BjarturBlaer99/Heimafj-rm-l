import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/hooks/use-app-theme';

function TabIcon({ color, name }: { color: ColorValue; name: IconSymbolName }) {
  return <IconSymbol color={color} name={name} size={23} weight="semibold" />;
}

export default function TabLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 7,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Yfirlit',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="house.fill" />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Færslur',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="list.bullet.rectangle.fill" />,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Reikningar',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="doc.text.fill" />,
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: 'Sparnaður',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="banknote.fill" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Meira',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="person.crop.circle.fill" />,
        }}
      />
    </Tabs>
  );
}
