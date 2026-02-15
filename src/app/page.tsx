'use client';

import { useState, useEffect } from 'react';
import { TokenTable } from '@/components/TokenTable';

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, any>;
}

interface TokenGroup {
  path: string;
  token: Token;
  filePath: string;
  section: string;
}

export default function Home() {
  const [tokenData, setTokenData] = useState<Record<string, TokenGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      if (!response.ok) {
        throw new Error('Failed to load tokens');
      }
      const data = await response.json();
      setTokenData(data.flatTokens || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const saveToken = async (filePath: string, tokenData: any) => {
    try {
      const response = await fetch(`/api/tokens/${filePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });

      if (!response.ok) {
        throw new Error('Failed to save token');
      }

      return true;
    } catch (err) {
      console.error('Error saving token:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading design tokens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchTokens}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">Design Token Manager</h1>
              <nav className="flex space-x-4">
                <a
                  href="/"
                  className="bg-blue-100 text-blue-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  View Tokens
                </a>
                <a
                  href="/generate"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Generate Tokens
                </a>
              </nav>
            </div>
            <button
              onClick={fetchTokens}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {Object.keys(tokenData).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No design tokens found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(tokenData).map(([section, tokens]) => (
              <TokenTable
                key={section}
                section={section}
                tokens={tokens}
                onSave={saveToken}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}