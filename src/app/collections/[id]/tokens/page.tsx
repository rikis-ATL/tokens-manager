'use client';

import { useEffect, useState } from 'react';

interface TokensPageProps {
  params: { id: string };
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const [collectionName, setCollectionName] = useState('');
  const [tokens, setTokens] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/collections/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch collection');
        return res.json();
      })
      .then((data: { collection?: { name?: string; tokens?: Record<string, unknown> }; name?: string; tokens?: Record<string, unknown> }) => {
        const col = data.collection ?? (data as { name?: string; tokens?: Record<string, unknown> });
        if (col.name) setCollectionName(col.name);
        setTokens(col.tokens ?? null);
      })
      .catch(() => {
        setTokens(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const hasTokens = tokens && Object.keys(tokens).length > 0;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        Tokens{collectionName ? `: ${collectionName}` : ''}
      </h1>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !hasTokens && (
        <div className="text-sm text-gray-500">
          No tokens yet. Use the Config page to build tokens or import from GitHub/Figma.
        </div>
      )}

      {!loading && hasTokens && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(tokens!).map(([key, value]) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono text-gray-900">{key}</td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-600">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
