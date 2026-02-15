'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TokenGeneratorFormNew } from '@/components/TokenGeneratorFormNew';
import { TokenGeneratorDocs } from '@/components/TokenGeneratorDocs';
import { GitHubConfig } from '@/components/GitHubConfig';

interface GitHubRepo {
  repository: string;
  token: string;
  branch: string;
}

export default function GeneratePage() {
  const [githubConfig, setGitHubConfig] = useState<GitHubRepo | null>(null);
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
              <GitHubConfig onConfigChange={setGitHubConfig} />
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
        <TokenGeneratorFormNew githubConfig={githubConfig} />
      </main>
    </div>
  );
}