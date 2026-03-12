'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Info } from 'lucide-react';
import { ToastNotification } from '@/components/ToastNotification';
import { SaveCollectionDialog } from '@/components/SaveCollectionDialog';
import { TokenGeneratorFormNew } from '@/components/TokenGeneratorFormNew';
import { TokenGeneratorDocs } from '@/components/TokenGeneratorDocs';
import { SourceContextBar } from '@/components/SourceContextBar';
import { ImportFromFigmaDialog } from '@/components/ImportFromFigmaDialog';
import { CollectionActions } from '@/components/CollectionActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ToastMessage, TokenGroup } from '@/types';
import type { ISourceMetadata } from '@/types/collection.types';

interface TokensPageProps {
  params: { id: string };
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const router = useRouter();

  const [collectionName, setCollectionName] = useState('');
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);

  // Token groups master panel state
  const [globalNamespace, setGlobalNamespace] = useState('token');
  const [masterGroups, setMasterGroups] = useState<TokenGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [pendingNewGroup, setPendingNewGroup] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    loadCollection();
    return () => { abortControllerRef.current?.abort(); };
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
      setRawCollectionTokens(rawTokens);
      setSelectedSourceMetadata(col.sourceMetadata ?? null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setToast({ message: 'Failed to load collection', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleted = () => router.push('/collections');

  const handleRenamed = (newName: string) => {
    setCollectionName(newName);
    setToast({ message: `Renamed to "${newName}"`, type: 'success' });
  };

  const handleDuplicated = (newId: string, newName: string) => {
    router.push(`/collections/${newId}/tokens`);
    setToast({ message: `Duplicated as "${newName}"`, type: 'success' });
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
        setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
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
          setToast({ message: `Saved as "${collection.name}"`, type: 'success' });
        } else {
          setToast({ message: 'Failed to save collection', type: 'error' });
        }
      } else {
        setToast({ message: 'Failed to save collection', type: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to save collection', type: 'error' });
    } finally {
      setIsSavingAs(false);
    }
  };

  const handleGroupsChange = useCallback(
    (groups: TokenGroup[]) => {
      setMasterGroups(groups);
      setSelectedGroupId(prev => {
        if (prev && groups.some(g => g.id === prev)) return prev;
        return groups[0]?.id ?? '';
      });
    },
    []
  );

  const handleGroupAdded = useCallback((group: { id: string; name: string }) => {
    setPendingNewGroup(null);
    setSelectedGroupId(group.id);
  }, []);

  const confirmAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setPendingNewGroup(name);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap border-b border-gray-200 bg-white px-6 py-3 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={() => setSaveAsDialogOpen(true)}>
          Save As
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportFigmaOpen(true)}>
          Import from Figma
        </Button>
        <CollectionActions
          selectedId={id}
          selectedName={collectionName}
          collections={[{ _id: id, name: collectionName }]}
          onDeleted={handleDeleted}
          onRenamed={handleRenamed}
          onDuplicated={handleDuplicated}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
        />
        <div className="h-4 border-l border-gray-200 mx-1" />
        <label className="text-sm text-gray-600 whitespace-nowrap">Namespace:</label>
        <Input
          value={globalNamespace}
          onChange={(e) => setGlobalNamespace(e.target.value)}
          className="w-32 h-8 text-sm"
          placeholder="e.g. token"
        />
        <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} title="Generator Guide">
          <Info size={16} />
        </Button>
      </div>

      <SourceContextBar sourceMetadata={selectedSourceMetadata} />

      {/* Master-detail layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master: token groups */}
        <aside className="w-56 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Token Groups</span>
            <button
              onClick={() => setIsAddingGroup(true)}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded"
              title="Add group"
            >
              <Plus size={14} />
            </button>
          </div>

          {isAddingGroup && (
            <div className="px-2 py-2 border-b border-gray-200 flex items-center gap-1">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmAddGroup();
                  if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupName(''); }
                }}
                placeholder="Group name..."
                className="h-6 text-xs"
                autoFocus
              />
              <button
                onClick={confirmAddGroup}
                className="text-green-600 hover:text-green-800 text-xs px-1"
              >
                ✓
              </button>
              <button
                onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }}
                className="text-gray-400 hover:text-gray-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          {masterGroups.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-400">No token groups yet.</p>
          )}

          {masterGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`w-full text-left px-4 py-2 text-sm ${
                selectedGroupId === group.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="truncate block">{group.name}</span>
            </button>
          ))}
        </aside>

        {/* Detail: TokenGeneratorFormNew */}
        <main className="flex-1 overflow-y-auto p-6">
          <TokenGeneratorFormNew
            key={id}
            githubConfig={null}
            onTokensChange={(tokens) => setGenerateTabTokens(tokens)}
            collectionToLoad={rawCollectionTokens && Object.keys(rawCollectionTokens).length > 0
              ? { id, name: collectionName, tokens: rawCollectionTokens } : null}
            namespace={globalNamespace}
            onNamespaceChange={setGlobalNamespace}
            onGroupsChange={handleGroupsChange}
            selectedGroupId={selectedGroupId}
            pendingNewGroup={pendingNewGroup}
            onGroupAdded={handleGroupAdded}
            hideNamespaceAndActions={true}
            hideAddGroupButton={true}
          />
        </main>
      </div>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      <SaveCollectionDialog
        isOpen={saveAsDialogOpen}
        onSave={handleSaveAs}
        onCancel={() => setSaveAsDialogOpen(false)}
        isSaving={isSavingAs}
      />

      <ImportFromFigmaDialog
        isOpen={importFigmaOpen}
        onClose={() => setImportFigmaOpen(false)}
        onImported={async (collectionId, name) => {
          router.push(`/collections/${collectionId}/tokens`);
          setImportFigmaOpen(false);
          setToast({ message: `Imported "${name}" from Figma`, type: 'success' });
        }}
      />

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>W3C Design Token Generator Guide</DialogTitle>
          </DialogHeader>
          <TokenGeneratorDocs />
        </DialogContent>
      </Dialog>
    </div>
  );
}
