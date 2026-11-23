// Opt-in development-only isolation. Normal previews and every production
// bundle still use the existing Router entry, including its initialization.
if (__DEV__ && process.env.EXPO_PUBLIC_STARTUP_DIAGNOSTIC === '1') {
  require('./diagnostics/startup-entry');
} else {
  require('expo-router/entry');
}
