import 'react-native-url-polyfill/auto';

import { createClient, processLock } from '@supabase/supabase-js';
import { authStorage } from '@/lib/auth-storage';
import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // Supabase's PKCE implementation consumes these two WebCrypto methods.
  // Expo's native primitives avoid its Math.random / plain-challenge fallbacks.
  const nativeCrypto = globalThis.crypto ?? {};
  if (typeof nativeCrypto.getRandomValues !== 'function') {
    Object.defineProperty(nativeCrypto, 'getRandomValues', { value: ExpoCrypto.getRandomValues });
  }
  const nativeSubtle = nativeCrypto.subtle ?? {};
  if (typeof nativeSubtle.digest !== 'function') {
    Object.defineProperty(nativeSubtle, 'digest', {
      value: (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
        if (name.toUpperCase() !== 'SHA-256') return Promise.reject(new Error('Unsupported digest algorithm'));
        return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
      },
    });
  }
  if (!nativeCrypto.subtle) Object.defineProperty(nativeCrypto, 'subtle', { value: nativeSubtle });
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: nativeCrypto });
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const productionProjectRef = 'gtgqxgddlqcvspegvxzt';

export const supabaseEnvironmentError =
  !supabaseUrl || !supabaseKey
    ? 'Supabase umhverfisbreytur vantar í mobile/.env.local.'
    : __DEV__ && supabaseUrl.includes(productionProjectRef)
      ? 'Þróunarútgáfan má ekki tengjast production gagnagrunninum.'
      : null;

export const hasSupabaseEnvironment = !supabaseEnvironmentError;

export const supabase = createClient(
  hasSupabaseEnvironment ? supabaseUrl! : 'https://missing-config.supabase.co',
  hasSupabaseEnvironment ? supabaseKey! : 'missing-publishable-key',
  {
    auth: {
      storage: authStorage,
      ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
