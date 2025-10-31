/**
 * Local/session storage helpers with type safety
 */

/**
 * Get item from storage
 * @param key - Storage key
 * @param storage - Storage type (localStorage or sessionStorage)
 * @returns Parsed value or null
 */
export function getStorageItem<T = unknown>(
  key: string,
  storage: Storage = localStorage
): T | null {
  try {
    const item = storage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error getting storage item "${key}":`, error);
    return null;
  }
}

/**
 * Set item in storage
 * @param key - Storage key
 * @param value - Value to store
 * @param storage - Storage type (localStorage or sessionStorage)
 */
export function setStorageItem<T = unknown>(
  key: string,
  value: T,
  storage: Storage = localStorage
): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting storage item "${key}":`, error);
  }
}

/**
 * Remove item from storage
 * @param key - Storage key
 * @param storage - Storage type (localStorage or sessionStorage)
 */
export function removeStorageItem(key: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error(`Error removing storage item "${key}":`, error);
  }
}

/**
 * Clear all items from storage
 * @param storage - Storage type (localStorage or sessionStorage)
 */
export function clearStorage(storage: Storage = localStorage): void {
  try {
    storage.clear();
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

/**
 * Check if storage is available
 * @param type - Storage type ('localStorage' or 'sessionStorage')
 * @returns True if storage is available
 */
export function isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get item from storage with expiry
 * @param key - Storage key
 * @param storage - Storage type (localStorage or sessionStorage)
 * @returns Parsed value or null if expired or not found
 */
export function getStorageItemWithExpiry<T = unknown>(
  key: string,
  storage: Storage = localStorage
): T | null {
  try {
    const item = storage.getItem(key);
    if (item === null) {
      return null;
    }

    const parsed = JSON.parse(item);
    const now = new Date().getTime();

    if (parsed.expiry && now > parsed.expiry) {
      storage.removeItem(key);
      return null;
    }

    return parsed.value as T;
  } catch (error) {
    console.error(`Error getting storage item with expiry "${key}":`, error);
    return null;
  }
}

/**
 * Set item in storage with expiry
 * @param key - Storage key
 * @param value - Value to store
 * @param ttlMinutes - Time to live in minutes
 * @param storage - Storage type (localStorage or sessionStorage)
 */
export function setStorageItemWithExpiry<T = unknown>(
  key: string,
  value: T,
  ttlMinutes: number,
  storage: Storage = localStorage
): void {
  try {
    const now = new Date().getTime();
    const expiry = now + ttlMinutes * 60 * 1000;

    const item = {
      value,
      expiry,
    };

    storage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`Error setting storage item with expiry "${key}":`, error);
  }
}

/**
 * Get all keys from storage
 * @param storage - Storage type (localStorage or sessionStorage)
 * @returns Array of storage keys
 */
export function getStorageKeys(storage: Storage = localStorage): string[] {
  try {
    return Object.keys(storage);
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
}

/**
 * Get storage size in bytes
 * @param storage - Storage type (localStorage or sessionStorage)
 * @returns Size in bytes
 */
export function getStorageSize(storage: Storage = localStorage): number {
  try {
    let size = 0;
    for (const key in storage) {
      if (storage.hasOwnProperty(key)) {
        size += key.length + (storage.getItem(key)?.length || 0);
      }
    }
    return size;
  } catch (error) {
    console.error('Error getting storage size:', error);
    return 0;
  }
}
