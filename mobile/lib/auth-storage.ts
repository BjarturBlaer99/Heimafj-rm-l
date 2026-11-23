import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createAuthStorage } from '@/lib/chunked-auth-storage';

const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const nativeStorage = createAuthStorage({
  getItem: (key) => SecureStore.getItemAsync(key, options),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, options),
  removeItem: (key) => SecureStore.deleteItemAsync(key, options),
}, AsyncStorage, randomUUID);
const server = Platform.OS === 'web' && typeof window === 'undefined';
export const authStorage = Platform.OS !== 'web' ? nativeStorage : {
  getItem: (key: string) => server ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => server ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => server ? Promise.resolve() : AsyncStorage.removeItem(key),
};
