import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore has no web support: fall back to localStorage so the app can be checked in a browser.
export const store = {
  get: async (k: string) => (Platform.OS === 'web' ? localStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: async (k: string, v: string) =>
    Platform.OS === 'web' ? localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v),
  del: async (k: string) => (Platform.OS === 'web' ? localStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};
