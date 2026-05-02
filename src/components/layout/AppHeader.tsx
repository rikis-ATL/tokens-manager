'use client';

import { useState } from 'react';
import { AddFilled, Renew } from '@carbon/icons-react';
import { useCollection } from '@/context/CollectionContext';
import { CollectionSelector } from '@/components/collections/CollectionSelector';
import { Button } from '@/components/ui/button';
import { UsageBadge } from '@/components/billing/UsageBadge';
import { apiFetch } from '@/lib/api-client';

export function AppHeader() {
  const { collections, selectedId, setSelectedId, loading, loadError, refreshCollections } = useCollection();
  const [creating, setCreating] = useState(false);

  const handleNewCollection = async () => {
    setCreating(true);
    try {
      const res = await apiFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Collection', tokens: {}, namespace: 'token' }),
      });
      if (res.ok) {
        const data = await res.json();
        const collection = data.collection ?? data;
        await refreshCollections();
        setSelectedId(collection._id);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <header className="flex items-center gap-4 px-6 py-3 border-b border-muted bg-background text-foreground flex-shrink-0">
      {loadError ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span>Failed to load collections</span>
          <Button variant="ghost" size="sm" onClick={() => refreshCollections()}>
            <Renew size={13} className="mr-1.5 shrink-0" />
            Retry
          </Button>
        </div>
      ) : (
        <CollectionSelector
          collections={collections}
          selectedId={selectedId}
          loading={loading}
          onChange={setSelectedId}
        />
      )}
      <div className="ml-auto flex items-center gap-3">
        <UsageBadge />
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewCollection}
          disabled={creating}
        >
          <AddFilled size={14} className="mr-1.5 shrink-0" />
          New Collection
        </Button>
      </div>
    </header>
  );
}
