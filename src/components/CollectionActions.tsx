'use client';

import React, { useState } from 'react';

interface CollectionActionsProps {
  selectedId: string;
  selectedName: string;
  collections: { _id: string; name: string }[];
  onDeleted: () => void;
  onRenamed: (newName: string) => void;
  onDuplicated: (newId: string, newName: string) => void;
  onError: (message: string) => void;
}

export function CollectionActions({
  selectedId,
  selectedName,
  collections,
  onDeleted,
  onRenamed,
  onDuplicated,
  onError,
}: CollectionActionsProps) {
  const deleteDialogRef = React.useRef<HTMLElement>(null);
  const renameDialogRef = React.useRef<HTMLElement>(null);
  const duplicateDialogRef = React.useRef<HTMLElement>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  if (!selectedId || selectedId === 'local' || collections.length === 0) {
    return null;
  }

  // --- Delete ---
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${selectedId}`, { method: 'DELETE' });
      if (res.ok) {
        (deleteDialogRef.current as any)?.closeDialog();
        onDeleted();
      } else {
        onError('Failed to delete collection');
      }
    } catch {
      onError('Failed to delete collection');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Rename ---
  const renameTrimmed = renameValue.trim();
  const renameIsDuplicate =
    renameTrimmed !== '' &&
    collections.some(
      (c) => c.name === renameTrimmed && c._id !== selectedId
    );
  const renameIsUnchanged = renameTrimmed === selectedName;
  const renameSaveDisabled =
    isRenaming || !renameTrimmed || renameIsDuplicate || renameIsUnchanged;

  const handleRename = async () => {
    if (renameSaveDisabled) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/collections/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameTrimmed }),
      });
      if (res.ok) {
        (renameDialogRef.current as any)?.closeDialog();
        onRenamed(renameTrimmed);
      } else {
        onError('Failed to rename collection');
      }
    } catch {
      onError('Failed to rename collection');
    } finally {
      setIsRenaming(false);
    }
  };

  // --- Duplicate ---
  const duplicateTrimmed = duplicateName.trim();
  const duplicateSaveDisabled = isDuplicating || !duplicateTrimmed;

  const handleDuplicate = async () => {
    if (duplicateSaveDisabled) return;
    setIsDuplicating(true);
    setDuplicateError(null);
    try {
      // Step 1: fetch source collection
      const getRes = await fetch(`/api/collections/${selectedId}`);
      if (!getRes.ok) {
        onError('Failed to duplicate collection');
        setIsDuplicating(false);
        return;
      }
      const { collection: source } = await getRes.json();

      // Step 2: POST new collection with copied tokens
      const postRes = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: duplicateTrimmed,
          tokens: source.tokens,
          sourceMetadata: source.sourceMetadata,
        }),
      });

      if (postRes.status === 409) {
        setDuplicateError(`A collection named "${duplicateTrimmed}" already exists.`);
        return;
      }

      if (postRes.status === 201) {
        const { collection } = await postRes.json();
        (duplicateDialogRef.current as any)?.closeDialog();
        onDuplicated(collection._id, collection.name);
      } else {
        onError('Failed to duplicate collection');
      }
    } catch {
      onError('Failed to duplicate collection');
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Delete button — data-dialog opens the dialog */}
      <at-button
        label="Delete"
        data-dialog="delete-collection-dialog"
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border text-red-600 border-red-300 hover:bg-red-50 rounded-md"
      />

      {/* Rename button — sets initial value AND opens dialog */}
      <at-button
        label="Rename"
        data-dialog="rename-collection-dialog"
        onAtuiClick={() => setRenameValue(selectedName)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border text-gray-700 border-gray-300 hover:bg-gray-50 rounded-md"
      />

      {/* Duplicate button — sets initial value AND opens dialog */}
      <at-button
        label="Duplicate"
        data-dialog="duplicate-collection-dialog"
        onAtuiClick={() => {
          setDuplicateName('Copy of ' + selectedName);
          setDuplicateError(null);
        }}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border text-gray-700 border-gray-300 hover:bg-gray-50 rounded-md"
      />

      {/* ---- Delete Dialog ---- */}
      <at-dialog ref={deleteDialogRef} trigger_id="delete-collection-dialog" backdrop={true} close_backdrop={false}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Delete Collection</h3>
            <at-button
              label="✕"
              data-dialog="delete-collection-dialog"
              disabled={isDeleting}
              className="text-gray-500 hover:text-gray-700"
            />
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-700">
              Delete <strong>&ldquo;{selectedName}&rdquo;</strong>? This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
            <at-button
              label="Cancel"
              data-dialog="delete-collection-dialog"
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            />
            <at-button
              label={isDeleting ? 'Deleting...' : 'Delete'}
              onAtuiClick={handleDelete}
              disabled={isDeleting}
              className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      </at-dialog>

      {/* ---- Rename Dialog ---- */}
      <at-dialog ref={renameDialogRef} trigger_id="rename-collection-dialog" backdrop={true} close_backdrop={false}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Rename Collection</h3>
            <at-button
              label="✕"
              data-dialog="rename-collection-dialog"
              disabled={isRenaming}
              className="text-gray-500 hover:text-gray-700"
            />
          </div>
          <div className="p-4 space-y-2">
            <at-input
              label="Collection name"
              value={renameValue}
              onAtuiChange={(e: CustomEvent<string | number>) => setRenameValue(String(e.detail))}
              disabled={isRenaming}
              className="w-full"
            />
            {renameIsDuplicate && (
              <p className="text-sm text-red-600">
                A collection named &ldquo;{renameTrimmed}&rdquo; already exists.
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
            <at-button
              label="Cancel"
              data-dialog="rename-collection-dialog"
              disabled={isRenaming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            />
            <at-button
              label={isRenaming ? 'Saving...' : 'Save'}
              onAtuiClick={handleRename}
              disabled={renameSaveDisabled}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${renameSaveDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      </at-dialog>

      {/* ---- Duplicate Dialog ---- */}
      <at-dialog ref={duplicateDialogRef} trigger_id="duplicate-collection-dialog" backdrop={true} close_backdrop={false}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Duplicate Collection</h3>
            <at-button
              label="✕"
              data-dialog="duplicate-collection-dialog"
              disabled={isDuplicating}
              className="text-gray-500 hover:text-gray-700"
            />
          </div>
          <div className="p-4 space-y-2">
            <at-input
              label="New collection name"
              value={duplicateName}
              onAtuiChange={(e: CustomEvent<string | number>) => setDuplicateName(String(e.detail))}
              disabled={isDuplicating}
              className="w-full"
            />
            {duplicateError && (
              <p className="text-sm text-red-600">{duplicateError}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
            <at-button
              label="Cancel"
              data-dialog="duplicate-collection-dialog"
              disabled={isDuplicating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            />
            <at-button
              label={isDuplicating ? 'Duplicating...' : 'Duplicate'}
              onAtuiClick={handleDuplicate}
              disabled={duplicateSaveDisabled}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${duplicateSaveDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      </at-dialog>
    </div>
  );
}
