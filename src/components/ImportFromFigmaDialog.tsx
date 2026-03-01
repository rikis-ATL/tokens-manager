import React, { useState, useEffect, useRef } from 'react';

interface FigmaCollectionMode {
  modeId: string;
  name: string;
}

interface FigmaCollection {
  id: string;
  name: string;
  modes: FigmaCollectionMode[];
}

interface ImportFromFigmaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (collectionId: string, collectionName: string) => void;
}

export function ImportFromFigmaDialog({
  isOpen,
  onClose,
  onImported,
}: ImportFromFigmaDialogProps) {
  const [step, setStep] = useState<'pick' | 'name'>('pick');
  const [figmaToken, setFigmaToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [collections, setCollections] = useState<FigmaCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedCollectionName, setSelectedCollectionName] = useState('');
  const [collectionNameInput, setCollectionNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCredentials, setNoCredentials] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isOpen) {
      (dialogRef.current as any)?.openDialog();
    } else {
      (dialogRef.current as any)?.closeDialog();
    }
  }, [isOpen]);

  // Load credentials and fetch collections on open
  useEffect(() => {
    if (!isOpen) return;

    // Reset state on open
    setStep('pick');
    setCollections([]);
    setSelectedCollectionId('');
    setSelectedCollectionName('');
    setCollectionNameInput('');
    setError(null);
    setNoCredentials(false);

    const raw = localStorage.getItem('figma-config');
    if (!raw) {
      setNoCredentials(true);
      return;
    }

    let config: { token?: string; fileKey?: string };
    try {
      config = JSON.parse(raw);
    } catch {
      setNoCredentials(true);
      return;
    }

    if (!config.token || !config.fileKey) {
      setNoCredentials(true);
      return;
    }

    setFigmaToken(config.token);
    setFileKey(config.fileKey);
    fetchCollections(config.token, config.fileKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchCollections = async (token: string, key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/figma/collections?token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(key)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load Figma collections');
        return;
      }
      setCollections(data.collections ?? []);
    } catch {
      setError('Failed to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (figmaToken && fileKey) {
      fetchCollections(figmaToken, fileKey);
    }
  };

  const handleNext = () => {
    if (!selectedCollectionId) return;
    setStep('name');
  };

  const handleSave = async () => {
    if (!collectionNameInput.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/figma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: figmaToken,
          fileKey,
          collectionId: selectedCollectionId,
          collectionName: collectionNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 201) {
        onImported(data.collection._id, data.collection.name);
        onClose();
      } else {
        setError(data.error || 'Import failed');
      }
    } catch {
      setError('Failed to reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const modeCount = selectedCollection ? selectedCollection.modes.length : 0;

  return (
    <at-dialog ref={dialogRef} backdrop={true} close_backdrop={false}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {step === 'pick' ? 'Import from Figma' : 'Name your collection'}
          </h3>
          <at-button label="✕" onClick={onClose} disabled={saving} className="text-gray-500 hover:text-gray-700" />
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Enterprise warning */}
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
            Requires a <strong>Figma Enterprise plan</strong>. The Variables REST API is not available on Professional or lower plans.
          </div>

          {/* No credentials state */}
          {noCredentials ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Configure Figma credentials first.
              </p>
              <p className="text-sm text-gray-500">
                Click the Figma button in the app header to add your Personal Access Token and file URL.
              </p>
            </div>
          ) : step === 'pick' ? (
            /* Step 1: Pick collection */
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-600">{error}</p>
                  <at-button label="Retry" onClick={handleRetry} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700" />
                </div>
              ) : collections.length === 0 ? (
                <p className="text-sm text-gray-500">No variable collections found in this Figma file.</p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Variable collection
                  </label>
                  <at-select
                    value={selectedCollectionId}
                    onAtuiChange={(e: CustomEvent<string>) => {
                      const id = e.detail;
                      setSelectedCollectionId(id);
                      const found = collections.find(c => c.id === id);
                      if (found) {
                        setSelectedCollectionName(found.name);
                        setCollectionNameInput(found.name);
                      }
                    }}
                    className="w-full"
                  >
                    <at-select-option value="" label="Select a collection..." />
                    {collections.map(c => (
                      <at-select-option key={c.id} value={c.id} label={c.name} />
                    ))}
                  </at-select>
                  {selectedCollectionId && (
                    <p className="text-xs text-gray-500">
                      {modeCount} {modeCount === 1 ? 'mode' : 'modes'} will be imported as brands
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Confirm name */
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Collection name
              </label>
              <at-input
                value={collectionNameInput}
                onAtuiChange={(e: CustomEvent<string | number>) => setCollectionNameInput(String(e.detail))}
                disabled={saving}
                placeholder="Enter collection name"
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                This name will be used in the Design Token Manager
              </p>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <p className="text-xs text-gray-400">
                Saving will create a new collection. The modes in this Figma collection will appear as brands.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
          <at-button
            label="Cancel"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          />

          {!noCredentials && step === 'pick' && !loading && !error && collections.length > 0 && (
            <at-button
              label="Next"
              onClick={handleNext}
              disabled={!selectedCollectionId}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          )}

          {!noCredentials && step === 'name' && (
            <at-button
              label={saving ? 'Importing...' : 'Import & Save'}
              onClick={handleSave}
              disabled={saving || !collectionNameInput.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          )}
        </div>
      </div>
    </at-dialog>
  );
}
