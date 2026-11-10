// Storage for IK TECH AI.
// On the web, the browser's normal storage (localStorage) holds only about 5 MB, which fills up quickly
// with pictures. So on the web this uses IndexedDB (hundreds of MB). On the phone it uses AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DB_NAME = 'ik-tech-ai-storage';
const STORE_NAME = 'kv';

let dbPromise: Promise<any> | null = null;

function openDatabase(): Promise<any> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const factory = (globalThis as any).indexedDB;
        if (!factory) {
          resolve(null);
          return;
        }
        const request = factory.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch (_error) {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function request<T>(db: any, mode: 'readonly' | 'readwrite', action: (store: any) => any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(STORE_NAME, mode);
      const result = action(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(result?.result as T);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
}

const useWebDatabase = Platform.OS === 'web';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (!useWebDatabase) return AsyncStorage.getItem(key);
    const db = await openDatabase();
    if (!db) return AsyncStorage.getItem(key);
    try {
      const value = await request<string | undefined>(db, 'readonly', (store) => store.get(key));
      if (typeof value === 'string') return value;
    } catch (_error) {
      /* fall through to the old storage */
    }
    // Older data saved before this change: move it into the new storage.
    const old = await AsyncStorage.getItem(key).catch(() => null);
    if (old !== null && old !== undefined) {
      try {
        await request(db, 'readwrite', (store) => store.put(old, key));
        AsyncStorage.removeItem(key).catch(() => {});
      } catch (_error) {
        /* keep the old copy */
      }
    }
    return old ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!useWebDatabase) return AsyncStorage.setItem(key, value);
    const db = await openDatabase();
    if (!db) return AsyncStorage.setItem(key, value);
    await request(db, 'readwrite', (store) => store.put(value, key));
    // Free the small old browser storage, which may be nearly full.
    AsyncStorage.removeItem(key).catch(() => {});
  },

  async removeItem(key: string): Promise<void> {
    if (!useWebDatabase) return AsyncStorage.removeItem(key);
    const db = await openDatabase();
    if (db) {
      try {
        await request(db, 'readwrite', (store) => store.delete(key));
      } catch (_error) {
        /* ignore */
      }
    }
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};

export default storage;
