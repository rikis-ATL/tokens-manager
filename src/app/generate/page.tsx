'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TokenGeneratorFormNew } from '@/components/TokenGeneratorFormNew';
import { TokenGeneratorDocs } from '@/components/TokenGeneratorDocs';
import { GitHubConfig } from '@/components/GitHubConfig';
import { BuildTokensModal } from '@/components/BuildTokensModal';

interface GitHubRepo {
  repository: string;
  token: string;
  branch: string;
}

export default function GeneratePage() {
  const [githubConfig, setGitHubConfig] = useState<GitHubRepo | null>(null);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [buildTokensData, setBuildTokensData] = useState<Record<string, unknown> | null>(null);
  const [buildNamespace, setBuildNamespace] = useState('token');
  const [buildCollectionName, setBuildCollectionName] = useState('');

  const handleTokensChange = (
    tokens: Record<string, unknown> | null,
    namespace: string,
    collectionName: string
  ) => {
    setBuildTokensData(tokens);
    setBuildNamespace(namespace || 'token');
    // Use actual collection name when available; fall back to 'generated-tokens' for unsaved/new collections
    setBuildCollectionName(collectionName || 'generated-tokens');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold text-gray-900">Token Generator</h1>
                <nav className="flex space-x-4">
                  <Link
                    href="/"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    View Tokens
                  </Link>
                  <Link
                    href="/generate"
                    className="bg-blue-100 text-blue-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Generate Tokens
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBuildModalOpen(true)}
                  disabled={!buildTokensData}
                  className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Build Tokens
                </button>
                <GitHubConfig onConfigChange={setGitHubConfig} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Create W3C Design Token Specification Compliant Tokens
          </h2>
          <p className="text-gray-600">
            Generate design tokens that follow the W3C Design Tokens specification with proper value, type, and attributes.
          </p>
        </div>

        <TokenGeneratorDocs />
        <TokenGeneratorFormNew githubConfig={githubConfig} onTokensChange={handleTokensChange} />
      </main>

      {buildTokensData && (
        <BuildTokensModal
          tokens={buildTokensData}
          namespace={buildNamespace}
          collectionName={buildCollectionName}
          isOpen={buildModalOpen}
          onClose={() => setBuildModalOpen(false)}
        />
      )}
    </div>
  );
}