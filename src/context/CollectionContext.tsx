'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'atui-selected-collection-id';

export interface Collection {
  _id: string;
  name: string;
}

interface CollectionContextValue {
  collections: Collection[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  loading: boolean;
  loadError: boolean;
  refreshCollections: () => Promise<Collection[]>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedIdState] = useState<string>('local');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const refreshCollections = useCallback(async (): Promise<Collection[]> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      setLoadError(false);
      const res = await fetch('/api/collections', { signal: controller.signal });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const fetched: Collection[] = data.collections || [];
      setCollections(fetched);
      return fetched;
    } catch {
      setCollections([]);
      setLoadError(true);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) ?? 'local';
    (async () => {
      const fetched = await refreshCollections();
      const valid = stored === 'local' || fetched.some((c) => c._id === stored);
      setSelectedIdState(valid ? stored : 'local');
      setLoading(false);
    })();
  }, [refreshCollections]);

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <CollectionContext.Provider value={{ collections, selectedId, setSelectedId, loading, loadError, refreshCollections }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider');
  return ctx;
}
