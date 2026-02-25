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
  // Track whether dialog was open in previous render to detect re-open
  const prevIsOpen = useRef(false);

  // Reset to name-entry and sync name when dialog opens (transition false→true)
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setStep('name-entry');
      setName(initialName);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, initialName]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim());
    // If dialog is still open after onSave resolves (parent kept it open due to 409),
    // advance from name-entry to confirm-overwrite so user can confirm the overwrite.
    // If parent closed the dialog (success/error), this state update is a no-op.
    setStep('confirm-overwrite');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {step === 'name-entry' ? 'Save to Database' : 'Overwrite Collection?'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSaving}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {step === 'name-entry' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Collection name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving && name.trim()) {
                    handleSave();
                  }
                  if (e.key === 'Escape') onCancel();
                }}
                placeholder="Enter a name for this collection"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
                disabled={isSaving}
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
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          {step === 'name-entry' ? (
            <button
              onClick={handleSave}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${
                isSaving || !name.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button
              onClick={() => onSave(name.trim())}
              className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Overwrite'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
