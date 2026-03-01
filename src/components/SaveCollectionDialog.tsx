import React, { useState, useEffect, useRef } from 'react';

interface SaveCollectionDialogProps {
  isOpen: boolean;
  initialName?: string;           // pre-filled when overwriting a loaded collection
  onSave: (name: string) => Promise<void>;   // called with final name; parent does the fetch
  onCancel: () => void;
  isSaving: boolean;              // disables buttons during fetch
}

export function SaveCollectionDialog({
  isOpen,
  initialName = '',
  onSave,
  onCancel,
  isSaving,
}: SaveCollectionDialogProps) {
  const [step, setStep] = useState<'name-entry' | 'confirm-overwrite'>('name-entry');
  const [name, setName] = useState(initialName);
  const prevIsOpen = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Reset to name-entry and sync name when dialog opens (transition false→true)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setStep('name-entry');
      setName(initialName);
      // Use the hidden trigger button to open the dialog via ATUI's data-dialog mechanism
      triggerRef.current?.click();
    }
    if (!isOpen && prevIsOpen.current) {
      (dialogRef.current as any)?.closeDialog?.();
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialName]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim());
    setStep('confirm-overwrite');
  };

  return (
    <>
      {/* Hidden trigger button — clicked programmatically to open the at-dialog */}
      <button
        ref={triggerRef}
        data-dialog="save-collection-dialog"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <at-dialog ref={dialogRef} trigger_id="save-collection-dialog" backdrop={true} close_backdrop={false}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {step === 'name-entry' ? 'Save to Database' : 'Overwrite Collection?'}
            </h3>
            <at-button
              label="✕"
              onAtuiClick={onCancel}
              disabled={isSaving}
              className="text-gray-500 hover:text-gray-700"
            />
          </div>

          {/* Body */}
          <div className="p-4">
            {step === 'name-entry' ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Collection name
                </label>
                <at-input
                  value={name}
                  placeholder="Enter a name for this collection"
                  onAtuiChange={(e: CustomEvent<string | number>) => setName(String(e.detail))}
                  disabled={isSaving}
                  className="w-full"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                A collection named <strong>&ldquo;{name}&rdquo;</strong> already exists. Overwrite it?
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
            <at-button
              label="Cancel"
              onAtuiClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            />
            {step === 'name-entry' ? (
              <at-button
                label={isSaving ? 'Saving...' : 'Save'}
                onAtuiClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              />
            ) : (
              <at-button
                label={isSaving ? 'Saving...' : 'Overwrite'}
                onAtuiClick={() => onSave(name.trim())}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              />
            )}
          </div>
        </div>
      </at-dialog>
    </>
  );
}
