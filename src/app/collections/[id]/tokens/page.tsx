'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ToastNotification } from '@/components/ToastNotification';
import { SaveCollectionDialog } from '@/components/SaveCollectionDialog';
import { TokenGeneratorFormNew } from '@/components/TokenGeneratorFormNew';
import { TokenGeneratorDocs } from '@/components/TokenGeneratorDocs';
import { SourceContextBar } from '@/components/SourceContextBar';
import { ImportFromFigmaDialog } from '@/components/ImportFromFigmaDialog';
import { CollectionActions } from '@/components/CollectionActions';
import { Button } from '@/components/ui/button';
import type { ToastMessage } from '@/types';
import type { ISourceMetadata } from '@/types/collection.types';

/** Return the unique section names (first path segment) from the raw token map. */
function getSections(tokens: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  for (const filePath of Object.keys(tokens)) {
    seen.add(filePath.split('/')[0]);
  }
  return Array.from(seen);
}

/** Count leaf tokens inside a raw file-keyed token blob for a given section. */
function countSectionTokens(tokens: Record<string, unknown>, section: string): number {
  let count = 0;
  function walk(node: unknown) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const obj = node as Record<string, unknown>;
    if (('value' in obj && 'type' in obj) || ('$value' in obj && '$type' in obj)) {
      count++;
      return;
    }
    for (const v of Object.values(obj)) walk(v);
  }
  for (const [filePath, data] of Object.entries(tokens)) {
    if (filePath.split('/')[0] === section) walk(data);
  }
  return count;
}

/** Filter raw tokens to only include file paths belonging to the given section. */
function filterBySection(
  tokens: Record<string, unknown>,
  section: string
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tokens).filter(([filePath]) => filePath.split('/')[0] === section)
  );
}

interface TokensPageProps {
  params: { id: string };
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const router = useRouter();

  const [collectionName, setCollectionName] = useState('');
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);

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
      const sectionList = getSections(rawTokens);
      setSections(sectionList);
      if (sectionList.length > 0) setSelectedSection(sectionList[0]);
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

  // Tokens passed to the generator — scoped to the selected section if one exists
  const scopedTokens =
    rawCollectionTokens && selectedSection
      ? filterBySection(rawCollectionTokens, selectedSection)
      : rawCollectionTokens ?? {};

  // Virtual collection id — changes when section changes so the form re-loads
  const scopedCollectionId = selectedSection ? `${id}-${selectedSection}` : id;

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
      </div>

      <SourceContextBar sourceMetadata={selectedSourceMetadata} />

      {/* Master-detail layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master: token groups */}
        <aside className="w-56 border-r border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            Token Groups
          </div>

          {sections.length === 0 && (
            <p className="px-4 py-3 text-xs text-gray-400">No token groups yet.</p>
          )}

          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setSelectedSection(section)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                selectedSection === section
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="truncate">{section}</span>
              {rawCollectionTokens && (
                <span className={`text-xs ml-1 flex-shrink-0 ${selectedSection === section ? 'text-gray-300' : 'text-gray-400'}`}>
                  {countSectionTokens(rawCollectionTokens, section)}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Detail: TokenGeneratorFormNew scoped to selected section */}
        <main className="flex-1 overflow-y-auto p-6">
          {sections.length === 0 && !rawCollectionTokens && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-1">
                Create W3C Design Token Specification Compliant Tokens
              </h2>
              <p className="text-gray-600 text-sm">
                Generate design tokens that follow the W3C Design Tokens specification with proper value, type, and attributes.
              </p>
            </div>
          )}
          <TokenGeneratorDocs />
          <TokenGeneratorFormNew
            key={scopedCollectionId}
            githubConfig={null}
            onTokensChange={(tokens) => setGenerateTabTokens(tokens)}
            collectionToLoad={
              Object.keys(scopedTokens).length > 0
                ? { id: scopedCollectionId, name: `${collectionName}${selectedSection ? ` / ${selectedSection}` : ''}`, tokens: scopedTokens }
                : null
            }
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
    </div>
  );
}
