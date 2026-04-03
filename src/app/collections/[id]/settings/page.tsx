'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/context/PermissionsContext';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { GitHubDirectoryPicker } from '@/components/github/GitHubDirectoryPicker';
import { ExportToFigmaDialog } from '@/components/figma/ExportToFigmaDialog';
import { ImportFromFigmaDialog } from '@/components/figma/ImportFromFigmaDialog';
import { githubService } from '@/services';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SettingsPageProps {
  params: { id: string };
}

export default function CollectionSettingsPage({ params }: SettingsPageProps) {
  const { id } = params;
  const { isAdmin, canGitHub, canFigma } = usePermissions();

  const [collectionName, setCollectionName] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [figmaFileId, setFigmaFileId] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubPath, setGithubPath] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isPlayground, setIsPlayground] = useState(false);
  const [sandboxUrl, setSandboxUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [collectionTokens, setCollectionTokens] = useState<Record<string, unknown>>({});

  // GitHub/Figma sync dialogs
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerMode, setDirectoryPickerMode] = useState<'export' | 'import'>('export');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showExportFigmaDialog, setShowExportFigmaDialog] = useState(false);
  const [showImportFigmaDialog, setShowImportFigmaDialog] = useState(false);

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
        setCollectionTokens(col.tokens ?? {});

        // Pre-populate from DB; fall back to localStorage (using actual keys from FigmaConfig/GitHubConfig)
        const figmaConfigRaw = localStorage.getItem('figma-config');
        const figmaConfig = figmaConfigRaw ? JSON.parse(figmaConfigRaw) : null;

        const githubConfigRaw = localStorage.getItem('github-config');
        const githubConfig = githubConfigRaw ? JSON.parse(githubConfigRaw) : null;

        setFigmaToken(col.figmaToken ?? figmaConfig?.token ?? '');
        setFigmaFileId(col.figmaFileId ?? figmaConfig?.fileKey ?? '');
        setGithubRepo(col.githubRepo ?? githubConfig?.repository ?? '');
        setGithubBranch(col.githubBranch ?? githubConfig?.branch ?? '');
        setGithubPath(col.githubPath ?? '');
        
        // Load GitHub token from localStorage (not stored in DB)
        const savedGithubToken = localStorage.getItem('github-token-settings') || githubConfig?.token || '';
        setGithubToken(savedGithubToken);
        
        setIsPlayground(col.isPlayground ?? false);
        setSandboxUrl(col.sandboxUrl ?? '');
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
      await saveToDb({ figmaToken, figmaFileId, githubRepo, githubBranch, githubPath, isPlayground, sandboxUrl });
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Note: githubToken is intentionally excluded — it's stored in localStorage only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figmaToken, figmaFileId, githubRepo, githubBranch, githubPath, isPlayground, sandboxUrl]);

  // Once loading finishes, mark mount as done so subsequent changes trigger auto-save
  useEffect(() => {
    if (!loading) {
      didMountRef.current = true;
    }
  }, [loading]);

  // Sync GitHub token to/from localStorage (separate from DB auto-save)
  useEffect(() => {
    if (githubToken) {
      localStorage.setItem('github-token-settings', githubToken);
    }
  }, [githubToken]);

  async function saveToDb(fields: {
    figmaToken: string;
    figmaFileId: string;
    githubRepo: string;
    githubBranch: string;
    githubPath: string;
    isPlayground: boolean;
    sandboxUrl: string;
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
          githubPath: fields.githubPath || null,
          isPlayground: fields.isPlayground,
          sandboxUrl: fields.sandboxUrl || null,
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
    saveToDb({ figmaToken: '', figmaFileId: '', githubRepo, githubBranch, githubPath, isPlayground, sandboxUrl });
  }

  function clearGithubFields() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGithubRepo('');
    setGithubBranch('');
    setGithubPath('');
    setSaveStatus('saving');
    saveToDb({ figmaToken, figmaFileId, githubRepo: '', githubBranch: '', githubPath: '', isPlayground, sandboxUrl });
  }

  // ── GitHub sync actions ────────────────────────────────────────────
  const loadBranches = async () => {
    if (!githubRepo || !githubToken) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    const cleanedRepo = cleanRepositoryName(githubRepo);
    if (!cleanedRepo) {
      showErrorToast('Invalid repository format');
      return;
    }

    try {
      const branches = await githubService.getBranches(githubToken, cleanedRepo);
      const branchNames = branches.map((branch) => branch.name);
      setAvailableBranches(branchNames);
    } catch (error) {
      console.error('Failed to load branches:', error);
      throw error;
    }
  };

  const handlePushToGitHub = async () => {
    if (!githubRepo || !githubToken) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    // Clean repository name (remove GitHub URL if present)
    const cleanedRepo = cleanRepositoryName(githubRepo);
    if (!cleanedRepo) {
      showErrorToast('Invalid repository format. Use: username/repository-name');
      return;
    }

    // Update state with cleaned repo name if it was modified
    if (cleanedRepo !== githubRepo) {
      setGithubRepo(cleanedRepo);
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with export:', error);
      if (availableBranches.length === 0 && githubBranch) {
        setAvailableBranches([githubBranch]);
      }
    }

    setDirectoryPickerMode('export');
    setShowDirectoryPicker(true);
  };

  const handlePullFromGitHub = async () => {
    if (!githubRepo || !githubToken) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    // Clean repository name (remove GitHub URL if present)
    const cleanedRepo = cleanRepositoryName(githubRepo);
    if (!cleanedRepo) {
      showErrorToast('Invalid repository format. Use: username/repository-name');
      return;
    }

    // Update state with cleaned repo name if it was modified
    if (cleanedRepo !== githubRepo) {
      setGithubRepo(cleanedRepo);
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with import:', error);
      if (availableBranches.length === 0 && githubBranch) {
        setAvailableBranches([githubBranch]);
      }
    }

    setDirectoryPickerMode('import');
    setShowDirectoryPicker(true);
  };

  // Helper: clean repository name by removing GitHub URLs
  function cleanRepositoryName(repo: string): string | null {
    let cleaned = repo.trim();
    
    // Remove GitHub URL prefixes
    if (cleaned.startsWith('https://github.com/')) {
      cleaned = cleaned.replace('https://github.com/', '');
    } else if (cleaned.startsWith('http://github.com/')) {
      cleaned = cleaned.replace('http://github.com/', '');
    } else if (cleaned.startsWith('github.com/')) {
      cleaned = cleaned.replace('github.com/', '');
    }
    
    // Remove trailing slashes or .git
    cleaned = cleaned.replace(/\.git$/, '').replace(/\/$/, '');
    
    // Validate format: must be username/repository
    if (!cleaned.includes('/') || cleaned.split('/').length !== 2) {
      return null;
    }
    
    return cleaned;
  }

  const handleDirectorySelect = async (selectedPath: string, selectedBranch: string) => {
    setShowDirectoryPicker(false);

    const isImportMode = directoryPickerMode === 'import';
    const cleanedRepo = cleanRepositoryName(githubRepo);
    
    if (!cleanedRepo) {
      showErrorToast('Invalid repository format');
      return;
    }

    try {
      if (directoryPickerMode === 'export') {
        // Export mode
        const response = await fetch('/api/export/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenSet: collectionTokens,
            repository: cleanedRepo,
            githubToken: githubToken,
            branch: selectedBranch,
            path: selectedPath,
          }),
        });

        if (response.ok) {
          showSuccessToast('Successfully pushed to GitHub!');
        } else {
          const error = await response.text();
          showErrorToast(`Push failed: ${error}`);
        }
      } else {
        // Import mode
        const response = await fetch('/api/import/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository: cleanedRepo,
            githubToken: githubToken,
            branch: selectedBranch,
            path: selectedPath,
          }),
        });

        if (response.ok) {
          const { tokenSet } = await response.json();
          
          // Update collection with imported tokens
          const updateRes = await fetch(`/api/collections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: tokenSet }),
          });

          if (updateRes.ok) {
            setCollectionTokens(tokenSet);
            showSuccessToast('Successfully pulled from GitHub!');
          } else {
            showErrorToast('Failed to save imported tokens');
          }
        } else {
          const error = await response.text();
          showErrorToast(`Pull failed: ${error}`);
        }
      }
    } catch (error) {
      showErrorToast(`${isImportMode ? 'Pull' : 'Push'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // ── Figma sync actions ─────────────────────────────────────────────
  const handlePushToFigma = () => {
    if (!figmaToken || !figmaFileId) {
      showErrorToast('Please configure Figma connection first');
      return;
    }
    setShowExportFigmaDialog(true);
  };

  const handlePullFromFigma = () => {
    if (!figmaToken || !figmaFileId) {
      showErrorToast('Please configure Figma connection first');
      return;
    }
    setShowImportFigmaDialog(true);
  };

  const handleFigmaImported = async (importedCollectionId: string, name: string) => {
    // Fetch the imported collection's tokens and update the current collection
    try {
      const res = await fetch(`/api/collections/${importedCollectionId}`);
      if (!res.ok) throw new Error('Failed to fetch imported collection');
      const data = await res.json();
      
      // Update current collection with imported tokens
      const updateRes = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: data.collection.tokens }),
      });

      if (updateRes.ok) {
        setCollectionTokens(data.collection.tokens);
        setShowImportFigmaDialog(false);
        showSuccessToast(`Successfully pulled "${name}" from Figma!`);
      } else {
        showErrorToast('Failed to save imported tokens');
      }
    } catch (err) {
      console.error('Failed to apply imported tokens:', err);
      showErrorToast('Failed to apply imported tokens');
    }
  };

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

            {/* Figma sync actions */}
            {canFigma && figmaToken && figmaFileId && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handlePushToFigma}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Push to Figma
                </Button>
                <Button
                  onClick={handlePullFromFigma}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Pull from Figma
                </Button>
              </div>
            )}
            
            {/* Show helper text when buttons are hidden */}
            {canFigma && (!figmaToken || !figmaFileId) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700">
                Fill in all Figma fields above to enable Push/Pull actions
              </div>
            )}
            
            {!canFigma && (figmaToken || figmaFileId) && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-700">
                You don't have Figma sync permissions for this collection
              </div>
            )}
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
                onBlur={(e) => {
                  // Auto-clean on blur if user pasted a full URL
                  const cleaned = cleanRepositoryName(e.target.value);
                  if (cleaned && cleaned !== e.target.value) {
                    setGithubRepo(cleaned);
                  }
                }}
                placeholder="org/repo"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: <code className="bg-gray-100 px-1 rounded">username/repository</code>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Tip: You can paste the full GitHub URL and it will be auto-cleaned to the correct format
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Token
              </label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxx..."
              />
              <div className="mt-1 space-y-1">
                <p className="text-xs text-gray-500">
                  Personal access token with <strong>repo</strong> scope permissions (stored in browser only, not in DB)
                </p>
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-900 font-medium">
                    How to create a token with correct permissions
                  </summary>
                  <div className="mt-2 pl-3 space-y-1 text-gray-600 bg-gray-50 p-2 rounded">
                    <p>1. Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-blue-600 hover:underline">github.com/settings/tokens</a></p>
                    <p>2. Click "Generate new token" → "Generate new token (classic)"</p>
                    <p>3. Name it (e.g., "Token Manager Access")</p>
                    <p>4. <strong>Required: Check the "repo" checkbox</strong> (gives full repo access)</p>
                    <p>5. Click "Generate token" at bottom</p>
                    <p>6. Copy the token (starts with ghp_) and paste it here</p>
                  </div>
                </details>
              </div>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Output Path
              </label>
              <Input
                type="text"
                value={githubPath}
                onChange={(e) => setGithubPath(e.target.value)}
                placeholder="tokens/ or design-system/tokens/"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional subdirectory path for token files. When pushing to GitHub, you'll be able to navigate existing directories or type a new path - GitHub will create any missing directories automatically.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Examples: <code className="bg-gray-100 px-1 rounded">tokens/</code>, <code className="bg-gray-100 px-1 rounded">design-system/tokens/</code>, <code className="bg-gray-100 px-1 rounded">src/styles/tokens/</code>
              </p>
            </div>

            {/* GitHub sync actions */}
            {canGitHub && githubRepo && githubBranch && githubToken && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handlePushToGitHub}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Push to GitHub
                </Button>
                <Button
                  onClick={handlePullFromGitHub}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Pull from GitHub
                </Button>
              </div>
            )}
            
            {/* Show helper text when buttons are hidden */}
            {canGitHub && (!githubRepo || !githubBranch || !githubToken) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-700">
                Fill in all GitHub fields above to enable Push/Pull actions
              </div>
            )}
            
            {!canGitHub && (githubRepo || githubBranch || githubToken) && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-700">
                You don't have GitHub sync permissions for this collection
              </div>
            )}
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

        {/* Live Preview Sandbox section */}
        <section>
          <div className="flex items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Live Preview Sandbox
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sandbox URL
              </label>
              <Input
                type="url"
                value={sandboxUrl}
                onChange={(e) => setSandboxUrl(e.target.value)}
                placeholder="https://stackblitz.com/edit/... or http://localhost:3000"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL to your live preview environment (Stackblitz, CodeSandbox, GitHub Codespaces, or localhost)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your sandbox must include a script to listen for token updates via PostMessage API. See documentation for integration instructions.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* GitHub Directory Picker Dialog */}
      {showDirectoryPicker && githubRepo && githubToken && (
        <GitHubDirectoryPicker
          githubToken={githubToken}
          repository={cleanRepositoryName(githubRepo) || githubRepo}
          branch={githubBranch}
          onSelect={handleDirectorySelect}
          onCancel={() => setShowDirectoryPicker(false)}
          mode={directoryPickerMode}
          defaultPath={githubPath}
          availableBranches={availableBranches}
        />
      )}

      {/* Figma Export Dialog */}
      <ExportToFigmaDialog
        isOpen={showExportFigmaDialog}
        onClose={() => setShowExportFigmaDialog(false)}
        tokenSet={collectionTokens}
        loadedCollectionId={id}
      />

      {/* Figma Import Dialog */}
      <ImportFromFigmaDialog
        isOpen={showImportFigmaDialog}
        onClose={() => setShowImportFigmaDialog(false)}
        onImported={handleFigmaImported}
      />
    </div>
  );
}
