'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  Sun,
  Moon,
  View,
  Download,
  OverflowMenuVertical,
  Chat,
  Close,
} from '@carbon/icons-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { SaveCollectionDialog } from '@/components/collections/SaveCollectionDialog';
import { TokenGeneratorForm } from '@/components/tokens/TokenGeneratorForm';
import { SourceContextBar } from '@/components/layout/SourceContextBar';
import { ImportFromFigmaDialog } from '@/components/figma/ImportFromFigmaDialog';
import { CollectionActions } from '@/components/collections/CollectionActions';
import { GroupBreadcrumb } from '@/components/tokens/GroupBreadcrumb';
import { CollectionTokensWorkspace } from '@/components/tokens/CollectionTokensWorkspace';
import { StyleGuideTabPanel } from '@/components/tokens/StyleGuideTabPanel';
import { GraphPanelWithChrome } from '@/components/graph/GraphPanelWithChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { TokenGroup, GeneratedToken } from '@/types';
import type { ISourceMetadata } from '@/types/collection.types';
import type { CollectionGraphState, GraphGroupState } from '@/types/graph-state.types';
import type { FlatToken, FlatGroup } from '@/types/graph-nodes.types';
import type { ITheme, ColorMode, ThemeKind, ThemeGroupState } from '@/types/theme.types';
import { ThemeList } from '@/components/themes/ThemeList';
import { ThemeGroupMatrix } from '@/components/themes/ThemeGroupMatrix';
import { getAllGroups, findGroupById, generateId } from '@/utils';
import { filterGroupsForDualThemes } from '@/utils/filterGroupsForActiveTheme';
import { resolveActiveThemeIdForGroup } from '@/utils/resolveActiveThemeForGroup';
import { mergeDualThemeTokens } from '@/lib/themeTokenMerge';
import { applyGroupMove, applyGroupRename, applyGroupToggleOmitFromPath, type DropMode } from '@/utils/groupMove';
import {
  getTokenPathsFromGraphState,
  compareTokenPaths,
  type TokenPathMismatch,
} from '@/utils/graphTokenPaths';
import { tokenService, githubService, fileService } from '@/services';
import { GitHubDirectoryPicker } from '@/components/github/GitHubDirectoryPicker';
import { ExportToFigmaDialog } from '@/components/figma/ExportToFigmaDialog';
import { LoadCollectionDialog } from '@/components/collections/LoadCollectionDialog';
import { ClearFormDialog } from '@/components/tokens/ClearFormDialog';
import { JsonPreviewDialog } from '@/components/dev/JsonPreviewDialog';
import type { GitHubConfig } from '@/types';
import { usePermissions } from '@/context/PermissionsContext';
import { useAppTheme } from '@/components/providers/AppThemeProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AIChatPanel } from '@/components/ai/AIChatPanel';

/** When Figma/JSON dialogs are closed, avoid re-parsing token JSON on every parent render. */
const CLOSED_DIALOG_TOKEN_PLACEHOLDER: Record<string, unknown> = {};

/** Pure helper: update a single token value within a recursive group tree */
function updateGroupToken(group: TokenGroup, targetGroupId: string, tokenId: string, value: string): TokenGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      tokens: group.tokens.map(t => t.id === tokenId ? { ...t, value } : t),
    };
  }
  return {
    ...group,
    children: group.children?.map(child => updateGroupToken(child, targetGroupId, tokenId, value)),
  };
}

interface TokensPageProps {
  params: { id: string };
}

