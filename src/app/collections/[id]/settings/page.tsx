'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/context/PermissionsContext';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { GitHubDirectoryPicker } from '@/components/github/GitHubDirectoryPicker';
import { ExportToFigmaDialog } from '@/components/figma/ExportToFigmaDialog';
import { ImportFromFigmaDialog } from '@/components/figma/ImportFromFigmaDialog';
import { githubService } from '@/services';
import { Copy, Check } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type FigmaConnectionPhase = 'idle' | 'testing' | 'ok' | 'error';

interface FigmaConnectionVerify {
  phase: FigmaConnectionPhase;
  message: string;
  /** Credentials that produced the last ok/error; used to invalidate after edits */
  resultFingerprint: string | null;
}

type IntegrationDisplayStatus =
  | { kind: 'incomplete' }
  | { kind: 'unverified' }
  | { kind: 'testing' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string };

function figmaCredentialsFingerprint(token: string, fileId: string): string {
  return `${token.trim()}|${fileId.trim()}`;
}

/** Pill label only — full messages render in `IntegrationStatusDetail` */
function IntegrationStatusBadge({ status }: { status: IntegrationDisplayStatus }) {
  if (status.kind === 'incomplete') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-muted" aria-hidden />
        Not configured
      </span>
    );
  }
  if (status.kind === 'unverified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full border border-warning">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden />
        Not verified
      </span>
    );
  }
  if (status.kind === 'testing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary">
        <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden />
        Testing…
      </span>
    );
  }
  if (status.kind === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-full border border-success">
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" aria-hidden />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full border border-destructive">
      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" aria-hidden />
      Failed
    </span>
  );
}

function IntegrationStatusDetail({ status }: { status: IntegrationDisplayStatus }) {
  if (status.kind === 'ok' && status.message.trim()) {
    return (
      <p className="text-xs text-success bg-success/10 border border-success rounded-md px-3 py-2 leading-relaxed">
        {status.message}
      </p>
    );
  }
  if (status.kind === 'error' && status.message.trim()) {
    return (
      <p className="text-xs text-destructive bg-destructive/10 border border-destructive rounded-md px-3 py-2 leading-relaxed whitespace-pre-wrap">
        {status.message}
      </p>
    );
  }
  return null;
}

interface SettingsPageProps {
  params: { id: string };
}

