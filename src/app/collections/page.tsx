'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import type { CollectionCardData } from '@/types/collection.types';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { DeleteCollectionDialog } from '@/components/collections/DeleteCollectionDialog';
import { NewCollectionDialog } from '@/components/collections/NewCollectionDialog';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/context/PermissionsContext';

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { canCreate } = usePermissions();

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

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCardClick = (id: string) => {
    router.push(`/collections/${id}/tokens`);
  };

  const handleRename = async (id: string, newName: string) => {
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) => (c._id === id ? { ...c, name: newName } : c))
    );
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        // Refresh to revert on error
        await fetchCollections();
      }
    } catch {
      await fetchCollections();
    }
  };

  const handleDeleteRequest = (id: string) => {
    const collection = collections.find((c) => c._id === id);
    if (collection) {
      setDeleteTarget({ id, name: collection.name });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCollections((prev) =>
          prev.filter((c) => c._id !== deleteTarget.id)
        );
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchCollections();
      }
    } catch {
      // silently ignore
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle size={14} className="mr-1.5" />
            New Collection
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-200 rounded-lg min-h-[120px]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-gray-700">
            No collections yet
          </p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Create your first collection to start managing your design tokens.
          </p>
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle size={14} className="mr-1.5" />
              Create Collection
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* + New Collection card — only visible to users with canCreate */}
          {canCreate && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all flex flex-col items-center justify-center min-h-[120px] text-gray-400 hover:text-gray-600"
              onClick={() => setCreateDialogOpen(true)}
            >
              <PlusCircle size={24} />
              <span className="mt-2 text-sm font-medium">New Collection</span>
            </div>
          )}

          {/* Collection cards */}
          {collections.map((collection) => (
            <CollectionCard
              key={collection._id}
              collection={collection}
              onRename={handleRename}
              onDelete={handleDeleteRequest}
              onDuplicate={handleDuplicate}
              onClick={handleCardClick}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <DeleteCollectionDialog
        isOpen={deleteTarget !== null}
        collectionName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={isDeleting}
      />

      {/* New Collection dialog */}
      <NewCollectionDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        existingCollections={collections}
        onCreated={(newId) => { router.push(`/collections/${newId}/tokens`); }}
      />
    </div>
  );
}
