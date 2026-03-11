'use client';

import { useEffect, useState } from 'react';
import { BuildTokensPanel } from '@/components/BuildTokensPanel';

export default function ConfigurationPage() {
  const [tokens, setTokens] = useState<Record<string, unknown> | null>(null);
  const [namespace, setNamespace] = useState('token');
  const [collectionName, setCollectionName] = useState('');

  useEffect(() => {
    const selectedId = localStorage.getItem('atui-selected-collection-id');

    if (!selectedId || selectedId === 'local') {
      // No MongoDB collection selected — leave tokens as null
      return;
    }

    // Fetch the collection's token data
    fetch(`/api/collections/${selectedId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { name?: string; namespace?: string; tokens?: Record<string, unknown> }) => {
        if (data.tokens) {
          setTokens(data.tokens);
        }
        if (data.name) {
          setCollectionName(data.name);
        }
        if (data.namespace) {
          setNamespace(data.namespace);
        }
      })
      .catch(() => {
        // Silently fail — tokens remain null, user sees empty state
      });
  }, []);

  return (
    <div className="px-6 py-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Configuration</h1>
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-160px)]">
        {/* Left column — Build settings */}
        <div className="border rounded-lg bg-white p-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Build Settings</h2>
          <div className="text-sm text-gray-600">
            <p>
              Collection:{' '}
              <span className="font-medium">{collectionName || 'None selected'}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Select a collection in the sidebar to enable building.
            </p>
          </div>
          {/* Build Tokens button is in the BuildTokensPanel header */}
        </div>

        {/* Right column — Build output panel */}
        <div className="border rounded-lg bg-white overflow-hidden flex flex-col">
          <BuildTokensPanel
            tokens={tokens}
            namespace={namespace}
            collectionName={collectionName}
          />
        </div>
      </div>
    </div>
  );
}
