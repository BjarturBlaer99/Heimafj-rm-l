import { Stack } from 'expo-router';

export const unstable_settings = {
  anchor: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ animation: 'fade_from_bottom', headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
