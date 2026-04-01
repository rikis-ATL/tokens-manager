'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissions } from '@/context/PermissionsContext';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SettingsPageProps {
  params: { id: string };
}

export default function CollectionSettingsPage({ params }: SettingsPageProps) {
  const { id } = params;
  const { isAdmin } = usePermissions();

  const [collectionName, setCollectionName] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [figmaFileId, setFigmaFileId] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [isPlayground, setIsPlayground] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: fetch collection data, pre-populate from localStorage if DB values are null
  useEffect(() => {
    async function loadCollection() {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) throw new Error('Failed to fetch collection');
        const data = await res.json();
        const col = data.collection;

        setCollectionName(col.name ?? '');

        // Pre-populate from DB; fall back to localStorage (using actual keys from FigmaConfig/GitHubConfig)
        const figmaConfigRaw = localStorage.getItem('figma-config');
        const figmaConfig = figmaConfigRaw ? JSON.parse(figmaConfigRaw) : null;

        const githubConfigRaw = localStorage.getItem('github-config');
        const githubConfig = githubConfigRaw ? JSON.parse(githubConfigRaw) : null;

        setFigmaToken(col.figmaToken ?? figmaConfig?.token ?? '');
        setFigmaFileId(col.figmaFileId ?? figmaConfig?.fileKey ?? '');
        setGithubRepo(col.githubRepo ?? githubConfig?.repository ?? '');
        setGithubBranch(col.githubBranch ?? githubConfig?.branch ?? '');
        setIsPlayground(col.isPlayground ?? false);
      } catch (err) {
        console.error('[CollectionSettingsPage] Failed to load collection:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCollection();
  }, [id]);

  // Auto-save on field changes (debounced 800ms, skip initial mount)
  useEffect(() => {
    if (!didMountRef.current) {
      // Skip initial mount — only start watching after first load completes
      if (!loading) {
        didMountRef.current = true;
      }
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

    setSaveStatus('saving');

    debounceRef.current = setTimeout(async () => {
      await saveToDb({ figmaToken, figmaFileId, githubRepo, githubBranch, isPlayground });
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figmaToken, figmaFileId, githubRepo, githubBranch, isPlayground]);

  // Once loading finishes, mark mount as done so subsequent changes trigger auto-save
  useEffect(() => {
    if (!loading) {
      didMountRef.current = true;
    }
  }, [loading]);

  async function saveToDb(fields: {
    figmaToken: string;
    figmaFileId: string;
    githubRepo: string;
    githubBranch: string;
    isPlayground: boolean;
  }) {
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaToken: fields.figmaToken || null,
          figmaFileId: fields.figmaFileId || null,
          githubRepo: fields.githubRepo || null,
          githubBranch: fields.githubBranch || null,
          isPlayground: fields.isPlayground,
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      setSaveStatus('saved');
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[CollectionSettingsPage] Auto-save failed:', err);
      setSaveStatus('error');
    }
  }

  function clearFigmaFields() {
    // Cancel any pending debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Set fields to empty and save immediately (bypassing debounce)
    setFigmaToken('');
    setFigmaFileId('');
    setSaveStatus('saving');
    saveToDb({ figmaToken: '', figmaFileId: '', githubRepo, githubBranch, isPlayground });
  }

  function clearGithubFields() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGithubRepo('');
    setGithubBranch('');
    setSaveStatus('saving');
    saveToDb({ figmaToken, figmaFileId, githubRepo: '', githubBranch: '', isPlayground });
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Heading row */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-xl font-semibold text-gray-900">
          Settings: {collectionName}
        </h1>
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
            Error saving
          </span>
        )}
      </div>

      <div className="space-y-8">
        {/* Figma section */}
        <section>
          <div className="flex items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Figma
            </h2>
            <button
              onClick={clearFigmaFields}
              className="text-xs text-gray-400 hover:text-red-500 ml-2"
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Figma Token
              </label>
              <Input
                type="password"
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
                placeholder="figd_xxxx..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate at figma.com &rarr; Account Settings &rarr; Personal access tokens
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Figma File ID
              </label>
              <Input
                type="text"
                value={figmaFileId}
                onChange={(e) => setFigmaFileId(e.target.value)}
                placeholder="ABC123..."
              />
              <p className="text-xs text-gray-500 mt-1">
                The file key from your Figma file URL (figma.com/design/<strong>FILE_KEY</strong>/...)
              </p>
            </div>
          </div>
        </section>

        {/* GitHub section */}
        <section>
          <div className="flex items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              GitHub
            </h2>
            <button
              onClick={clearGithubFields}
              className="text-xs text-gray-400 hover:text-red-500 ml-2"
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repo
              </label>
              <Input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="org/repo"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: <code className="bg-gray-100 px-1 rounded">username/repository</code>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Branch
              </label>
              <Input
                type="text"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                placeholder="main"
              />
              <p className="text-xs text-gray-500 mt-1">
                The branch to read tokens from (e.g. <code className="bg-gray-100 px-1 rounded">main</code>)
              </p>
            </div>
          </div>
        </section>

        {/* Playground section - Admin only */}
        {isAdmin && (
          <section>
            <div className="flex items-center mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Playground Mode
              </h2>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Checkbox
                id="playground-toggle"
                checked={isPlayground}
                onCheckedChange={(checked) => setIsPlayground(checked === true)}
              />
              <div className="flex-1">
                <label
                  htmlFor="playground-toggle"
                  className="block text-sm font-medium text-gray-900 cursor-pointer"
                >
                  Playground Collection
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  When enabled, all edits are session-based (stored in browser memory). Changes are not saved to the database and will be lost when the browser is closed. Useful for demos, workshops, and experimentation.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
