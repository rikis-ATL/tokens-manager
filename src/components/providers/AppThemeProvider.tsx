'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io as connectSocket } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const STYLE_ID = 'app-theme-dynamic-css';
const STORAGE_THEME_ID = 'app-theme-shell-theme-id';
const STORAGE_PREFERS_DARK = 'app-theme-shell-prefers-dark';

type AppThemeContextValue = {
  configured: boolean;
  collectionId: string | null;
  themeId: string;
  setThemeId: (id: string) => void;
  hasDarkPair: boolean;
  themeColorMode: 'light' | 'dark' | null;
  prefersDark: boolean;
  setPrefersDark: (value: boolean) => void;
  refresh: () => Promise<void>;
  /** Re-fetch CSS for a specific theme ID without changing the stored app-shell theme. */
  refreshForTheme: (tid: string) => Promise<void>;
  /** Generate and inject CSS from caller-supplied tokens (playground / unsaved edits) without a DB write. */
  previewTokens: (tokens: Record<string, unknown>, themeId?: string | null) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function useAppTheme(): AppThemeContextValue | null {
  return useContext(AppThemeContext);
}

function readStoredThemeId(): string {
  if (typeof window === 'undefined') return '__default__';
  try {
    const v = localStorage.getItem(STORAGE_THEME_ID);
    return v && v.length > 0 ? v : '__default__';
  } catch {
    return '__default__';
  }
}

function readStoredPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_PREFERS_DARK) === '1';
  } catch {
    return false;
  }
}

function applyDocumentColorMode(params: {
  themeColorMode: 'light' | 'dark' | null;
  hasDarkPair: boolean;
  prefersDark: boolean;
}) {
  const { themeColorMode, hasDarkPair, prefersDark } = params;
  const root = document.documentElement;

  const setDark = (isDark: boolean) => {
    if (isDark) {
      root.setAttribute('data-color-mode', 'dark');
      root.classList.add('dark');
    } else {
      root.removeAttribute('data-color-mode');
      root.classList.remove('dark');
    }
  };

  if (themeColorMode === 'dark') {
    setDark(true);
    return;
  }
  if (themeColorMode === 'light') {
    setDark(false);
    return;
  }
  if (hasDarkPair) {
    setDark(prefersDark);
    return;
  }
  setDark(false);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [themeId, setThemeIdState] = useState('__default__');
  const [hasDarkPair, setHasDarkPair] = useState(false);
  const [themeColorMode, setThemeColorMode] = useState<'light' | 'dark' | null>(null);
  const [prefersDark, setPrefersDarkState] = useState(false);

  const themeIdRef = useRef(themeId);

  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);

  const injectCss = useCallback((css: string) => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, []);

  const runFetch = useCallback(
    async (tid: string) => {
      const qs = tid && tid !== '__default__' ? `?themeId=${encodeURIComponent(tid)}` : '';
      const res = await fetch(`/api/app-theme/css${qs}`, { cache: 'no-store' });
      if (res.status === 503) {
        setConfigured(false);
        injectCss('');
        return;
      }
      if (!res.ok) {
        console.warn('[AppTheme] Failed to load CSS', res.status);
        return;
      }
      const data = (await res.json()) as {
        css?: string;
        hasDarkPair?: boolean;
        themeColorMode?: 'light' | 'dark' | null;
        collectionId?: string;
      };
      setConfigured(true);
      setCollectionId(data.collectionId ?? null);
      setHasDarkPair(Boolean(data.hasDarkPair));
      setThemeColorMode(data.themeColorMode ?? null);
      if (data.css) {
        injectCss(data.css);
      }
    },
    [injectCss]
  );

  const refresh = useCallback(async () => {
    await runFetch(themeIdRef.current);
  }, [runFetch]);

  const refreshForTheme = useCallback(async (tid: string) => {
    await runFetch(tid && tid !== '__default__' ? tid : '__default__');
  }, [runFetch]);

  const previewTokens = useCallback(async (tokens: Record<string, unknown>, themeId?: string | null) => {
    try {
      const res = await fetch('/api/app-theme/css', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens, themeId: themeId ?? null }),
        cache: 'no-store',
      });
      if (!res.ok) {
        console.warn('[AppTheme] Preview CSS failed', res.status);
        return;
      }
      const data = (await res.json()) as { css?: string; hasDarkPair?: boolean; themeColorMode?: 'light' | 'dark' | null };
      setHasDarkPair(Boolean(data.hasDarkPair));
      setThemeColorMode(data.themeColorMode ?? null);
      if (data.css != null) injectCss(data.css);
    } catch (err) {
      console.warn('[AppTheme] Preview CSS error', err);
    }
  }, [injectCss]);

  // Re-fetch CSS whenever the server broadcasts a token update for this collection
  useEffect(() => {
    if (!collectionId) return;

    const socket: Socket = connectSocket({ path: '/api/socketio', transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('subscribe', collectionId);
    });

    socket.on('token-update', (payload: { collectionId: string; themeId?: string | null }) => {
      if (payload.collectionId !== collectionId) return;
      // Refresh only if the broadcast theme matches what the shell is currently showing,
      // or if a default-collection save came in (themeId is null/undefined).
      const updatedTheme = payload.themeId ?? '__default__';
      if (updatedTheme === themeIdRef.current || updatedTheme === '__default__') {
        void refresh();
      }
    });

    return () => {
      if (socket.connected) {
        socket.emit('unsubscribe', collectionId);
      }
      socket.disconnect();
    };
  }, [collectionId, refresh]);

  useEffect(() => {
    setThemeIdState(readStoredThemeId());
    setPrefersDarkState(readStoredPrefersDark());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    (async () => {
      const cfgRes = await fetch('/api/app-theme/config', { cache: 'no-store' });
      if (!cfgRes.ok || cancelled) return;
      const cfg = (await cfgRes.json()) as { configured?: boolean };
      if (!cfg.configured) {
        setConfigured(false);
        return;
      }

      const tid = readStoredThemeId();
      setThemeIdState(tid);
      await runFetch(tid);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, runFetch]);

  useEffect(() => {
    if (!ready) return;
    applyDocumentColorMode({ themeColorMode, hasDarkPair, prefersDark });
  }, [ready, themeColorMode, hasDarkPair, prefersDark]);

  const setThemeId = useCallback(
    (id: string) => {
      const next = id || '__default__';
      setThemeIdState(next);
      try {
        localStorage.setItem(STORAGE_THEME_ID, next);
      } catch {
        /* ignore */
      }
      void runFetch(next);
    },
    [runFetch]
  );

  const setPrefersDark = useCallback((value: boolean) => {
    setPrefersDarkState(value);
    try {
      localStorage.setItem(STORAGE_PREFERS_DARK, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      configured,
      collectionId,
      themeId,
      setThemeId,
      hasDarkPair,
      themeColorMode,
      prefersDark,
      setPrefersDark,
      refresh,
      refreshForTheme,
      previewTokens,
    }),
    [
      configured,
      collectionId,
      themeId,
      setThemeId,
      hasDarkPair,
      themeColorMode,
      prefersDark,
      setPrefersDark,
      refresh,
      refreshForTheme,
      previewTokens,
    ]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}