function ColorModeBadge({ colorMode }: { colorMode: ColorMode }) {
  if (colorMode === 'dark') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground flex-shrink-0">
        <Moon size={9} />
        Dark
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-warning/10 text-warning flex-shrink-0">
      <Sun size={9} />
      Light
    </span>
  );
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const router = useRouter();

  const [collectionName, setCollectionName] = useState('');
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { canEdit, canGitHub, canFigma } = usePermissions();
  const appTheme = useAppTheme();
  const appThemeRef = useRef(appTheme);
  useEffect(() => {
    appThemeRef.current = appTheme;
  }, [appTheme]);

  /** After persisting this collection, refresh shell CSS if it is the designated app-theme collection. */
  const tryRefreshAppShell = useCallback(() => {
    const at = appThemeRef.current;
    if (at?.configured && at.collectionId === id) {
      void at.refresh();
    }
  }, [id]);

  /** Coalesce shell CSS reload while editing (esp. shadcn colors) so the editor does not re-apply the live theme on every 400ms save tick. */
  const appShellRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleDebouncedAppShellRefresh = useCallback(() => {
    if (appShellRefreshDebounceRef.current) clearTimeout(appShellRefreshDebounceRef.current);
    appShellRefreshDebounceRef.current = setTimeout(() => {
      appShellRefreshDebounceRef.current = null;
      tryRefreshAppShell();
    }, 1200);
  }, [tryRefreshAppShell]);

  useEffect(
    () => () => {
      if (appShellRefreshDebounceRef.current) clearTimeout(appShellRefreshDebounceRef.current);
    },
    []
  );

  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);
  
  // GitHub and export/import state
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [directoryPickerMode, setDirectoryPickerMode] = useState<'export' | 'import'>('export');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showExportFigmaDialog, setShowExportFigmaDialog] = useState(false);
  /** Collection Settings — Figma fields; dialogs fall back when header localStorage is empty */
  const [savedFigmaToken, setSavedFigmaToken] = useState<string | null>(null);
  const [savedFigmaFileId, setSavedFigmaFileId] = useState<string | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [githubConfig] = useState<GitHubConfig | null>(null); // TODO: Get from user settings/config
  const [collectionGraphState, setCollectionGraphState] = useState<CollectionGraphState>({});
  const [graphStateMap, setGraphStateMap] = useState<CollectionGraphState>({});

  // Keep refs so keyboard shortcut / auto-save always reads the latest state
  const graphStateMapRef        = useRef<CollectionGraphState>({});
  const generateTabTokensRef    = useRef<Record<string, unknown> | null>(null);
  const rawCollectionTokensRef  = useRef<Record<string, unknown> | null>(null);
  const graphAutoSaveTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeColorThemeIdRef   = useRef<string | null>(null);
  const activeDensityThemeIdRef = useRef<string | null>(null);

  // Token groups master panel state
  const [globalNamespace, setGlobalNamespace] = useState('token');
  const [masterGroups, setMasterGroups] = useState<TokenGroup[]>([]);
  const [themes, setThemes] = useState<ITheme[]>([]);
  const [activeColorThemeId, setActiveColorThemeId]     = useState<string | null>(null);
  const [activeDensityThemeId, setActiveDensityThemeId] = useState<string | null>(null);

  // Theme-mode editable token copy and auto-save timer
  const [activeThemeTokens, setActiveThemeTokens] = useState<TokenGroup[]>([]);
  const themeTokenSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Collection-default token edits: debounced PUT; app shell refresh runs after successful persist */
  const defaultTokenSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group reorder undo stack (max 20 steps) and debounced persist timer
  const undoStackRef = useRef<TokenGroup[][]>([]);
  const redoStackRef = useRef<TokenGroup[][]>([]);
  const MAX_UNDO = 20;
  const groupReorderSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flat token list used by ConstantNode's source-token picker
  const allFlatTokens = useMemo<FlatToken[]>(() => {
    const result: FlatToken[] = [];
    const traverseTokens = (group: TokenGroup, prefix: string) => {
      const groupPath = prefix ? `${prefix}.${group.name}` : group.name;
      for (const token of group.tokens) {
        result.push({
          path: `${groupPath}.${token.path}`,
          value: String(token.value ?? ''),
          type: String(token.type ?? 'string'),
        });
      }
      if (group.children) {
        for (const child of group.children) traverseTokens(child, groupPath);
      }
    };
    for (const group of masterGroups) traverseTokens(group, '');
    return result;
  }, [masterGroups]);

  // Flat group list used by the destination-group picker in nodes
  const allFlatGroups = useMemo<FlatGroup[]>(() => {
    const result: FlatGroup[] = [];
    const traverseGroups = (group: TokenGroup, breadcrumb: string) => {
      const path = breadcrumb ? `${breadcrumb} / ${group.name}` : group.name;
      result.push({ id: group.id, name: group.name, path });
      if (group.children) {
        for (const child of group.children) traverseGroups(child, path);
      }
    };
    for (const group of masterGroups) traverseGroups(group, '');
    return result;
  }, [masterGroups]);
  // Filtered group tree based on active themes (Disabled groups hidden)
  const filteredGroups = useMemo(() => {
    if (!activeColorThemeId && !activeDensityThemeId) return masterGroups;
    const colorTheme   = themes.find(t => t.id === activeColorThemeId)  ?? null;
    const densityTheme = themes.find(t => t.id === activeDensityThemeId) ?? null;
    return filterGroupsForDualThemes(masterGroups, colorTheme, densityTheme);
  }, [masterGroups, activeColorThemeId, activeDensityThemeId, themes]);

  const sidebarColorThemes = useMemo(
    () => themes.filter((t) => (t.kind ?? 'color') === 'color'),
    [themes],
  );
  const sidebarDensityThemes = useMemo(
    () => themes.filter((t) => (t.kind ?? 'color') === 'density'),
    [themes],
  );

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedToken, setSelectedToken] = useState<{ token: GeneratedToken; groupPath: string } | null>(null);

  const [pendingNewGroup, setPendingNewGroup] = useState<string | null>(null);
  const [pendingBulkInsert, setPendingBulkInsert] = useState<{ groupId: string; tokens: GeneratedToken[]; subgroupName?: string } | null>(null);
  const [pendingGroupCreation, setPendingGroupCreation] = useState<{ parentGroupId: string | null; groupData: { name: string; tokens: GeneratedToken[] } } | null>(null);
  const [pendingGroupAction, setPendingGroupAction] = useState<{ type: 'delete' | 'addSub'; groupId: string; name?: string } | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addSubGroupParentId, setAddSubGroupParentId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [configuringThemeId, setConfiguringThemeId] = useState<string | null>(null);
  const [tokenFormReloadVersion, setTokenFormReloadVersion] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshTokens = useCallback(async () => {
    try {
      const [colRes, themesRes] = await Promise.all([
        fetch(`/api/collections/${id}`),
        fetch(`/api/collections/${id}/themes`),
      ]);
      if (colRes.ok) {
        const data = await colRes.json();
        const col = data.collection ?? data;
        const rawTokens = (col.tokens ?? {}) as Record<string, unknown>;
        setRawCollectionTokens(rawTokens);
        rawCollectionTokensRef.current = rawTokens;
        setSavedFigmaToken(col.figmaToken ?? null);
        setSavedFigmaFileId(col.figmaFileId ?? null);
        const { groups } = tokenService.processImportedTokens(rawTokens, col.namespace ?? globalNamespace);
        setMasterGroups(groups);
        setTokenFormReloadVersion(v => v + 1);
      }
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        const apiThemes: ITheme[] = themesData.themes ?? [];
        setThemes(apiThemes);
      }
      if (colRes.ok) tryRefreshAppShell();
    } catch {
      // silent — user can manually refresh if needed
    }
  }, [id, tryRefreshAppShell, globalNamespace]);

  useEffect(() => {
    loadCollection();
    return () => {
      abortControllerRef.current?.abort();
      if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
      if (themeTokenSaveTimerRef.current) clearTimeout(themeTokenSaveTimerRef.current);
      if (defaultTokenSaveTimerRef.current) clearTimeout(defaultTokenSaveTimerRef.current);
      if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  const loadCollection = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${id}`, {
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error('Failed to load collection');
      const data = await res.json();
      const col = data.collection ?? data;
      const rawTokens = (col.tokens ?? {}) as Record<string, unknown>;

      setCollectionName(col.name ?? '');
      if (col.namespace) setGlobalNamespace(col.namespace);
      setSavedFigmaToken(col.figmaToken ?? null);
      setSavedFigmaFileId(col.figmaFileId ?? null);
      setRawCollectionTokens(rawTokens);
      rawCollectionTokensRef.current = rawTokens;
      setSelectedSourceMetadata(col.sourceMetadata ?? null);
      // Load persisted graph state
      const gs = (col.graphState ?? {}) as CollectionGraphState;
      setCollectionGraphState(gs);
      setGraphStateMap(gs);
      graphStateMapRef.current = gs;
      // Always parse collection tokens into masterGroups
      const { groups: defaultGroups } = tokenService.processImportedTokens(rawTokens, col.namespace ?? '');
      setMasterGroups(defaultGroups);

      // Load custom themes for the theme selector
      const themesRes = await fetch(`/api/collections/${id}/themes`, {
        signal: abortControllerRef.current?.signal,
      });
      if (themesRes.ok) {
        const themesData = await themesRes.json();
        const apiThemes: ITheme[] = themesData.themes ?? [];

        setThemes(apiThemes);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      showErrorToast('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleted = () => router.push('/collections');

  const handleRenamed = (newName: string) => {
    setCollectionName(newName);
    showSuccessToast(`Renamed to "${newName}"`);
  };

  const handleEdited = (newName: string, newNamespace: string) => {
    setCollectionName(newName);
    setGlobalNamespace(newNamespace);
    showSuccessToast('Updated collection settings');
  };

  const handleDuplicated = (newId: string, newName: string) => {
    router.push(`/collections/${newId}/tokens`);
    showSuccessToast(`Duplicated as "${newName}"`);
  };

  const handleSaveAs = async (name: string) => {
    setIsSavingAs(true);
    try {
      const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? {};
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tokens: tokensPayload }),
      });
      if (res.status === 201) {
        const { collection } = await res.json();
        setSaveAsDialogOpen(false);
        router.push(`/collections/${collection._id}/tokens`);
        showSuccessToast(`Saved as "${collection.name}"`);
      } else if (res.status === 409) {
        const existingData = await res.json();
        const putRes = await fetch(`/api/collections/${existingData.existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tokens: tokensPayload }),
        });
        if (putRes.ok) {
          const { collection } = await putRes.json();
          setSaveAsDialogOpen(false);
          router.push(`/collections/${collection._id}/tokens`);
          showSuccessToast(`Saved as "${collection.name}"`);
        } else {
          showErrorToast('Failed to save collection');
        }
      } else {
        showErrorToast('Failed to save collection');
      }
    } catch {
      showErrorToast('Failed to save collection');
    } finally {
      setIsSavingAs(false);
    }
  };

  // ── Keep refs in sync so keyboard shortcut reads fresh values ──────────
  const handleTokensChange = useCallback(
    (tokens: Record<string, unknown> | null, namespace: string, _collectionName: string) => {
      setGenerateTabTokens(tokens ?? {});
      generateTabTokensRef.current = tokens;
      if (namespace) setGlobalNamespace(namespace);

      // Theme mode persists via handleThemeTokenChange; default mode debounced PUT + tryRefreshAppShell.
      if (activeColorThemeIdRef.current || activeDensityThemeIdRef.current) return;
      if (!canEdit) return;
      const payload = tokens;
      if (!payload || Object.keys(payload).length === 0) return;

      if (defaultTokenSaveTimerRef.current) clearTimeout(defaultTokenSaveTimerRef.current);
      defaultTokenSaveTimerRef.current = setTimeout(async () => {
        const toSave = generateTabTokensRef.current;
        if (!toSave || Object.keys(toSave).length === 0) return;
        const prev = rawCollectionTokensRef.current;
        if (prev && JSON.stringify(toSave) === JSON.stringify(prev)) return;
        const ns = namespace?.trim() || globalNamespace;
        try {
          const res = await fetch(`/api/collections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens: toSave,
              namespace: ns,
              graphState: graphStateMapRef.current,
            }),
          });
          if (res.ok) {
            rawCollectionTokensRef.current = toSave;
            setRawCollectionTokens(toSave);
            scheduleDebouncedAppShellRefresh();
          }
        } catch {
          // Silent — same pattern as theme token auto-save
        }
      }, 400);
    },
    [canEdit, id, globalNamespace, scheduleDebouncedAppShellRefresh]
  );

  // ── Group drag-and-drop reorder handler ────────────────────────────────
  const handleGroupsReordered = useCallback(async (
    _newGroupsFromTree: TokenGroup[],
    activeId: string,
    overId: string,
    dropMode: DropMode = 'before',
  ) => {
    // Push current state to undo stack before mutating
    undoStackRef.current = [
      masterGroups,
      ...undoStackRef.current.slice(0, MAX_UNDO - 1),
    ];
    // Clear redo stack when new action is performed
    redoStackRef.current = [];

    // Re-run applyGroupMove with themes so reparenting correctly rewrites
    // theme group IDs and alias paths. A match-by-ID sync would silently
    // drop any reparented group (its ID changes on reparent; the old ID
    // no longer exists in masterGroups after the move).
    const { groups: newGroups, themes: updatedThemes, idMapping } = applyGroupMove(
      masterGroups,
      activeId,
      overId,
      themes,
      dropMode,
    );

    // Update React state
    setMasterGroups(newGroups);
    setThemes(updatedThemes);

    // If the selected group was reparented and has a new ID, update the selection
    if (selectedGroupId && idMapping && idMapping[selectedGroupId]) {
      setSelectedGroupId(idMapping[selectedGroupId]);
    }

    // Persist to MongoDB (debounced 300ms)
    if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
    groupReorderSaveTimerRef.current = setTimeout(async () => {
      try {
        const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
        const res = await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: rawTokens, namespace: globalNamespace, themes: updatedThemes }),
        });
        if (res.ok) {
          rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
          setRawCollectionTokens(rawTokens as Record<string, unknown>);
          tryRefreshAppShell();
        }
      } catch {
        // Silent — mirrors existing auto-save error handling pattern
      }
    }, 300);
  }, [masterGroups, themes, id, globalNamespace, selectedGroupId, tryRefreshAppShell]);

  // ── Group rename handler ────────────────────────────────────────────────
  const handleRenameGroup = useCallback(async (groupId: string, newLabel: string) => {
    const { groups: newGroups, themes: updatedThemes } = applyGroupRename(
      masterGroups,
      groupId,
      newLabel,
      themes,
    );

    setMasterGroups(newGroups);
    setThemes(updatedThemes);

    try {
      const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: rawTokens, namespace: globalNamespace, themes: updatedThemes }),
      });
      if (res.ok) {
        rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
        setRawCollectionTokens(rawTokens as Record<string, unknown>);
        tryRefreshAppShell();
      }
    } catch {
      showErrorToast('Failed to save rename');
    }
  }, [masterGroups, themes, id, globalNamespace, tryRefreshAppShell]);

  // ── Toggle omitFromPath on a group ─────────────────────────────────────────
  const handleToggleOmitFromPath = useCallback(async (groupId: string) => {
    const newGroups = applyGroupToggleOmitFromPath(masterGroups, groupId);
    setMasterGroups(newGroups);
    try {
      const rawTokens = tokenService.generateStyleDictionaryOutput(newGroups, globalNamespace);
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: rawTokens, namespace: globalNamespace, themes }),
      });
      if (res.ok) {
        rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
        setRawCollectionTokens(rawTokens as Record<string, unknown>);
        tryRefreshAppShell();
      }
    } catch {
      showErrorToast('Failed to save group setting');
    }
  }, [masterGroups, themes, id, globalNamespace, tryRefreshAppShell]);

  // Persist graph state to the correct theme (per theme > group)
  const persistGraphState = useCallback((gs: CollectionGraphState) => {
    // Resolve which theme to write based on the selected group's dominant token type
    const selectedGroup = selectedGroupId
      ? findGroupById(masterGroups, selectedGroupId)
      : null;
    const targetThemeId = resolveActiveThemeIdForGroup(
      selectedGroup,
      activeColorThemeIdRef.current,
      activeDensityThemeIdRef.current,
    );
    if (targetThemeId) {
      return fetch(`/api/collections/${id}/themes/${targetThemeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphState: gs }),
      }).then((res) => {
        if (res.ok) {
          setThemes(prev => prev.map(t => t.id === targetThemeId ? { ...t, graphState: gs } : t));
        }
      }).catch((error) => {
        console.error('Failed to persist graph state:', error);
        showErrorToast('Failed to save graph state');
      });
    }
    // Collection default fallback (no active theme for this group)
    if (generateTabTokensRef.current === null && rawCollectionTokensRef.current === null) return;
    const tokens = (generateTabTokensRef.current && Object.keys(generateTabTokensRef.current).length > 0)
      ? generateTabTokensRef.current
      : (rawCollectionTokensRef.current ?? {});
    return fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, graphState: gs }),
    }).then((res) => {
      if (res.ok) {
        setCollectionGraphState(gs);
        scheduleDebouncedAppShellRefresh();
      }
    }).catch((error) => {
      console.error('Failed to persist collection graph state:', error);
      showErrorToast('Failed to save collection graph state');
    });
  }, [id, scheduleDebouncedAppShellRefresh, selectedGroupId, masterGroups]);

  const handleGraphStateChange = useCallback((groupId: string, state: GraphGroupState, flushImmediate?: boolean) => {
    const next = { ...graphStateMapRef.current, [groupId]: state };
    graphStateMapRef.current = next;
    setGraphStateMap(next);

    if (flushImmediate) {
      if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
      graphAutoSaveTimerRef.current = null;
      persistGraphState(next);
      return;
    }

    // Debounced auto-save — fires 1.5 s after the last change
    if (graphAutoSaveTimerRef.current) clearTimeout(graphAutoSaveTimerRef.current);
    graphAutoSaveTimerRef.current = setTimeout(() => {
      persistGraphState(graphStateMapRef.current);
    }, 1500);
  }, [persistGraphState]);

  // ── Primary save: persist tokens + graph state ───────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const gs = graphStateMapRef.current;
      const selectedGroup = selectedGroupId ? findGroupById(masterGroups, selectedGroupId) : null;
      const targetThemeId = resolveActiveThemeIdForGroup(
        selectedGroup,
        activeColorThemeId,
        activeDensityThemeId,
      );
      if (targetThemeId) {
        const res = await fetch(`/api/collections/${id}/themes/${targetThemeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graphState: gs }),
        });
        if (res.ok) {
          setThemes(prev => prev.map(t => t.id === targetThemeId ? { ...t, graphState: gs } : t));
          showSuccessToast('Saved');
        } else {
          showErrorToast('Save failed');
        }
      } else {
        const tokensPayload = generateTabTokensRef.current ?? rawCollectionTokens ?? {};
        const res = await fetch(`/api/collections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: tokensPayload,
            namespace: globalNamespace,
            graphState: gs,
          }),
        });
        if (res.ok) {
          setCollectionGraphState(gs);
          tryRefreshAppShell();
          showSuccessToast('Saved');
        } else {
          showErrorToast('Save failed');
        }
      }
    } catch {
      showErrorToast('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [id, rawCollectionTokens, activeColorThemeId, activeDensityThemeId, selectedGroupId, masterGroups, globalNamespace, tryRefreshAppShell]);

  // ── Ctrl / Cmd + S and Ctrl / Cmd + Z keyboard shortcuts ──────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (canEdit) handleSave();
      }
      // Undo: Ctrl/Cmd + Z (without Shift)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const previous = undoStackRef.current.shift();
        if (previous) {
          // Push current state to redo stack before undoing
          redoStackRef.current = [
            masterGroups,
            ...redoStackRef.current.slice(0, MAX_UNDO - 1),
          ];
          setMasterGroups(previous);
          showSuccessToast('Undo');
          if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
          groupReorderSaveTimerRef.current = setTimeout(async () => {
            try {
              const rawTokens = tokenService.generateStyleDictionaryOutput(previous, globalNamespace);
              const res = await fetch(`/api/collections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens: rawTokens }),
              });
              if (res.ok) {
                rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
                setRawCollectionTokens(rawTokens as Record<string, unknown>);
                tryRefreshAppShell();
              }
            } catch {
              // Silent
            }
          }, 300);
        }
      }
      // Redo: Ctrl/Cmd + Shift + Z
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const next = redoStackRef.current.shift();
        if (next) {
          // Push current state back to undo stack
          undoStackRef.current = [
            masterGroups,
            ...undoStackRef.current.slice(0, MAX_UNDO - 1),
          ];
          setMasterGroups(next);
          showSuccessToast('Redo');
          if (groupReorderSaveTimerRef.current) clearTimeout(groupReorderSaveTimerRef.current);
          groupReorderSaveTimerRef.current = setTimeout(async () => {
            try {
              const rawTokens = tokenService.generateStyleDictionaryOutput(next, globalNamespace);
              const res = await fetch(`/api/collections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens: rawTokens }),
              });
              if (res.ok) {
                rawCollectionTokensRef.current = rawTokens as Record<string, unknown>;
                setRawCollectionTokens(rawTokens as Record<string, unknown>);
                tryRefreshAppShell();
              }
            } catch {
              // Silent
            }
          }, 300);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, id, globalNamespace, masterGroups, canEdit, tryRefreshAppShell]);

  const handleGroupsChange = useCallback(
    (groups: TokenGroup[]) => {
      setMasterGroups(groups);

      // Sync theme groups maps: register any newly added group IDs so they
      // are not hidden by the filteredGroups filter (which defaults to 'disabled').
      // Custom themes: new groups default to 'source' (read-only mirror of collection).
      setThemes(prevThemes => {
        if (prevThemes.length === 0) return prevThemes;

        function flattenGroupIds(g: TokenGroup): string[] {
          const ids = [g.id];
          if (g.children?.length) g.children.forEach(c => ids.push(...flattenGroupIds(c)));
          return ids;
        }
        const allGroupIds = groups.flatMap(flattenGroupIds);

        return prevThemes.map(theme => {
          const newEntries: Record<string, 'source'> = {};
          for (const gid of allGroupIds) {
            if (!(gid in theme.groups)) {
              newEntries[gid] = 'source';
            }
          }
          if (Object.keys(newEntries).length === 0) return theme;
          return { ...theme, groups: { ...theme.groups, ...newEntries } };
        });
      });
    },
    []
  );

  const handleGroupAdded = useCallback((group: { id: string; name: string }) => {
    setPendingNewGroup(null);
    setSelectedGroupId(group.id);
  }, []);

  // ── Keep dual theme refs in sync for debounced save ──────────────────────
  useEffect(() => {
    activeColorThemeIdRef.current = activeColorThemeId;
  }, [activeColorThemeId]);

  useEffect(() => {
    activeDensityThemeIdRef.current = activeDensityThemeId;
  }, [activeDensityThemeId]);

  // ── Sync graphStateMap when active themes change (per theme > group) ─────
  // Each theme has its own graph state per group; never mix themes (like tokens table).
  useEffect(() => {
    const selectedGroup = selectedGroupId
      ? findGroupById(masterGroups, selectedGroupId)
      : null;
    const resolvedId = resolveActiveThemeIdForGroup(
      selectedGroup,
      activeColorThemeId,
      activeDensityThemeId,
    );
    if (!resolvedId) {
      setGraphStateMap(collectionGraphState);
      graphStateMapRef.current = collectionGraphState;
      return;
    }
    const theme = themes.find(t => t.id === resolvedId);
    const gs = (theme?.graphState ?? {}) as CollectionGraphState;
    setGraphStateMap(gs);
    graphStateMapRef.current = gs;
  }, [activeColorThemeId, activeDensityThemeId, selectedGroupId, themes, collectionGraphState, masterGroups]);

  // ── Sync activeThemeTokens when active themes or selected group changes ───
  useEffect(() => {
    if (!activeColorThemeId && !activeDensityThemeId) {
      setActiveThemeTokens([]);
      return;
    }
    // Resolve which theme's tokens to use for the active editing context
    const selectedGroup = selectedGroupId ? findGroupById(masterGroups, selectedGroupId) : null;
    const resolvedId = resolveActiveThemeIdForGroup(selectedGroup, activeColorThemeId, activeDensityThemeId);
    const theme = resolvedId ? themes.find(t => t.id === resolvedId) : null;
    setActiveThemeTokens(theme ? JSON.parse(JSON.stringify(theme.tokens)) : []);
  }, [activeColorThemeId, activeDensityThemeId, selectedGroupId, themes, masterGroups]);

  // ── Compute effective theme tokens: three-way merge default → color → density ─
  const effectiveThemeTokens = useMemo(() => {
    if (!activeColorThemeId && !activeDensityThemeId) return [];
    if (!rawCollectionTokens) return [];
    const colorTheme   = themes.find(t => t.id === activeColorThemeId)  ?? null;
    const densityTheme = themes.find(t => t.id === activeDensityThemeId) ?? null;
    const merged = mergeDualThemeTokens(rawCollectionTokens, colorTheme, densityTheme, globalNamespace);
    const { groups } = tokenService.processImportedTokens(merged, globalNamespace);
    return groups;
  }, [activeColorThemeId, activeDensityThemeId, themes, rawCollectionTokens, globalNamespace]);

  const allCollectionTokens = useMemo(() => {
    const flattenGroups = (groups: TokenGroup[]): GeneratedToken[] =>
      groups.flatMap(g => [...(g.tokens ?? []), ...(g.children ? flattenGroups(g.children) : [])]);
    const source = (activeColorThemeId || activeDensityThemeId) ? effectiveThemeTokens : filteredGroups;
    return flattenGroups(source);
  }, [activeColorThemeId, activeDensityThemeId, effectiveThemeTokens, filteredGroups]);

  // ── Dual theme selector change handlers ────────────────────────────────
  const handleColorThemeChange = useCallback((newThemeId: string | null) => {
    const newTheme = newThemeId ? themes.find(t => t.id === newThemeId) : null;
    // Pre-sync graphState so graph mounts with correct state on next render
    const gs = newThemeId
      ? ((newTheme?.graphState ?? {}) as CollectionGraphState)
      : collectionGraphState;
    setGraphStateMap(gs);
    graphStateMapRef.current = gs;
    setActiveColorThemeId(newThemeId);
    setSelectedToken(null);
    if (!newThemeId) {
      if (!selectedGroupId || !masterGroups.some(g => g.id === selectedGroupId)) {
        setSelectedGroupId(masterGroups[0]?.id ?? '');
      }
      return;
    }
    if (!newTheme) return;
    const currentState = selectedGroupId ? (newTheme.groups[selectedGroupId] ?? 'disabled') : 'disabled';
    if (currentState === 'disabled' || !selectedGroupId) {
      const allGroupsList = getAllGroups(masterGroups);
      const firstEnabled = allGroupsList.find(g => newTheme.groups[g.id] === 'enabled')
        ?? allGroupsList.find(g => (newTheme.groups[g.id] ?? 'disabled') !== 'disabled');
      setSelectedGroupId(firstEnabled?.id ?? masterGroups[0]?.id ?? '');
    }
  }, [themes, selectedGroupId, masterGroups, collectionGraphState]);

  const handleDensityThemeChange = useCallback((newThemeId: string | null) => {
    const newTheme = newThemeId ? themes.find(t => t.id === newThemeId) : null;
    const gs = newThemeId
      ? ((newTheme?.graphState ?? {}) as CollectionGraphState)
      : collectionGraphState;
    setGraphStateMap(gs);
    graphStateMapRef.current = gs;
    setActiveDensityThemeId(newThemeId);
    setSelectedToken(null);
    if (!newThemeId) {
      if (!selectedGroupId || !masterGroups.some(g => g.id === selectedGroupId)) {
        setSelectedGroupId(masterGroups[0]?.id ?? '');
      }
      return;
    }
    if (!newTheme) return;
    const currentState = selectedGroupId ? (newTheme.groups[selectedGroupId] ?? 'disabled') : 'disabled';
    if (currentState === 'disabled' || !selectedGroupId) {
      const allGroupsList = getAllGroups(masterGroups);
      const firstEnabled = allGroupsList.find(g => newTheme.groups[g.id] === 'enabled')
        ?? allGroupsList.find(g => (newTheme.groups[g.id] ?? 'disabled') !== 'disabled');
      setSelectedGroupId(firstEnabled?.id ?? masterGroups[0]?.id ?? '');
    }
  }, [themes, selectedGroupId, masterGroups, collectionGraphState]);

  // ── Theme CRUD handlers (create, delete, color-mode change) ────────────
  const handleAddTheme = useCallback(async (name: string, kind: ThemeKind, colorMode?: ColorMode) => {
    try {
      const res = await fetch(`/api/collections/${id}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind, colorMode }),
      });
      if (!res.ok) throw new Error('Failed to create theme');
      const data = await res.json();
      const newTheme: ITheme = data.theme;
      setThemes(prev => [...prev, newTheme]);
      // Auto-select the new theme in the appropriate selector
      if ((newTheme.kind ?? 'color') === 'color') {
        handleColorThemeChange(newTheme.id);
      } else {
        handleDensityThemeChange(newTheme.id);
      }
    } catch {
      showErrorToast('Failed to create theme. Please try again.');
    }
  }, [id, handleColorThemeChange, handleDensityThemeChange]);

  const handleDeleteTheme = useCallback(async (themeId: string) => {
    try {
      const res = await fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete theme');
      setThemes(prev => {
        const updated = prev.filter(t => t.id !== themeId);
        return updated;
      });
      // Clear selection if the deleted theme was active
      if (activeColorThemeId === themeId) handleColorThemeChange(null);
      if (activeDensityThemeId === themeId) handleDensityThemeChange(null);
    } catch {
      showErrorToast('Failed to delete theme. Please try again.');
    }
  }, [id, activeColorThemeId, activeDensityThemeId, handleColorThemeChange, handleDensityThemeChange]);

  const handleColorModeChange = useCallback(async (themeId: string, colorMode: ColorMode) => {
    // Optimistic update
    setThemes(prev => prev.map(t => t.id === themeId ? { ...t, colorMode } : t));
    try {
      const res = await fetch(`/api/collections/${id}/themes/${themeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorMode }),
      });
      if (!res.ok) throw new Error('Failed to update color mode');
    } catch {
      // Revert
      setThemes(prev => prev.map(t =>
        t.id === themeId
          ? { ...t, colorMode: colorMode === 'dark' ? 'light' : 'dark' }
          : t
      ));
      showErrorToast('Failed to update color mode');
    }
  }, [id]);

  const handleGroupStateChange = useCallback(async (groupId: string, state: ThemeGroupState) => {
    if (!configuringThemeId) return;
    const targetTheme = themes.find(t => t.id === configuringThemeId);
    if (!targetTheme) return;
    const updatedGroups = { ...targetTheme.groups, [groupId]: state };
    setThemes(prev => prev.map(t =>
      t.id === configuringThemeId
        ? { ...t, groups: updatedGroups }
        : t
    ));
    try {
      const res = await fetch(`/api/collections/${id}/themes/${configuringThemeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: updatedGroups }),
      });
      if (!res.ok) throw new Error('Failed to update group state');
    } catch {
      showErrorToast('Failed to update group state');
    }
  }, [id, configuringThemeId, themes]);

  // ── Theme token change with debounced PATCH auto-save ───────────────────
  const handleThemeTokenChange = useCallback((updatedTokens: TokenGroup[]) => {
    if (!activeColorThemeId && !activeDensityThemeId) return; // Default mode: mutations go through handleGroupsChange
    const selectedGroup = selectedGroupId ? findGroupById(masterGroups, selectedGroupId) : null;
    const targetThemeId = resolveActiveThemeIdForGroup(
      selectedGroup,
      activeColorThemeId,
      activeDensityThemeId,
    );
    if (!targetThemeId) return; // no active theme of the right kind for this group
    setActiveThemeTokens(updatedTokens);
    setThemes(prev => prev.map(t => t.id === targetThemeId ? { ...t, tokens: updatedTokens } : t));
    if (themeTokenSaveTimerRef.current) clearTimeout(themeTokenSaveTimerRef.current);
    themeTokenSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/collections/${id}/themes/${targetThemeId}/tokens`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: updatedTokens }),
        });
        if (res.ok) scheduleDebouncedAppShellRefresh();
      } catch {
        // Silent — existing toast pattern; no disruptive error for auto-save
      }
    }, 400);
  }, [id, activeColorThemeId, activeDensityThemeId, selectedGroupId, masterGroups, scheduleDebouncedAppShellRefresh]);

  // ── Derive active group state (enabled / source / disabled) ────────────
  // Token name mismatch when theme graph differs from default (for selected group)
  const tokenNameMismatch = useMemo<TokenPathMismatch | null>(() => {
    if ((!activeColorThemeId && !activeDensityThemeId) || !selectedGroupId) return null;
    const selectedGroup = findGroupById(masterGroups, selectedGroupId);
    const activeThemeId = resolveActiveThemeIdForGroup(selectedGroup, activeColorThemeId, activeDensityThemeId);
    if (!activeThemeId) return null;
    const defaultState = collectionGraphState[selectedGroupId];
    const themeState = graphStateMap[selectedGroupId] ?? defaultState;
    const resolveTokenReference = masterGroups.length
      ? (ref: string) => tokenService.resolveTokenReference(ref, masterGroups)
      : undefined;
    const defaultPaths = getTokenPathsFromGraphState(
      defaultState ?? { nodes: {}, edges: [], generators: [] },
      selectedGroupId,
      globalNamespace || undefined,
      { resolveTokenReference },
    );
    const themePaths = getTokenPathsFromGraphState(
      themeState ?? { nodes: {}, edges: [], generators: [] },
      selectedGroupId,
      globalNamespace || undefined,
      { resolveTokenReference },
    );
    const mismatch = compareTokenPaths(defaultPaths, themePaths);
    if (mismatch.inThemeNotDefault.length === 0 && mismatch.inDefaultNotTheme.length === 0) {
      return null;
    }
    return mismatch;
  }, [activeColorThemeId, activeDensityThemeId, selectedGroupId, collectionGraphState, graphStateMap, globalNamespace, masterGroups]);

  const activeGroupState = useMemo<'enabled' | 'source' | 'disabled' | null>(() => {
    if ((!activeColorThemeId && !activeDensityThemeId) || !selectedGroupId) return null;
    const selectedGroup = findGroupById(masterGroups, selectedGroupId);
    const activeThemeId = resolveActiveThemeIdForGroup(selectedGroup, activeColorThemeId, activeDensityThemeId);
    if (!activeThemeId) return null;
    const theme = themes.find(t => t.id === activeThemeId);
    if (!theme) return null;
    return (theme.groups[selectedGroupId] ?? 'disabled') as 'enabled' | 'source' | 'disabled';
  }, [activeColorThemeId, activeDensityThemeId, selectedGroupId, themes, masterGroups]);

  const isThemeReadOnly = activeGroupState === 'source';

  // ── Find master collection value for a token by groupId + tokenPath ─────
  const findMasterValue = useCallback((groupId: string, tokenPath: string): string | undefined => {
    const group = findGroupById(masterGroups, groupId);
    const token = group?.tokens.find(t => t.path === tokenPath);
    return token !== undefined ? String(token.value ?? '') : undefined;
  }, [masterGroups]);

  // ── Reset a theme token to its collection-default value ─────────────────
  const handleResetToDefault = useCallback((groupId: string, tokenId: string, masterValue: string) => {
    if (!activeColorThemeId && !activeDensityThemeId) return;
    const updatedTokens = activeThemeTokens.map(g =>
      updateGroupToken(g, groupId, tokenId, masterValue)
    );
    handleThemeTokenChange(updatedTokens);
  }, [activeColorThemeId, activeDensityThemeId, activeThemeTokens, handleThemeTokenChange]);

  // ── Reset a group to source: delete tokens not in source, reset values ───
  const handleResetGroupToSource = useCallback((groupId: string) => {
    if (!activeColorThemeId && !activeDensityThemeId) return;
    const sourceGroup = findGroupById(masterGroups, groupId);
    if (!sourceGroup) return;
    const resetGroupInTree = (groups: TokenGroup[]): TokenGroup[] =>
      groups.map(g => {
        if (g.id === groupId) {
          const updatedTokens = sourceGroup.tokens.map(st => {
            const existing = g.tokens.find(t => t.path === st.path);
            return existing
              ? { ...existing, value: st.value, type: st.type, description: st.description ?? existing.description }
              : { ...st, id: generateId() };
          });
          return { ...g, tokens: updatedTokens };
        }
        if (g.children?.length) {
          return { ...g, children: resetGroupInTree(g.children) };
        }
        return g;
      });
    handleThemeTokenChange(resetGroupInTree(activeThemeTokens));
  }, [activeColorThemeId, activeDensityThemeId, activeThemeTokens, masterGroups, handleThemeTokenChange]);

  const isGroupSource = useCallback((groupId: string) => {
    if (!activeColorThemeId && !activeDensityThemeId) return false;
    const group = findGroupById(masterGroups, groupId);
    const activeThemeId = resolveActiveThemeIdForGroup(group, activeColorThemeId, activeDensityThemeId);
    if (!activeThemeId) return false;
    const theme = themes.find(t => t.id === activeThemeId);
    return (theme?.groups[groupId] ?? 'disabled') === 'source';
  }, [activeColorThemeId, activeDensityThemeId, masterGroups, themes]);

  const confirmAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    if (addSubGroupParentId) {
      setPendingGroupAction({ type: 'addSub', groupId: addSubGroupParentId, name });
      setAddSubGroupParentId(null);
    } else {
      setPendingNewGroup(name);
    }
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  // ── GitHub and Export/Import Functions ─────────────────────────────────────

  const generateTokenSet = useCallback((): Record<string, unknown> => {
    const tokensPayload = generateTabTokens ?? rawCollectionTokens ?? {};
    const { groups } = tokenService.processImportedTokens(tokensPayload, globalNamespace);
    return tokenService.generateStyleDictionaryOutput(groups, globalNamespace, true);
  }, [generateTabTokens, rawCollectionTokens, globalNamespace]);

  /** Do not call `generateTokenSet()` in JSX — that re-ran structure detection on every render. */
  const dialogTokenSetSnapshot = useMemo(() => {
    if (!showExportFigmaDialog && !showJsonDialog) {
      return CLOSED_DIALOG_TOKEN_PLACEHOLDER;
    }
    return generateTokenSet();
  }, [showExportFigmaDialog, showJsonDialog, generateTokenSet]);

  const loadBranches = async () => {
    if (!githubConfig) {
      console.warn('No GitHub config available for loading branches');
      return;
    }

    try {
      console.log('Loading branches for repository:', githubConfig.repository);
      const branches = await githubService.getBranches(
        githubConfig.token,
        githubConfig.repository,
      );
      const branchNames = branches.map((branch) => branch.name);
      setAvailableBranches(branchNames);
    } catch (error) {
      console.error('Failed to load branches:', error);
      throw error;
    }
  };

  const exportToGitHub = async () => {
    console.log('GitHub config check:', githubConfig);
    if (!githubConfig) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with export:', error);
      // Continue anyway - the directory picker can work with the configured branch
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('export');
    setShowDirectoryPicker(true);
  };

  const importFromGitHub = async () => {
    console.log('GitHub config check:', githubConfig);
    if (!githubConfig) {
      showErrorToast('Please configure GitHub connection first');
      return;
    }

    try {
      await loadBranches();
    } catch (error) {
      console.warn('Failed to load branches, continuing with import:', error);
      // Continue anyway - the directory picker can work with the configured branch
      if (availableBranches.length === 0 && githubConfig.branch) {
        setAvailableBranches([githubConfig.branch]);
      }
    }

    setDirectoryPickerMode('import');
    setShowDirectoryPicker(true);
  };

  const exportToFigma = () => {
    setShowExportFigmaDialog(true);
  };

  const handleDownloadJSON = () => {
    const content = JSON.stringify(generateTokenSet(), null, 2);
    
    // Create and trigger download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessToast('JSON downloaded successfully');
  };

  const handleClearForm = () => {
    // Reset to initial state with single color group
    const initialTokens = {};
    setGenerateTabTokens(initialTokens);
    generateTabTokensRef.current = initialTokens;
    setGlobalNamespace('');
    setShowClearDialog(false);
    showSuccessToast('Form cleared successfully!');
  };

  const handlePreviewJSON = () => {
    setShowJsonDialog(true);
  };

  const handleDownloadJSONFromHeader = () => {
    const content = JSON.stringify(generateTokenSet(), null, 2);
    
    // Create and trigger download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccessToast('JSON downloaded successfully');
  };

  const handleDirectorySelect = async (selectedPath: string, selectedBranch: string) => {
    setShowDirectoryPicker(false);

    if (!githubConfig) return;

    const isImportMode = directoryPickerMode === 'import';

    try {
      if (directoryPickerMode === 'export') {
        // Export mode
        const tokenSet = generateTokenSet();
        const response = await fetch('/api/export/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenSet,
            repository: githubConfig.repository,
            githubToken: githubConfig.token,
            branch: selectedBranch,
            path: selectedPath,
          }),
        });

        if (response.ok) {
          showSuccessToast('Successfully exported to GitHub!');
        } else {
          const error = await response.text();
          showErrorToast(`Export failed: ${error}`);
        }
      } else {
        // Import mode
        const response = await fetch('/api/import/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository: githubConfig.repository,
            githubToken: githubConfig.token,
            branch: selectedBranch,
            path: selectedPath,
          }),
        });

        if (response.ok) {
          const { tokenSet } = await response.json();
          
          // Update the form with imported tokens
          setGenerateTabTokens(tokenSet);
          generateTabTokensRef.current = tokenSet;
          
          showSuccessToast('Successfully imported from GitHub!');
        } else {
          const error = await response.text();
          showErrorToast(`Import failed: ${error}`);
        }
      }
    } catch (error) {
      showErrorToast(`${isImportMode ? 'Import' : 'Export'} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background text-foreground">

<Tabs defaultValue="tokens" className="flex flex-col flex-1 overflow-hidden">

      <header className="px-4 py-3 flex justify-between items-center border-b border-muted bg-background text-foreground shrink-0">
       <div className="flex items-center gap-2">  
 
        {/* <h1 className="text-lg line-height-0">
          {collectionName}
        </h1> */}


        <span className="text-xs text-muted-foreground">
          Prefix: <span className="text-foreground font-mono">{globalNamespace}</span>
        </span>

        </div>

        <div className="flex items-center gap-2">
          <TabsList className="w-fit">
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="style-guide">Style Guide</TabsTrigger>
          </TabsList>


        </div>
        <div className="flex items-center">
          {/* Preview JSON button */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={handlePreviewJSON}
            title="Preview JSON"
          >
            <View size={16} />
          </Button>

          {/* Download JSON button */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={handleDownloadJSONFromHeader}
            title="Download JSON"
          >
            <Download size={16} />
          </Button>

          {/* Save button — hidden for read-only roles */}
          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              variant="default"
              size="sm"
            >
              <Save size={14} />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}

          {/* AI Chat toggle */}
          <Button
            variant={isChatOpen ? 'default' : 'ghost'}
            size="sm"
            className="px-2"
            onClick={() => setIsChatOpen(v => !v)}
            title="AI Assistant"
          >
            <Chat size={16} />
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <OverflowMenuVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setSaveAsDialogOpen(true)}>
                  Save As
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => setShowLoadDialog(true)}>
                  Load from Database
                </DropdownMenuItem>
              )}
              {(canFigma || canGitHub) && <DropdownMenuSeparator />}
              {canFigma && (
                <DropdownMenuItem onClick={() => setImportFigmaOpen(true)}>
                  Import from Figma
                </DropdownMenuItem>
              )}
              {canGitHub && (
                <DropdownMenuItem onClick={importFromGitHub}>
                  Import from GitHub
                </DropdownMenuItem>
              )}
              {canGitHub && (
                <DropdownMenuItem onClick={exportToGitHub}>
                  Push to GitHub
                </DropdownMenuItem>
              )}
              {canFigma && (
                <DropdownMenuItem onClick={exportToFigma}>
                  Export to Figma
                </DropdownMenuItem>
              )}
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowClearDialog(true)} className="text-warning focus:text-warning focus:bg-warning/10">
                    Clear Form
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>



      {/* Dialogs driven by the dropdown */}
      <CollectionActions
        selectedId={id}
        selectedName={collectionName}
        selectedNamespace={globalNamespace}
        collections={[{ _id: id, name: collectionName }]}
        onDeleted={handleDeleted}
        onRenamed={handleRenamed}
        onEdited={handleEdited}
        onDuplicated={handleDuplicated}
        onError={(msg) => showErrorToast(msg)}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        renameOpen={renameOpen}
        onRenameOpenChange={setRenameOpen}
      />

      <SourceContextBar sourceMetadata={selectedSourceMetadata} />


      <TabsContent
        value="tokens"
        className="flex flex-1 flex-col min-h-0 m-0 p-0 overflow-hidden"
      >
        <CollectionTokensWorkspace
          sidebarHeader={
            sidebarColorThemes.length === 0 && sidebarDensityThemes.length === 0 ? undefined : (
              <div className="space-y-2.5">
                {sidebarColorThemes.length > 0 && (
                  <div className="space-y-1">
                    <label htmlFor="tokens-sidebar-color-theme" className="text-[11px] text-muted-foreground block">
                      Color
                    </label>
                    <Select
                      key={activeColorThemeId ?? '__color_default__'}
                      value={activeColorThemeId ?? '__default__'}
                      onValueChange={(v) => handleColorThemeChange(v === '__default__' ? null : v)}
                    >
                      <SelectTrigger id="tokens-sidebar-color-theme" className="w-full h-8 text-xs">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        {sidebarColorThemes.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {sidebarDensityThemes.length > 0 && (
                  <div className="space-y-1">
                    <label htmlFor="tokens-sidebar-density-theme" className="text-[11px] text-muted-foreground block">
                      Density
                    </label>
                    <Select
                      key={activeDensityThemeId ?? '__density_default__'}
                      value={activeDensityThemeId ?? '__default__'}
                      onValueChange={(v) => handleDensityThemeChange(v === '__default__' ? null : v)}
                    >
                      <SelectTrigger id="tokens-sidebar-density-theme" className="w-full h-8 text-xs">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default</SelectItem>
                        {sidebarDensityThemes.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )
          }
          groupTree={{
            groups: filteredGroups,
            selectedGroupId,
            onGroupSelect: (gid) => {
              setSelectedGroupId(gid);
              setSelectedToken(null);
            },
            onAddGroup: canEdit ? () => setIsAddingGroup(true) : undefined,
            onDeleteGroup: canEdit ? (groupId) => setPendingGroupAction({ type: 'delete', groupId }) : undefined,
            onAddSubGroup: canEdit
              ? (groupId) => {
                  setAddSubGroupParentId(groupId);
                  setIsAddingGroup(true);
                }
              : undefined,
            onGroupsReordered: canEdit ? handleGroupsReordered : undefined,
            onRenameGroup: canEdit ? handleRenameGroup : undefined,
            onToggleOmitFromPath: canEdit ? handleToggleOmitFromPath : undefined,
          }}
          onCollapseSidebar={() => setSidebarCollapsed(true)}
          graphPanel={
            <GraphPanelWithChrome
              allGroups={masterGroups}
              selectedGroupId={selectedGroupId}
              selectedToken={selectedToken}
              onBulkAddTokens={(groupId, tokens, subgroupName) =>
                setPendingBulkInsert({ groupId, tokens, subgroupName })
              }
              onBulkCreateGroups={(parentGroupId, groupData) =>
                setPendingGroupCreation({ parentGroupId, groupData })
              }
              graphStateMap={graphStateMap}
              onGraphStateChange={handleGraphStateChange}
              namespace={globalNamespace}
              allTokens={allFlatTokens}
              flatGroups={allFlatGroups}
              activeColorThemeId={activeColorThemeId}
              activeDensityThemeId={activeDensityThemeId}
            />
          }
          breadcrumb={
            <GroupBreadcrumb
              groups={masterGroups}
              selectedGroupId={selectedGroupId}
              onSelect={(selId) => {
                setSelectedGroupId(selId);
                setSelectedToken(null);
              }}
            />
          }
          mainContent={
            <TokenGeneratorForm
            key={`${id}-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}-${tokenFormReloadVersion}`}
            githubConfig={null}
            collectionToLoad={
              !activeColorThemeId && !activeDensityThemeId && rawCollectionTokens
                ? {
                    id,
                    name: collectionName,
                    tokens: rawCollectionTokens,
                  }
                : null
            }
            onTokensChange={handleTokensChange}
            namespace={globalNamespace}
            onNamespaceChange={setGlobalNamespace}
            onGroupsChange={(activeColorThemeId || activeDensityThemeId) ? undefined : handleGroupsChange}
            onGroupSelect={(gid) => {
              setSelectedGroupId(gid);
              setSelectedToken(null);
            }}
            selectedGroupId={selectedGroupId}
            pendingNewGroup={pendingNewGroup}
            onGroupAdded={handleGroupAdded}
            hideNamespaceAndActions={true}
            hideAddGroupButton={true}
            selectedTokenId={selectedToken?.token.id ?? null}
            onTokenSelect={(token, groupPath) => setSelectedToken(token ? { token, groupPath } : null)}
            pendingBulkInsert={pendingBulkInsert}
            onBulkInsertProcessed={() => setPendingBulkInsert(null)}
            pendingGroupCreation={pendingGroupCreation}
            onGroupCreationProcessed={() => setPendingGroupCreation(null)}
            pendingGroupAction={pendingGroupAction}
            onGroupActionProcessed={() => setPendingGroupAction(null)}
            themeTokens={(activeColorThemeId || activeDensityThemeId) ? effectiveThemeTokens : undefined}
            onThemeTokensChange={(activeColorThemeId || activeDensityThemeId) ? handleThemeTokenChange : undefined}
            isReadOnly={isThemeReadOnly || !canEdit}
            findMasterValue={(activeColorThemeId || activeDensityThemeId) ? findMasterValue : undefined}
            onResetToDefault={(activeColorThemeId || activeDensityThemeId) && !isThemeReadOnly ? handleResetToDefault : undefined}
            onResetGroupToSource={(activeColorThemeId || activeDensityThemeId) ? handleResetGroupToSource : undefined}
            isGroupSource={(activeColorThemeId || activeDensityThemeId) ? isGroupSource : undefined}
            tokenNameMismatch={tokenNameMismatch}
            onPreviewJSON={handlePreviewJSON}
            onDownloadJSON={handleDownloadJSONFromHeader}
            onUndoSnapshot={(snapshot) => {
              undoStackRef.current = [snapshot, ...undoStackRef.current.slice(0, MAX_UNDO - 1)];
            }}
            groups={(activeColorThemeId || activeDensityThemeId) ? undefined : masterGroups}
            />
          }
        />
      </TabsContent>

      <TabsContent
        value="themes"
        className="flex flex-1 min-h-0 m-0 p-0 overflow-hidden"
      >
        {/* Left panel — flat theme list */}
        <aside className="w-52 flex-shrink-0 border-r border-muted flex flex-col overflow-hidden">
          <ThemeList
            flat
            themes={themes}
            selectedColorThemeId={null}
            selectedDensityThemeId={null}
            onSelect={() => {}}
            onAdd={handleAddTheme}
            onDelete={handleDeleteTheme}
            onColorModeChange={handleColorModeChange}
            matrixSelectedId={configuringThemeId}
            onMatrixSelect={setConfiguringThemeId}
          />
        </aside>

        {/* Right panel — group inclusion matrix */}
        <div className="flex-1 overflow-y-auto p-4">
          {(() => {
            const selectedTheme = themes.find(t => t.id === configuringThemeId);
            if (!selectedTheme) {
              return (
                <p className="text-xs text-muted-foreground mt-8 text-center">
                  {themes.length === 0 ? 'No themes yet. Add one to get started.' : 'Select a theme to configure its groups.'}
                </p>
              );
            }
            return (
              <ThemeGroupMatrix
                theme={selectedTheme}
                groups={masterGroups}
                onStateChange={handleGroupStateChange}
                onColorModeChange={handleColorModeChange}
              />
            );
          })()}
        </div>
      </TabsContent>

      <TabsContent
        value="style-guide"
        className="flex flex-1 flex-col min-h-0 m-0 p-0 overflow-hidden"
      >
        <StyleGuideTabPanel
          tokens={allCollectionTokens}
          allGroups={filteredGroups}
          colorGroupsTree={(activeColorThemeId || activeDensityThemeId) ? effectiveThemeTokens : filteredGroups}
        />
      </TabsContent>
      </Tabs>


      {/* AI Chat slide-over */}
      <div className={`fixed top-0 right-0 h-full w-96 z-50 shadow-2xl transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-muted bg-background text-foreground">
          <span className="text-sm font-medium text-foreground">AI Assistant — {collectionName}</span>
          <Button variant="ghost" size="sm" className="px-1" onClick={() => setIsChatOpen(false)}>
            <Close size={16} />
          </Button>
        </div>
        <div className="h-[calc(100%-48px)]">
          <AIChatPanel
            collectionId={id}
            collectionName={collectionName}
            activeThemeId={activeColorThemeId}
            onToolsExecuted={refreshTokens}
          />
        </div>
      </div>

      <SaveCollectionDialog
        isOpen={saveAsDialogOpen}
        onSave={handleSaveAs}
        onCancel={() => setSaveAsDialogOpen(false)}
        isSaving={isSavingAs}
      />

      <ImportFromFigmaDialog
        isOpen={importFigmaOpen}
        onClose={() => setImportFigmaOpen(false)}
        collectionFigmaToken={savedFigmaToken}
        collectionFigmaFileId={savedFigmaFileId}
        onImported={async (collectionId, name) => {
          router.push(`/collections/${collectionId}/tokens`);
          setImportFigmaOpen(false);
          showSuccessToast(`Imported "${name}" from Figma`);
        }}
      />

      {showDirectoryPicker && githubConfig && (
        <GitHubDirectoryPicker
          githubToken={githubConfig.token}
          repository={githubConfig.repository}
          branch={githubConfig.branch}
          onSelect={handleDirectorySelect}
          onCancel={() => setShowDirectoryPicker(false)}
          mode={directoryPickerMode}
          availableBranches={availableBranches}
        />
      )}

      <ExportToFigmaDialog
        isOpen={showExportFigmaDialog}
        onClose={() => setShowExportFigmaDialog(false)}
        tokenSet={dialogTokenSetSnapshot}
        loadedCollectionId={id}
        collectionFigmaToken={savedFigmaToken}
        collectionFigmaFileId={savedFigmaFileId}
      />

      <LoadCollectionDialog
        isOpen={showLoadDialog}
        onLoad={async (collectionId: string) => {
          try {
            const response = await fetch(`/api/collections/${collectionId}`);
            if (response.ok) {
              const { collection } = await response.json();
              // Update form with loaded collection data
              setGenerateTabTokens(collection.tokens);
              generateTabTokensRef.current = collection.tokens;
              setShowLoadDialog(false);
              showSuccessToast(`Loaded "${collection.name}"`);
            } else {
              showErrorToast('Failed to load collection');
            }
          } catch (error) {
            showErrorToast('Failed to load collection');
          }
        }}
        onCancel={() => setShowLoadDialog(false)}
      />

      <ClearFormDialog
        isOpen={showClearDialog}
        onConfirm={handleClearForm}
        onCancel={() => setShowClearDialog(false)}
      />

      <JsonPreviewDialog
        isOpen={showJsonDialog}
        onClose={() => setShowJsonDialog(false)}
        jsonData={dialogTokenSetSnapshot}
      />

      <Dialog open={isAddingGroup} onOpenChange={(open) => { if (!open) { setIsAddingGroup(false); setNewGroupName(''); setAddSubGroupParentId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{addSubGroupParentId ? 'Add Sub-group' : 'Add Token Group'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAddGroup();
                if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); setAddSubGroupParentId(null); }
              }}
              placeholder="Group name (e.g. color / brand)"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddingGroup(false); setNewGroupName(''); setAddSubGroupParentId(null); }}>Cancel</Button>
              <Button onClick={confirmAddGroup}>{addSubGroupParentId ? 'Add Sub-group' : 'Add Group'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
