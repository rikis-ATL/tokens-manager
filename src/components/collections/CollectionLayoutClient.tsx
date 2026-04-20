'use client';

import { useEffect, useMemo, useState } from 'react';
import { CollectionSidebar } from '@/components/collections/CollectionSidebar';
import { OrgHeader } from '@/components/layout/OrgHeader';
import { useCollection } from '@/context/CollectionContext';

interface CollectionLayoutClientProps {
  id: string;
  children: React.ReactNode;
}

type CollectionDetailMeta = { name: string; isPlayground: boolean };

export function CollectionLayoutClient({ id, children }: CollectionLayoutClientProps) {
  const { collections } = useCollection();
  const listMatch = useMemo(
    () => collections.find((c) => c._id === id),
    [collections, id]
  );
  const [fetchedMeta, setFetchedMeta] = useState<CollectionDetailMeta | null>(null);

  useEffect(() => {
    setFetchedMeta(null);
    const ac = new AbortController();
    fetch(`/api/collections/${id}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { collection?: { name?: string; isPlayground?: boolean }; name?: string; isPlayground?: boolean }) => {
        const col = data.collection ?? (data as { name?: string; isPlayground?: boolean });
        setFetchedMeta({
          name: col.name ?? '',
          isPlayground: col.isPlayground ?? false,
        });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setFetchedMeta(null);
      });
    return () => ac.abort();
  }, [id]);

  const collectionName = fetchedMeta
    ? fetchedMeta.name || listMatch?.name || ''
    : listMatch?.name ?? '';
  const isPlayground = fetchedMeta
    ? fetchedMeta.isPlayground
    : (listMatch?.isPlayground ?? false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/50">
      <OrgHeader pageTitle={collectionName} showPlaygroundBadge={isPlayground} />
      <div className="flex flex-1 overflow-hidden">
        <CollectionSidebar collectionId={id} collectionName={collectionName} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
