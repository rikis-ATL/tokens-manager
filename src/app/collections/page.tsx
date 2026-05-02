'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AddFilled,
  Search,
  Close,
  Grid,
  List,
} from '@carbon/icons-react';
import { TagFilterCombobox } from '@/components/collections/TagFilterCombobox';
import type { CollectionCardData } from '@/types/collection.types';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionTableView } from '@/components/collections/CollectionTableView';
import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog';
import { NewCollectionDialog } from '@/components/collections/NewCollectionDialog';
import { EditCollectionDialog } from '@/components/collections/EditCollectionDialog';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/context/PermissionsContext';
import { useUpgradeModal } from '@/components/billing/UpgradeModalProvider';

type ViewMode = 'grid' | 'table';

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CollectionCardData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { canCreate, isAdmin } = usePermissions();
  const { openUpgradeModal } = useUpgradeModal();
  // undefined = not yet loaded; null = unlimited; number = the actual limit
  const [collectionMax, setCollectionMax] = useState<number | null | undefined>(undefined);
  const [orgPlan, setOrgPlan] = useState<string>('free');

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(Array.isArray(data) ? data : data.collections ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/org/usage')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data) {
        setCollectionMax(data.collectionMax);
        setOrgPlan(data.plan ?? 'free');
      }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleNewCollection = () => {
    // collectionMax === undefined means the usage fetch hasn't resolved yet — skip pre-check,
    // let the server enforce via 402 if the limit is actually hit.
    const atLimit =
      collectionMax !== undefined &&
      collectionMax !== null &&
      collectionMax !== Infinity &&
      collections.length >= collectionMax;

    if (atLimit) {
      if (isAdmin) {
        router.push('/account');
      } else {
        openUpgradeModal({
          resource: 'collections',
          current: collections.length,
          max: collectionMax as number,
          tier: orgPlan,
        });
      }
      return;
    }

    setCreateDialogOpen(true);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [collections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((t) => c.tags.includes(t));
      return matchesQuery && matchesTags;
    });
  }, [collections, search, selectedTags]);

  const handleCardClick = (id: string) => router.push(`/collections/${id}/tokens`);

  const handleRename = async (id: string, newName: string) => {
    setCollections((prev) => prev.map((c) => (c._id === id ? { ...c, name: newName } : c)));
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) await fetchCollections();
    } catch {
      await fetchCollections();
    }
  };

  const handleEditRequest = (id: string) => {
    const collection = collections.find((c) => c._id === id);
    if (collection) setEditTarget(collection);
  };

  const handleEditSaved = (id: string, updated: { name: string; description: string | null; tags: string[]; accentColor: string | null }) => {
    setCollections((prev) => prev.map((c) => (c._id === id ? { ...c, ...updated } : c)));
  };

  const handleDeleteRequest = (id: string) => {
    const collection = collections.find((c) => c._id === id);
    if (collection) setDeleteTarget({ id, name: collection.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCollections((prev) => prev.filter((c) => c._id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/duplicate`, { method: 'POST' });
      if (res.ok) await fetchCollections();
    } catch { /* silently ignore */ }
  };

  return (
    <div className="p-6 mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Collections</h1>
        {canCreate && (
          <Button onClick={handleNewCollection}>
            <AddFilled size={14} className="mr-1.5 shrink-0" />
            New Collection
          </Button>
        )}
      </div>

      {/* Search + Tag filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              className="w-72 pl-9 pr-8 py-2 text-sm bg-background text-foreground border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
              placeholder="Search by name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <Close size={14} className="shrink-0" />
              </button>
            )}
          </div>
          {allTags.length > 0 && (
            <TagFilterCombobox
              allTags={allTags}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Grid view"
          >
            <Grid size={16} className="shrink-0" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'table'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Table view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg min-h-[120px]" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-foreground">No collections yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first collection to start managing your design tokens.
          </p>
          {canCreate && (
            <Button onClick={handleNewCollection}>
              <AddFilled size={14} className="mr-1.5 shrink-0" />
              Create Collection
            </Button>
          )}
        </div>
      )}

      {/* No search results */}
      {!loading && collections.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-base font-medium text-muted-foreground">No collections match your filters</p>
          <button
            className="text-sm text-primary hover:underline mt-2"
            onClick={() => { setSearch(''); setSelectedTags([]); }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Grid or Table View */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((collection) => (
            <CollectionCard
              key={collection._id}
              collection={collection}
              onRename={handleRename}
              onEdit={handleEditRequest}
              onDelete={handleDeleteRequest}
              onDuplicate={handleDuplicate}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {!loading && viewMode === 'table' && filtered.length > 0 && (
        <CollectionTableView
          collections={filtered}
          onRename={handleRename}
          onEdit={handleEditRequest}
          onDelete={handleDeleteRequest}
          onDuplicate={handleDuplicate}
          onClick={handleCardClick}
        />
      )}

      <DeleteCollectionDialog
        isOpen={deleteTarget !== null}
        collectionName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={isDeleting}
      />

      <NewCollectionDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        existingCollections={collections}
        onCreated={(newId) => { router.push(`/collections/${newId}/tokens`); }}
      />

      {editTarget && (
        <EditCollectionDialog
          isOpen={editTarget !== null}
          collection={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            handleEditSaved(editTarget._id, updated);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
