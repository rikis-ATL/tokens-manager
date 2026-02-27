'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ExportToFigmaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tokenSet: Record<string, unknown>;
  loadedCollectionId?: string | null;
}

interface FigmaCollection {
  id: string;
  name: string;
}

interface FigmaConfig {
  token: string;
  fileUrl: string;
  fileKey: string;
}

export function ExportToFigmaDialog({
  isOpen,
  onClose,
  tokenSet,
  loadedCollectionId,
}: ExportToFigmaDialogProps) {
  const [figmaToken, setFigmaToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [collections, setCollections] = useState<FigmaCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasCredentials, setHasCredentials] = useState(false);
  const prevIsOpen = useRef(false);

  const fetchCollections = async (token: string, key: string) => {
    if (!token || !key) return;
    setLoading(true);
    setError(null);
    setCollections([]);
    setSelectedCollectionId('');
    try {
      const res = await fetch(
        `/api/figma/collections?token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(key)}`
      );
      const data = await res.json();
      if (res.ok) {
        setCollections(data.collections || []);
      } else {
        setError(data.error || 'Failed to load Figma collections');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Figma collections');
    } finally {
      setLoading(false);
    }
  };

  // Load credentials and fetch collections when dialog opens
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // Reset state on open
      setError(null);
      setSuccessMessage(null);
      setCollections([]);
      setSelectedCollectionId('');

      const raw = localStorage.getItem('figma-config');
      if (!raw) {
        setHasCredentials(false);
        setFigmaToken('');
        setFileKey('');
      } else {
        try {
          const config: FigmaConfig = JSON.parse(raw);
          if (config.token && config.fileKey) {
            setHasCredentials(true);
            setFigmaToken(config.token);
            setFileKey(config.fileKey);
            fetchCollections(config.token, config.fileKey);
          } else {
            setHasCredentials(false);
          }
        } catch {
          setHasCredentials(false);
        }
      }
    }
    prevIsOpen.current = isOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleLoadCollections = () => {
    setCollections([]);
    setSelectedCollectionId('');
    setError(null);
    fetchCollections(figmaToken, fileKey);
  };

  const handleFileKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileKey(e.target.value);
    setCollections([]);
    setSelectedCollectionId('');
    setError(null);
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/export/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSet,
          figmaToken,
          fileKey,
          collectionId: selectedCollectionId,
          mongoCollectionId: loadedCollectionId ?? null,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccessMessage('Successfully exported to Figma!');
      } else {
        setError(result.error || 'Export failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Export to Figma</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={exporting}
          >
            ✕
          </button>
        </div>

        {/* No credentials state */}
        {!hasCredentials ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Configure Figma credentials first using the Figma config button in the app header.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : successMessage ? (
          /* Success state */
          <div className="space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              {successMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Main export form */
          <div className="space-y-4">
            {/* File key input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Figma File Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fileKey}
                  onChange={handleFileKeyChange}
                  placeholder="Enter Figma file key"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={exporting}
                />
                <button
                  onClick={handleLoadCollections}
                  disabled={loading || !fileKey.trim() || exporting}
                  className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? 'Loading...' : 'Load collections'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Pre-filled from your Figma config. Edit to export to a different file.
              </p>
            </div>

            {/* Collections dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target variable collection
              </label>
              <select
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                disabled={loading || collections.length === 0 || exporting}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select a collection...</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              {loading && (
                <p className="mt-1 text-xs text-gray-500">Loading collections from Figma...</p>
              )}
              {!loading && collections.length === 0 && !error && hasCredentials && (
                <p className="mt-1 text-xs text-gray-500">
                  Click &ldquo;Load collections&rdquo; to fetch available variable collections.
                </p>
              )}
            </div>

            {/* Multi-brand info */}
            <p className="text-sm text-gray-500">
              Each brand in your collection will map to a corresponding mode in the target Figma collection.
            </p>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedCollectionId || exporting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
