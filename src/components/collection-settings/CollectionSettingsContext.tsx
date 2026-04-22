'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePermissions } from '@/context/PermissionsContext';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { githubService } from '@/services';
import {
  figmaCredentialsFingerprint,
  type IntegrationDisplayStatus,
} from '@/components/collection-settings/integration-ui';
import {
  cleanRepositoryName,
  githubCredentialsFingerprint,
} from '@/components/collection-settings/github-utils';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type FigmaConnectionPhase = 'idle' | 'testing' | 'ok' | 'error';

interface FigmaConnectionVerify {
  phase: FigmaConnectionPhase;
  message: string;
  resultFingerprint: string | null;
}

export interface CollectionSettingsContextValue {
  collectionId: string;
  loading: boolean;
  collectionName: string;
  saveStatus: SaveStatus;

  figmaToken: string;
  setFigmaToken: (v: string) => void;
  figmaFileId: string;
  setFigmaFileId: (v: string) => void;
  figmaVerify: FigmaConnectionVerify;
  getFigmaDisplayStatus: () => IntegrationDisplayStatus;
  handleTestFigmaConnection: () => Promise<void>;
  clearFigmaFields: () => void;
  handlePushToFigma: () => void;
  handlePullFromFigma: () => void;
  showExportFigmaDialog: boolean;
  setShowExportFigmaDialog: (v: boolean) => void;
  showImportFigmaDialog: boolean;
  setShowImportFigmaDialog: (v: boolean) => void;
  handleFigmaImported: (importedCollectionId: string, name: string) => Promise<void>;
  collectionTokens: Record<string, unknown>;
  setCollectionTokens: (v: Record<string, unknown>) => void;

  githubRepo: string;
  setGithubRepo: (v: string) => void;
  githubBranch: string;
  setGithubBranch: (v: string) => void;
  githubPath: string;
  setGithubPath: (v: string) => void;
  githubToken: string;
  setGithubToken: (v: string) => void;
  githubVerify: FigmaConnectionVerify;
  getGithubDisplayStatus: () => IntegrationDisplayStatus;
  handleTestGithubConnection: () => Promise<void>;
  clearGithubFields: () => void;
  handlePushToGitHub: () => Promise<void>;
  handlePullFromGitHub: () => Promise<void>;
  showDirectoryPicker: boolean;
  setShowDirectoryPicker: (v: boolean) => void;
  directoryPickerMode: 'export' | 'import';
  availableBranches: string[];
  handleDirectorySelect: (selectedPath: string, selectedBranch: string) => Promise<void>;
  cleanRepositoryName: typeof cleanRepositoryName;

  npmPackageName: string;
  setNpmPackageName: (v: string) => void;
  npmRegistryUrl: string;
  setNpmRegistryUrl: (v: string) => void;
  npmTokenInput: string;
  setNpmTokenInput: (v: string) => void;
  npmTokenConfigured: boolean;
  npmWhoamiLoading: boolean;
  saveNpmTokenToServer: () => Promise<void>;
  testNpmRegistry: () => Promise<void>;

  isPlayground: boolean;
  setIsPlayground: (v: boolean) => void;

  embedScriptCopied: boolean;
  copyEmbedScript: () => Promise<void>;

  canFigma: boolean;
  canGitHub: boolean;
  canPublishNpm: boolean;
  canManageVersions: boolean;
  isAdmin: boolean;
}

const CollectionSettingsContext = createContext<CollectionSettingsContextValue | null>(null);

