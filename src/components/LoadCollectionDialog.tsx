import React, { useState, useEffect, useRef } from 'react';

interface CollectionListItem {
  _id: string;
  name: string;
  createdAt: string;
}

interface LoadCollectionDialogProps {
  isOpen: boolean;
  onLoad: (collectionId: string) => Promise<void>;
  onCancel: () => void;
}

export function LoadCollectionDialog({
  isOpen,
  onLoad,
  onCancel,
}: LoadCollectionDialogProps) {
  const [collections, setCollections] = useState<CollectionListItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fetch collections when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setCollections([]);
      setFetchError(null);
      setIsFetching(false);
      setIsLoading(false);
      (dialogRef.current as any)?.closeDialog?.();
      return;
    }

    // Open via hidden trigger
    triggerRef.current?.click();

    const fetchCollections = async () => {
      setIsFetching(true);
      setFetchError(null);
      try {
        const res = await fetch('/api/collections');
        const data = await res.json();
        if (!res.ok) {
          setFetchError('Failed to load collections. Please try again.');
          return;
        }
        setCollections(data.collections ?? []);
      } catch {
        setFetchError('Failed to load collections. Please try again.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchCollections();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSelect = async (collectionId: string) => {
    setIsLoading(true);
    try {
      await onLoad(collectionId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Hidden trigger button — clicked programmatically to open the at-dialog */}
      <button
        ref={triggerRef}
        data-dialog="load-collection-dialog"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <at-dialog ref={dialogRef} trigger_id="load-collection-dialog" backdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Load Collection</h3>
            <at-button
              label="✕"
              onAtuiClick={onCancel}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
            />
          </div>

          {/* Body */}
          <div className="p-4">
            {isFetching ? (
              <div className="flex justify-center py-6">
                <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : fetchError ? (
              <p className="text-sm text-red-600">{fetchError}</p>
            ) : collections.length === 0 ? (
              <p className="text-sm text-gray-500">No collections saved yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {collections.map((item) => (
                  <at-button
                    key={item._id}
                    label={item.name}
                    onAtuiClick={() => handleSelect(item._id)}
                    disabled={isLoading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-gray-200">
            <at-button
              label="Cancel"
              onAtuiClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            />
          </div>
        </div>
      </at-dialog>
    </>
  );
}
