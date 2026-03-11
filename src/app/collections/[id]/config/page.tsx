'use client';

import { useEffect, useState } from 'react';
import { BuildTokensPanel } from '@/components/BuildTokensPanel';

interface ConfigPageProps {
  params: { id: string };
}

export default function CollectionConfigPage({ params }: ConfigPageProps) {
  const { id } = params;
  const [collectionName, setCollectionName] = useState('');
  const [namespace, setNamespace] = useState('token');
  const [tokens, setTokens] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { collection?: { name?: string; namespace?: string; tokens?: Record<string, unknown> }; name?: string; namespace?: string; tokens?: Record<string, unknown> }) => {
        const col = data.collection ?? (data as { name?: string; namespace?: string; tokens?: Record<string, unknown> });
        if (col.name) setCollectionName(col.name);
        if (col.namespace) setNamespace(col.namespace);
        if (col.tokens) setTokens(col.tokens);
      })
      .catch(() => {
        setTokens(null);
      });
  }, [id]);

  return (
    <div className="px-6 py-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">
        Configuration{collectionName ? `: ${collectionName}` : ''}
      </h1>
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-160px)]">
        {/* Left column — Build settings */}
        <div className="border rounded-lg bg-white p-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Build Settings</h2>
          <div className="text-sm text-gray-600">
            <p>
              Collection:{' '}
              <span className="font-medium">{collectionName || 'Loading...'}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Build tokens for this collection to generate CSS, SCSS, JS and other formats.
            </p>
          </div>
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
