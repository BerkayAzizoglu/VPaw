import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { createClient, SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.',
  );
}

const memoryStorage = new Map<string, string>();
const fallbackDir = `${FileSystem.documentDirectory ?? ''}supabase-auth`;
const fallbackFile = `${fallbackDir}/storage.json`;
let fileCache: Record<string, string> | null = null;

async function ensureFileCacheLoaded(): Promise<Record<string, string>> {
  if (fileCache) return fileCache;

  try {
    const fileInfo = await FileSystem.getInfoAsync(fallbackFile);
    if (fileInfo.exists) {
      const raw = await FileSystem.readAsStringAsync(fallbackFile);
      const parsed = raw ? (JSON.parse(raw) as unknown) : {};
      if (parsed && typeof parsed === 'object') {
        fileCache = parsed as Record<string, string>;
        return fileCache;
      }
    }
  } catch {
    // Keep going with empty cache.
  }

  fileCache = {};
  return fileCache;
}

async function persistFileCache(next: Record<string, string>) {
  try {
    const dirInfo = await FileSystem.getInfoAsync(fallbackDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(fallbackDir, { intermediates: true });
    }
    await FileSystem.writeAsStringAsync(fallbackFile, JSON.stringify(next));
  } catch {
    // If filesystem write fails, in-memory cache still prevents crashes.
  }
}

const safeStorage: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        return await AsyncStorage.getItem(key);
      }
    } catch {
      // Fallback for Expo Go/native bridge edge cases.
    }

    const cache = await ensureFileCacheLoaded();
    return cache[key] ?? memoryStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback for Expo Go/native bridge edge cases.
    }

    const cache = await ensureFileCacheLoaded();
    cache[key] = value;
    memoryStorage.set(key, value);
    await persistFileCache(cache);
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback for Expo Go/native bridge edge cases.
    }

    const cache = await ensureFileCacheLoaded();
    delete cache[key];
    memoryStorage.delete(key);
    await persistFileCache(cache);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
