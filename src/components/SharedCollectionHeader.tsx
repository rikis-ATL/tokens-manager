'use client';

import { CollectionSelector } from './CollectionSelector';
import { CollectionActions } from './CollectionActions';

interface SharedCollectionHeaderProps {
  collections: { _id: string; name: string }[];
  selectedId: string;
  tableLoading: boolean;
  onSelectionChange: (id: string) => void;
  onSaveAs: () => void;
  onNewCollection: () => void;
  onDeleted: () => void;
  onRenamed: (newName: string) => void;
  onDuplicated: (newId: string, newName: string) => void;
  onError: (message: string) => void;
}

export function SharedCollectionHeader({
  collections,
  selectedId,
  tableLoading,
  onSelectionChange,
  onSaveAs,
  onNewCollection,
  onDeleted,
  onRenamed,
  onDuplicated,
  onError,
}: SharedCollectionHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 flex-wrap">
        <CollectionSelector
          collections={collections}
          selectedId={selectedId}
          loading={tableLoading}
          onChange={onSelectionChange}
        />

        <at-button
          label="Save As Collection"
          onClick={onSaveAs}
          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        />

        <at-button
          label="New Collection"
          onClick={onNewCollection}
          className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        />

        <CollectionActions
          selectedId={selectedId}
          selectedName={collections.find((c) => c._id === selectedId)?.name ?? ''}
          collections={collections}
          onDeleted={onDeleted}
          onRenamed={onRenamed}
          onDuplicated={onDuplicated}
          onError={onError}
        />
      </div>
    </div>
  );
}
