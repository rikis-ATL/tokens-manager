// src/lib/playground/session-storage.ts

/**
 * Session-based storage for playground collections.
 * Edits are stored in browser sessionStorage and merged with MongoDB base data on load.
 * Changes are lost when the browser is closed.
 */

export interface PlaygroundSession {
  collectionId: string;
  tokens: Record<string, unknown>;
  graphState: Record<string, unknown> | null;
  lastModified: number;
}

const STORAGE_KEY_PREFIX = 'playground-session-';

/**
 * Get the sessionStorage key for a collection.
 */
function getStorageKey(collectionId: string): string {
  return `${STORAGE_KEY_PREFIX}${collectionId}`;
}

/**
 * Check if sessionStorage is available.
 * Returns false in SSR or browsers with storage disabled.
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load playground session data from sessionStorage.
 * Returns null if no session exists or storage is unavailable.
 */
export function loadPlaygroundSession(collectionId: string): PlaygroundSession | null {
  if (!isStorageAvailable()) return null;

  try {
    const key = getStorageKey(collectionId);
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw) as PlaygroundSession;
    return data;
  } catch (err) {
    console.warn('[loadPlaygroundSession] Failed to parse session data:', err);
    return null;
  }
}

/**
 * Save playground session data to sessionStorage.
 * Returns true on success, false on failure (e.g., quota exceeded).
 */
export function savePlaygroundSession(session: PlaygroundSession): boolean {
  if (!isStorageAvailable()) return false;

  try {
    const key = getStorageKey(session.collectionId);
    const raw = JSON.stringify(session);
    
    // Check size (sessionStorage limit is typically 5-10MB)
    const sizeInMB = new Blob([raw]).size / (1024 * 1024);
    if (sizeInMB > 5) {
      console.warn('[savePlaygroundSession] Session data too large:', sizeInMB.toFixed(2), 'MB');
      return false;
    }

    window.sessionStorage.setItem(key, raw);
    return true;
  } catch (err) {
    console.error('[savePlaygroundSession] Failed to save session:', err);
    return false;
  }
}

/**
 * Clear playground session data for a collection.
 */
export function clearPlaygroundSession(collectionId: string): void {
  if (!isStorageAvailable()) return;

  try {
    const key = getStorageKey(collectionId);
    window.sessionStorage.removeItem(key);
  } catch (err) {
    console.warn('[clearPlaygroundSession] Failed to clear session:', err);
  }
}

/**
 * Merge session edits over base collection data.
 * Session data takes precedence over base data.
 */
export function mergePlaygroundData<T extends { tokens: Record<string, unknown>; graphState: Record<string, unknown> | null }>(
  base: T,
  session: PlaygroundSession | null
): T {
  if (!session) return base;

  return {
    ...base,
    tokens: session.tokens,
    graphState: session.graphState,
  };
}

/**
 * Check if a collection has an active playground session.
 */
export function hasPlaygroundSession(collectionId: string): boolean {
  return loadPlaygroundSession(collectionId) !== null;
}