export function CollectionSettingsProvider({
  collectionId,
  children,
}: {
  collectionId: string;
  children: React.ReactNode;
}) {
  const { isAdmin, canGitHub, canFigma, canPublishNpm, canManageVersions } = usePermissions();
  const id = collectionId;

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

  useEffect(() => {
    async function loadCollection() {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) throw new Error('Failed to fetch collection');
        const data = await res.json();
        const col = data.collection;

        setCollectionName(col.name ?? '');
        setCollectionTokens(col.tokens ?? {});

        const figmaConfigRaw = localStorage.getItem('figma-config');
        const figmaConfig = figmaConfigRaw ? JSON.parse(figmaConfigRaw) : null;

        const githubConfigRaw = localStorage.getItem('github-config');
        const githubConfig = githubConfigRaw ? JSON.parse(githubConfigRaw) : null;

        setFigmaToken(col.figmaToken ?? figmaConfig?.token ?? '');
        setFigmaFileId(col.figmaFileId ?? figmaConfig?.fileKey ?? '');
        setGithubRepo(col.githubRepo ?? githubConfig?.repository ?? '');
        setGithubBranch(col.githubBranch ?? githubConfig?.branch ?? '');
        setGithubPath(col.githubPath ?? '');

        const savedGithubToken =
          localStorage.getItem('github-token-settings') || githubConfig?.token || '';
        setGithubToken(savedGithubToken);

        setIsPlayground(col.isPlayground ?? false);
        setNpmPackageName(col.npmPackageName ?? '');
        setNpmRegistryUrl(col.npmRegistryUrl ?? '');
        setNpmTokenConfigured(col.npmTokenConfigured ?? false);
        setNpmTokenInput('');
      } catch (err) {
        console.error('[CollectionSettingsProvider] Failed to load collection:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCollection();
  }, [id]);

  const saveToDb = useCallback(
    async (fields: {
      figmaToken: string;
      figmaFileId: string;
      githubRepo: string;
      githubBranch: string;
      githubPath: string;
      isPlayground: boolean;
      npmPackageName?: string;
      npmRegistryUrl?: string;
    }) => {
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
        console.error('[CollectionSettingsProvider] Auto-save failed:', err);
        setSaveStatus('error');
      }
    },
    [id]
  );

  useEffect(() => {
    if (!didMountRef.current) {
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
  }, [
    figmaToken,
    figmaFileId,
    githubRepo,
    githubBranch,
    githubPath,
    isPlayground,
    npmPackageName,
    npmRegistryUrl,
  ]);

  useEffect(() => {
    if (!loading) {
      didMountRef.current = true;
    }
  }, [loading]);

  useEffect(() => {
    if (githubToken) {
      localStorage.setItem('github-token-settings', githubToken);
    }
  }, [githubToken]);

  const clearFigmaFields = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
  }, [
    githubRepo,
    githubBranch,
    githubPath,
    isPlayground,
    npmPackageName,
    npmRegistryUrl,
    saveToDb,
  ]);

  const getFigmaDisplayStatus = useCallback((): IntegrationDisplayStatus => {
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
  }, [figmaToken, figmaFileId, figmaVerify]);

  const handleTestFigmaConnection = useCallback(async () => {
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
        const msg = typeof testData.error === 'string' ? testData.error : 'Invalid or expired token';
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
  }, [figmaToken, figmaFileId]);

  const clearGithubFields = useCallback(() => {
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
  }, [figmaToken, figmaFileId, isPlayground, npmPackageName, npmRegistryUrl, saveToDb]);

  const saveNpmTokenToServer = useCallback(async () => {
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
  }, [id, npmTokenInput]);

  const testNpmRegistry = useCallback(async () => {
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
  }, [id, npmTokenInput]);

  const loadBranches = useCallback(async () => {
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
  }, [githubRepo, githubToken]);

  const handlePushToGitHub = useCallback(async () => {
    if (!githubRepo || !githubToken) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    const cleanedRepo = cleanRepositoryName(githubRepo);
    if (!cleanedRepo) {
      showErrorToast('Invalid repository format. Use: username/repository-name');
      return;
    }

    if (cleanedRepo !== githubRepo) {
      setGithubRepo(cleanedRepo);
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with export:', error);
      setAvailableBranches((prev) => (prev.length === 0 && githubBranch ? [githubBranch] : prev));
    }

    setDirectoryPickerMode('export');
    setShowDirectoryPicker(true);
  }, [githubRepo, githubToken, loadBranches, githubBranch]);

  const handlePullFromGitHub = useCallback(async () => {
    if (!githubRepo || !githubToken) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    const cleanedRepo = cleanRepositoryName(githubRepo);
    if (!cleanedRepo) {
      showErrorToast('Invalid repository format. Use: username/repository-name');
      return;
    }

    if (cleanedRepo !== githubRepo) {
      setGithubRepo(cleanedRepo);
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with import:', error);
      setAvailableBranches((prev) => (prev.length === 0 && githubBranch ? [githubBranch] : prev));
    }

    setDirectoryPickerMode('import');
    setShowDirectoryPicker(true);
  }, [githubRepo, githubToken, loadBranches, githubBranch]);

  const getGithubDisplayStatus = useCallback((): IntegrationDisplayStatus => {
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
  }, [githubToken, githubRepo, githubVerify]);

  const handleTestGithubConnection = useCallback(async () => {
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
      cleaned ?? (/^[\w.-]+\/[\w.-]+$/.test(trimmedRepo) ? trimmedRepo : null);

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
        typeof data.message === 'string' ? data.message : 'GitHub connection verified';
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
  }, [githubToken, githubRepo]);

  const handleDirectorySelect = useCallback(
    async (selectedPath: string, selectedBranch: string) => {
      setShowDirectoryPicker(false);

      const isImportMode = directoryPickerMode === 'import';
      const cleanedRepo = cleanRepositoryName(githubRepo);

      if (!cleanedRepo) {
        showErrorToast('Invalid repository format');
        return;
      }

      try {
        if (directoryPickerMode === 'export') {
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
        showErrorToast(
          `${isImportMode ? 'Pull' : 'Push'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [directoryPickerMode, githubRepo, githubToken, collectionTokens, id]
  );

  const handlePushToFigma = useCallback(() => {
    if (!figmaToken || !figmaFileId) {
      showErrorToast('Please configure Figma connection first');
      return;
    }
    setShowExportFigmaDialog(true);
  }, [figmaToken, figmaFileId]);

  const handlePullFromFigma = useCallback(() => {
    if (!figmaToken || !figmaFileId) {
      showErrorToast('Please configure Figma connection first');
      return;
    }
    setShowImportFigmaDialog(true);
  }, [figmaToken, figmaFileId]);

  const handleFigmaImported = useCallback(
    async (importedCollectionId: string, name: string) => {
      try {
        const res = await fetch(`/api/collections/${importedCollectionId}`);
        if (!res.ok) throw new Error('Failed to fetch imported collection');
        const data = await res.json();

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
    },
    [id]
  );

  const copyEmbedScript = useCallback(async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const scriptTag = `<script src="${origin}/embed/${id}/tokens.js"></script>`;

    try {
      await navigator.clipboard.writeText(scriptTag);
      setEmbedScriptCopied(true);
      setTimeout(() => setEmbedScriptCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [id]);

  const value = useMemo<CollectionSettingsContextValue>(
    () => ({
      collectionId: id,
      loading,
      collectionName,
      saveStatus,
      figmaToken,
      setFigmaToken,
      figmaFileId,
      setFigmaFileId,
      figmaVerify,
      getFigmaDisplayStatus,
      handleTestFigmaConnection,
      clearFigmaFields,
      handlePushToFigma,
      handlePullFromFigma,
      showExportFigmaDialog,
      setShowExportFigmaDialog,
      showImportFigmaDialog,
      setShowImportFigmaDialog,
      handleFigmaImported,
      collectionTokens,
      setCollectionTokens,
      githubRepo,
      setGithubRepo,
      githubBranch,
      setGithubBranch,
      githubPath,
      setGithubPath,
      githubToken,
      setGithubToken,
      githubVerify,
      getGithubDisplayStatus,
      handleTestGithubConnection,
      clearGithubFields,
      handlePushToGitHub,
      handlePullFromGitHub,
      showDirectoryPicker,
      setShowDirectoryPicker,
      directoryPickerMode,
      availableBranches,
      handleDirectorySelect,
      cleanRepositoryName,
      npmPackageName,
      setNpmPackageName,
      npmRegistryUrl,
      setNpmRegistryUrl,
      npmTokenInput,
      setNpmTokenInput,
      npmTokenConfigured,
      npmWhoamiLoading,
      saveNpmTokenToServer,
      testNpmRegistry,
      isPlayground,
      setIsPlayground,
      embedScriptCopied,
      copyEmbedScript,
      canFigma,
      canGitHub,
      canPublishNpm,
      canManageVersions,
      isAdmin,
    }),
    [
      id,
      loading,
      collectionName,
      saveStatus,
      figmaToken,
      figmaFileId,
      figmaVerify,
      getFigmaDisplayStatus,
      handleTestFigmaConnection,
      clearFigmaFields,
      handlePushToFigma,
      handlePullFromFigma,
      showExportFigmaDialog,
      showImportFigmaDialog,
      handleFigmaImported,
      collectionTokens,
      githubRepo,
      githubBranch,
      githubPath,
      githubToken,
      githubVerify,
      getGithubDisplayStatus,
      handleTestGithubConnection,
      clearGithubFields,
      handlePushToGitHub,
      handlePullFromGitHub,
      showDirectoryPicker,
      directoryPickerMode,
      availableBranches,
      handleDirectorySelect,
      npmPackageName,
      npmRegistryUrl,
      npmTokenInput,
      npmTokenConfigured,
      npmWhoamiLoading,
      saveNpmTokenToServer,
      testNpmRegistry,
      isPlayground,
      embedScriptCopied,
      copyEmbedScript,
      canFigma,
      canGitHub,
      canPublishNpm,
      canManageVersions,
      isAdmin,
    ]
  );

  return (
    <CollectionSettingsContext.Provider value={value}>{children}</CollectionSettingsContext.Provider>
  );
}

export function useCollectionSettings(): CollectionSettingsContextValue {
  const ctx = useContext(CollectionSettingsContext);
  if (!ctx) {
    throw new Error('useCollectionSettings must be used within CollectionSettingsProvider');
  }
  return ctx;
}
