import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const fallbackDir = `${FileSystem.documentDirectory ?? ''}vpaw-local`;
const fallbackFile = `${fallbackDir}/storage.json`;
let fileCache: Record<string, string> | null = null;

async function ensureCache(): Promise<Record<string, string>> {
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
    // no-op
  }
  fileCache = {};
  return fileCache;
}

async function writeCache(next: Record<string, string>) {
  try {
    const dirInfo = await FileSystem.getInfoAsync(fallbackDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(fallbackDir, { intermediates: true });
    }
    await FileSystem.writeAsStringAsync(fallbackFile, JSON.stringify(next));
  } catch {
    // no-op
  }
}

export async function getLocalItem(key: string): Promise<string | null> {
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const value = await AsyncStorage.getItem(key);
      if (value != null) return value;
    }
  } catch {
    // fallback below
  }

  const cache = await ensureCache();
  return cache[key] ?? null;
}

export async function setLocalItem(key: string, value: string): Promise<void> {
  let wroteAsyncStorage = false;
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
      wroteAsyncStorage = true;
    }
  } catch {
    wroteAsyncStorage = false;
  }

  const cache = await ensureCache();
  cache[key] = value;
  await writeCache(cache);

  if (!wroteAsyncStorage) {
    // kept on file fallback; nothing else required
  }
}

export async function removeLocalItem(key: string): Promise<void> {
  try {
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      await AsyncStorage.removeItem(key);
    }
  } catch {
    // fallback below
  }

  const cache = await ensureCache();
  delete cache[key];
  await writeCache(cache);
}