export default function CollectionSettingsPage({ params }: SettingsPageProps) {
  const { id } = params;
  const { isAdmin, canGitHub, canFigma, canPublishNpm, canManageVersions } = usePermissions();

  const [collectionName, setCollectionName] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [figmaFileId, setFigmaFileId] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubPath, setGithubPath] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [npmPackageName, setNpmPackageName] = useState('');
  const [npmRegistryUrl, setNpmRegistryUrl] = useState('');
  const [npmTokenInput, setNpmTokenInput] = useState('');
  const [npmTokenConfigured, setNpmTokenConfigured] = useState(false);
  const [npmWhoamiLoading, setNpmWhoamiLoading] = useState(false);
  const [isPlayground, setIsPlayground] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [collectionTokens, setCollectionTokens] = useState<Record<string, unknown>>({});

  // GitHub/Figma sync dialogs
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerMode, setDirectoryPickerMode] = useState<'export' | 'import'>('export');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showExportFigmaDialog, setShowExportFigmaDialog] = useState(false);
  const [showImportFigmaDialog, setShowImportFigmaDialog] = useState(false);
  const [embedScriptCopied, setEmbedScriptCopied] = useState(false);
  const [figmaVerify, setFigmaVerify] = useState<FigmaConnectionVerify>({
    phase: 'idle',
    message: '',
    resultFingerprint: null,
  });
  const [githubVerify, setGithubVerify] = useState<FigmaConnectionVerify>({
    phase: 'idle',
    message: '',
    resultFingerprint: null,
  });

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
        setNpmPackageName(col.npmPackageName ?? '');
        setNpmRegistryUrl(col.npmRegistryUrl ?? '');
        setNpmTokenConfigured(col.npmTokenConfigured ?? false);
        setNpmTokenInput('');
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
      await saveToDb({
        figmaToken,
        figmaFileId,
        githubRepo,
        githubBranch,
        githubPath,
        isPlayground,
        npmPackageName,
        npmRegistryUrl,
      });
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Note: githubToken is intentionally excluded — it's stored in localStorage only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figmaToken, figmaFileId, githubRepo, githubBranch, githubPath, isPlayground, npmPackageName, npmRegistryUrl]);

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
    npmPackageName?: string;
    npmRegistryUrl?: string;
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
          npmPackageName: fields.npmPackageName?.trim() || null,
          npmRegistryUrl: fields.npmRegistryUrl?.trim() || null,
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
    setFigmaVerify({ phase: 'idle', message: '', resultFingerprint: null });
    setSaveStatus('saving');
    saveToDb({
      figmaToken: '',
      figmaFileId: '',
      githubRepo,
      githubBranch,
      githubPath,
      isPlayground,
      npmPackageName,
      npmRegistryUrl,
    });
  }

  function getFigmaDisplayStatus(): IntegrationDisplayStatus {
    const t = figmaToken.trim();
    if (!t) {
      return { kind: 'incomplete' };
    }
    if (figmaVerify.phase === 'testing') {
      return { kind: 'testing' };
    }
    const fp = figmaCredentialsFingerprint(figmaToken, figmaFileId);
    if (figmaVerify.phase === 'ok' && figmaVerify.resultFingerprint === fp) {
      return { kind: 'ok', message: figmaVerify.message };
    }
    if (figmaVerify.phase === 'error' && figmaVerify.resultFingerprint === fp) {
      return { kind: 'error', message: figmaVerify.message };
    }
    return { kind: 'unverified' };
  }

  const handleTestFigmaConnection = async () => {
    const token = figmaToken.trim();
    if (!token) {
      showErrorToast('Enter your Figma personal access token first');
      return;
    }
    setFigmaVerify({ phase: 'testing', message: '', resultFingerprint: null });
    const fp = figmaCredentialsFingerprint(figmaToken, figmaFileId);
    try {
      const testRes = await fetch(`/api/figma/test?token=${encodeURIComponent(token)}`);
      const testData = (await testRes.json().catch(() => ({}))) as { error?: string; email?: string };
      if (!testRes.ok) {
        const msg =
          typeof testData.error === 'string' ? testData.error : 'Invalid or expired token';
        setFigmaVerify({ phase: 'error', message: msg, resultFingerprint: fp });
        showErrorToast(msg);
        return;
      }
      const email = typeof testData.email === 'string' ? testData.email : '';
      const fileId = figmaFileId.trim();
      if (!fileId) {
        const msg = email
          ? `Token OK · ${email} — add file ID to verify file`
          : 'Token OK — add file ID to verify file';
        setFigmaVerify({ phase: 'ok', message: msg, resultFingerprint: fp });
        showSuccessToast('Figma token is valid');
        return;
      }
      const colRes = await fetch(
        `/api/figma/collections?token=${encodeURIComponent(token)}&fileKey=${encodeURIComponent(fileId)}`
      );
      const colData = (await colRes.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        collections?: unknown[];
      };
      if (!colRes.ok) {
        const msg =
          typeof colData.error === 'string'
            ? colData.error
            : 'Cannot access file — check file ID and permissions';
        const hint = typeof colData.hint === 'string' ? colData.hint : '';
        const full = hint ? `${msg} ${hint}` : msg;
        setFigmaVerify({ phase: 'error', message: full, resultFingerprint: fp });
        showErrorToast(full.length > 180 ? `${msg} (see badge for details)` : full);
        return;
      }
      const n = Array.isArray(colData.collections) ? colData.collections.length : 0;
      const msg = email
        ? `Connected · ${email} · ${n} variable collection(s)`
        : `Connected · ${n} variable collection(s)`;
      setFigmaVerify({ phase: 'ok', message: msg, resultFingerprint: fp });
      showSuccessToast('Figma connection verified');
    } catch {
      setFigmaVerify({
        phase: 'error',
        message: 'Network error',
        resultFingerprint: fp,
      });
      showErrorToast('Could not reach the server');
    }
  };

  function clearGithubFields() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setGithubRepo('');
    setGithubBranch('');
    setGithubPath('');
    setGithubVerify({ phase: 'idle', message: '', resultFingerprint: null });
    setSaveStatus('saving');
    saveToDb({
      figmaToken,
      figmaFileId,
      githubRepo: '',
      githubBranch: '',
      githubPath: '',
      isPlayground,
      npmPackageName,
      npmRegistryUrl,
    });
  }

  async function saveNpmTokenToServer() {
    const trimmed = npmTokenInput.trim();
    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npmToken: trimmed || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
      }
      const data = await res.json();
      setNpmTokenConfigured(data.collection?.npmTokenConfigured ?? false);
      setNpmTokenInput('');
      showSuccessToast(trimmed ? 'NPM token saved' : 'NPM token cleared');
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Failed to save NPM token');
    }
  }

  async function testNpmRegistry() {
    setNpmWhoamiLoading(true);
    try {
      const body: { npmToken?: string } = {};
      if (npmTokenInput.trim()) {
        body.npmToken = npmTokenInput.trim();
      }
      const res = await fetch(`/api/collections/${id}/npm/whoami`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Registry check failed');
      }
      showSuccessToast(
        typeof data.username === 'string' ? `Registry OK · ${data.username}` : 'Registry OK'
      );
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Registry check failed');
    } finally {
      setNpmWhoamiLoading(false);
    }
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

  function githubCredentialsFingerprint(token: string, repo: string): string {
    const c = cleanRepositoryName(repo) ?? repo.trim();
    return `${token.trim()}|${c}`;
  }

  function getGithubDisplayStatus(): IntegrationDisplayStatus {
    const t = githubToken.trim();
    if (!t) {
      return { kind: 'incomplete' };
    }
    if (githubVerify.phase === 'testing') {
      return { kind: 'testing' };
    }
    const fp = githubCredentialsFingerprint(githubToken, githubRepo);
    if (githubVerify.phase === 'ok' && githubVerify.resultFingerprint === fp) {
      return { kind: 'ok', message: githubVerify.message };
    }
    if (githubVerify.phase === 'error' && githubVerify.resultFingerprint === fp) {
      return { kind: 'error', message: githubVerify.message };
    }
    return { kind: 'unverified' };
  }

  const handleTestGithubConnection = async () => {
    const token = githubToken.trim();
    if (!token) {
      showErrorToast('Enter your GitHub personal access token first');
      return;
    }
    setGithubVerify({ phase: 'testing', message: '', resultFingerprint: null });
    const fp = githubCredentialsFingerprint(githubToken, githubRepo);
    const trimmedRepo = githubRepo.trim();
    const cleaned = cleanRepositoryName(githubRepo);
    const repoForTest =
      cleaned ??
      (/^[\w.-]+\/[\w.-]+$/.test(trimmedRepo) ? trimmedRepo : null);

    try {
      const qs = new URLSearchParams({ githubToken: token });
      if (repoForTest) {
        qs.set('repository', repoForTest);
      }

      const res = await fetch(`/api/github/test?${qs.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'GitHub connection failed';
        const hint = typeof data.hint === 'string' ? data.hint : '';
        const full = hint ? `${msg} ${hint}` : msg;
        setGithubVerify({ phase: 'error', message: full, resultFingerprint: fp });
        showErrorToast(full.length > 180 ? `${msg} (see badge for details)` : full);
        return;
      }

      const msg =
        typeof data.message === 'string'
          ? data.message
          : 'GitHub connection verified';
      setGithubVerify({ phase: 'ok', message: msg, resultFingerprint: fp });
      showSuccessToast(
        repoForTest
          ? 'GitHub token and repository verified'
          : 'GitHub token verified — add owner/repo to check repository access'
      );
    } catch {
      setGithubVerify({
        phase: 'error',
        message: 'Network error',
        resultFingerprint: fp,
      });
      showErrorToast('Could not reach the server');
    }
  };

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

  // Copy embed script to clipboard
  const copyEmbedScript = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const scriptTag = `<script src="${origin}/embed/${id}/tokens.js"></script>`;
    
    try {
      await navigator.clipboard.writeText(scriptTag);
      setEmbedScriptCopied(true);
      setTimeout(() => setEmbedScriptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Heading row */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <h1 className="text-xl font-semibold text-foreground">
          Settings: {collectionName}
        </h1>
        {(canManageVersions || canPublishNpm) && (
          <Link
            href={`/collections/${id}/versions`}
            className="text-sm text-primary hover:underline"
          >
            Versions &amp; NPM publish
          </Link>
        )}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <span className="inline-block w-3 h-3 border-2 border-border border-t-transparent rounded-full animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
            <span className="inline-block w-2 h-2 bg-success rounded-full" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
            <span className="inline-block w-2 h-2 bg-destructive rounded-full" />
            Error saving
          </span>
        )}
      </div>

      <div className="space-y-8">
        {/* Figma section */}
        <section>
          <div className="flex flex-wrap items-center gap-2 gap-y-2 mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Figma
            </h2>
            <IntegrationStatusBadge status={getFigmaDisplayStatus()} />
            <div className="flex-1 min-w-[0.5rem]" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-primary border-primary hover:bg-primary/10"
              onClick={handleTestFigmaConnection}
              disabled={!figmaToken.trim() || figmaVerify.phase === 'testing'}
            >
              {figmaVerify.phase === 'testing' ? 'Testing…' : 'Test connection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={clearFigmaFields}
              disabled={!figmaToken.trim() && !figmaFileId.trim()}
            >
              Reset
            </Button>
          </div>
          <div className="mb-3 space-y-2">
            <IntegrationStatusDetail status={getFigmaDisplayStatus()} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Test checks your token and file access. Reset clears saved token and file ID for this collection.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Figma Token
              </label>
              <Input
                type="password"
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
                placeholder="figd_xxxx..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Generate at figma.com &rarr; Account Settings &rarr; Personal access tokens
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Figma File ID
              </label>
              <Input
                type="text"
                value={figmaFileId}
                onChange={(e) => setFigmaFileId(e.target.value)}
                placeholder="ABC123..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                The file key from your Figma file URL (figma.com/design/<strong>FILE_KEY</strong>/...). If the token
                test passes but you see <strong>404</strong> here, the key or file access is wrong — not the token.
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
              <div className="bg-primary/10 border border-primary rounded-md p-3 text-xs text-primary">
                Fill in all Figma fields above to enable Push/Pull actions
              </div>
            )}
            
            {!canFigma && (figmaToken || figmaFileId) && (
              <div className="bg-warning/10 border border-warning rounded-md p-3 text-xs text-warning">
                You don't have Figma sync permissions for this collection
              </div>
            )}
          </div>
        </section>

        {/* GitHub section */}
        <section>
          <div className="flex flex-wrap items-center gap-2 gap-y-2 mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              GitHub
            </h2>
            <IntegrationStatusBadge status={getGithubDisplayStatus()} />
            <div className="flex-1 min-w-[0.5rem]" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-primary border-primary hover:bg-primary/10"
              onClick={handleTestGithubConnection}
              disabled={!githubToken.trim() || githubVerify.phase === 'testing'}
            >
              {githubVerify.phase === 'testing' ? 'Testing…' : 'Test connection'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={clearGithubFields}
              disabled={!githubRepo.trim() && !githubBranch.trim() && !githubPath.trim()}
            >
              Reset
            </Button>
          </div>
          <div className="mb-3 space-y-2">
            <IntegrationStatusDetail status={getGithubDisplayStatus()} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Test checks your token and (when owner/repo is set) repository access. Token stays in this browser only.
            Reset clears saved repo, branch, and path for this collection.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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
              <p className="text-xs text-muted-foreground mt-1">
                Format: <code className="bg-muted px-1 rounded">username/repository</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: You can paste the full GitHub URL and it will be auto-cleaned to the correct format
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                GitHub Token
              </label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxx..."
              />
              <div className="mt-1 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Personal access token with <strong>repo</strong> scope permissions (stored in browser only, not in DB)
                </p>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground font-medium">
                    How to create a token with correct permissions
                  </summary>
                  <div className="mt-2 pl-3 space-y-1 text-muted-foreground bg-muted/50 p-2 rounded">
                    <p>1. Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-primary hover:underline">github.com/settings/tokens</a></p>
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
              <label className="block text-sm font-medium text-foreground mb-1">
                GitHub Branch
              </label>
              <Input
                type="text"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                placeholder="main"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The branch to read tokens from (e.g. <code className="bg-muted px-1 rounded">main</code>)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Default Output Path
              </label>
              <Input
                type="text"
                value={githubPath}
                onChange={(e) => setGithubPath(e.target.value)}
                placeholder="tokens/ or design-system/tokens/"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional subdirectory path for token files. When pushing to GitHub, you'll be able to navigate existing directories or type a new path - GitHub will create any missing directories automatically.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Examples: <code className="bg-muted px-1 rounded">tokens/</code>, <code className="bg-muted px-1 rounded">design-system/tokens/</code>, <code className="bg-muted px-1 rounded">src/styles/tokens/</code>
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
              <div className="bg-primary/10 border border-primary rounded-md p-3 text-xs text-primary">
                Fill in all GitHub fields above to enable Push/Pull actions
              </div>
            )}
            
            {!canGitHub && (githubRepo || githubBranch || githubToken) && (
              <div className="bg-warning/10 border border-warning rounded-md p-3 text-xs text-warning">
                You don't have GitHub sync permissions for this collection
              </div>
            )}
          </div>
        </section>

        {/* NPM registry (MongoDB — encrypted token server-side) */}
        {(canPublishNpm || canManageVersions) && (
          <section>
            <div className="flex items-center mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                NPM registry
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Used to publish built token packages from the{' '}
              <Link href={`/collections/${id}/versions`} className="text-primary hover:underline">
                Versions
              </Link>{' '}
              page. Scoped packages on npmjs default to <code className="bg-muted px-1 rounded">access=public</code>.
              For GitHub Packages, set the registry URL to{' '}
              <code className="bg-muted px-1 rounded">https://npm.pkg.github.com/OWNER</code> and use a token with{' '}
              <code className="bg-muted px-1 rounded">write:packages</code>.
            </p>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Package name</label>
                <Input
                  type="text"
                  value={npmPackageName}
                  onChange={(e) => setNpmPackageName(e.target.value)}
                  placeholder="@scope/my-tokens"
                  disabled={!canPublishNpm}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Registry URL</label>
                <Input
                  type="text"
                  value={npmRegistryUrl}
                  onChange={(e) => setNpmRegistryUrl(e.target.value)}
                  placeholder="https://registry.npmjs.org/"
                  disabled={!canPublishNpm}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  NPM token
                  {npmTokenConfigured && (
                    <span className="ml-2 text-xs font-normal text-success">(saved)</span>
                  )}
                </label>
                <Input
                  type="password"
                  value={npmTokenInput}
                  onChange={(e) => setNpmTokenInput(e.target.value)}
                  placeholder={
                    npmTokenConfigured ? 'Enter new token to replace' : 'npm automation token'
                  }
                  disabled={!canPublishNpm}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stored encrypted on the server (requires <code className="bg-muted px-1 rounded">ENCRYPTION_KEY</code>).
                  Leave empty and save to remove.
                </p>
              </div>
              {canPublishNpm && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={saveNpmTokenToServer}>
                    Save token
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={testNpmRegistry}
                    disabled={npmWhoamiLoading}
                  >
                    {npmWhoamiLoading ? 'Testing…' : 'Test registry'}
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Playground section - Admin only */}
        {isAdmin && (
          <section>
            <div className="flex items-center mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Playground Mode
              </h2>
            </div>

            <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning rounded-lg">
              <Checkbox
                id="playground-toggle"
                checked={isPlayground}
                onCheckedChange={(checked) => setIsPlayground(checked === true)}
              />
              <div className="flex-1">
                <label
                  htmlFor="playground-toggle"
                  className="block text-sm font-medium text-foreground cursor-pointer"
                >
                  Playground Collection
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, all edits are session-based (stored in browser memory). Changes are not saved to the database and will be lost when the browser is closed. Useful for demos, workshops, and experimentation.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Embed Script section */}
        <section>
          <div className="flex items-center mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Embed in Your Project
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add this script tag to your HTML to inject tokens as CSS variables. Works with any framework or vanilla HTML.
            </p>

            <div className="relative">
              <pre className="bg-foreground text-background p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/embed/${id}/tokens.js"></script>`}</code>
              </pre>
              <Button
                onClick={copyEmbedScript}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                {embedScriptCopied ? (
                  <>
                    <Check size={16} className="mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} className="mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="bg-primary/10 border border-primary rounded-md p-3 space-y-2">
              <p className="text-xs font-medium text-primary">Usage:</p>
              <ol className="text-xs text-primary space-y-1 list-decimal list-inside">
                <li>Copy the script tag above</li>
                <li>Paste it into your HTML <code className="bg-primary/15 px-1 rounded">&lt;head&gt;</code> section</li>
                <li>Tokens load automatically as CSS variables (e.g., <code className="bg-primary/15 px-1 rounded">--token-color-primary</code>)</li>
                <li>Refresh your page to see token updates</li>
              </ol>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-foreground font-medium hover:text-foreground">
                Using a specific theme?
              </summary>
              <div className="mt-2 p-3 bg-muted/50 rounded space-y-2">
                <p className="text-xs text-muted-foreground">
                  Add <code className="bg-card px-1 py-0.5 rounded border">?theme=THEME_ID</code> to the script URL:
                </p>
                <pre className="bg-foreground text-background p-3 rounded text-xs overflow-x-auto">
                  <code>{`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/embed/${id}/tokens.js?theme=YOUR_THEME_ID"></script>`}</code>
                </pre>
                <p className="text-xs text-muted-foreground">
                  Find theme IDs in the Tokens page theme selector
                </p>
              </div>
            </details>
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
        collectionFigmaToken={figmaToken || null}
        collectionFigmaFileId={figmaFileId || null}
      />

      {/* Figma Import Dialog */}
      <ImportFromFigmaDialog
        isOpen={showImportFigmaDialog}
        onClose={() => setShowImportFigmaDialog(false)}
        onImported={handleFigmaImported}
        collectionFigmaToken={figmaToken || null}
        collectionFigmaFileId={figmaFileId || null}
      />
    </div>
  );
}
