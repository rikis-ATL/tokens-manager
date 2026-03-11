'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TokenTable } from '@/components/TokenTable';
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

interface Token {
  value: string;
  type: string;
  attributes?: Record<string, unknown>;
  resolvedValue?: string;
}

interface TokenGroup {
  path: string;
  token: Token;
  filePath: string;
  section: string;
}

/**
 * Flatten MongoDB token data into the Record<string, TokenGroup[]> shape expected by TokenTable.
 * Ported from the original home page — same flatten/resolve logic.
 */
function flattenMongoTokens(
  tokens: Record<string, unknown>
): Record<string, TokenGroup[]> {
  const result: Record<string, TokenGroup[]> = {};

  function walk(node: Record<string, unknown>, currentPath: string, filePath: string, section: string) {
    if (('value' in node && 'type' in node) || ('$value' in node && '$type' in node)) {
      const rawValue = node.$value ?? node.value;
      const rawType = node.$type ?? node.type;
      if (!result[section]) result[section] = [];
      result[section].push({
        path: currentPath,
        token: {
          value: String(rawValue),
          type: typeof rawType === 'string' ? rawType : 'other',
        },
        filePath,
        section,
      });
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        walk(child as Record<string, unknown>, childPath, filePath, section);
      }
    }
  }

  for (const filePath of Object.keys(tokens)) {
    const section = filePath.split('/')[0];
    const fileData = tokens[filePath];
    if (fileData && typeof fileData === 'object' && !Array.isArray(fileData)) {
      walk(fileData as Record<string, unknown>, '', filePath, section);
    }
  }

  for (const section of Object.keys(result)) {
    for (const group of result[section]) {
      group.path = group.path.replace(/^\./, '');
    }
  }

  // Resolve token references
  const pathMap = new Map<string, string>();
  for (const groups of Object.values(result)) {
    for (const g of groups) pathMap.set(g.path, g.token.value);
  }
  const resolveRef = (val: string, depth = 0): string => {
    if (depth > 10 || !val.startsWith('{') || !val.endsWith('}')) return val;
    let ref = val.slice(1, -1);
    if (ref.endsWith('.value')) ref = ref.slice(0, -6);
    if (pathMap.has(ref)) return resolveRef(pathMap.get(ref)!, depth + 1);
    for (const [path, v] of pathMap.entries()) {
      if (ref.endsWith('.' + path)) return resolveRef(v, depth + 1);
    }
    return val;
  };
  for (const groups of Object.values(result)) {
    for (const g of groups) {
      if (g.token.value.startsWith('{')) {
        const resolved = resolveRef(g.token.value);
        if (resolved !== g.token.value) g.token.resolvedValue = resolved;
      }
    }
  }

  return result;
}

const GENERATE_SECTION = '__generate__';

interface TokensPageProps {
  params: { id: string };
}

export default function CollectionTokensPage({ params }: TokensPageProps) {
  const { id } = params;
  const router = useRouter();

  const [collectionName, setCollectionName] = useState('');
  const [tokenData, setTokenData] = useState<Record<string, TokenGroup[]>>({});
  const [selectedSection, setSelectedSection] = useState<string>(GENERATE_SECTION);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [rawCollectionTokens, setRawCollectionTokens] = useState<Record<string, unknown> | null>(null);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [importFigmaOpen, setImportFigmaOpen] = useState(false);
  const [selectedSourceMetadata, setSelectedSourceMetadata] = useState<ISourceMetadata | null>(null);
  const [generateTabTokens, setGenerateTabTokens] = useState<Record<string, unknown> | null>(null);
  const [generateFormKey, setGenerateFormKey] = useState(0);

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
    setTableLoading(true);
    try {
      const res = await fetch(`/api/collections/${id}`, {
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error('Failed to load collection');
      const data = await res.json();
      const col = data.collection ?? data;
      setCollectionName(col.name ?? '');
      setRawCollectionTokens(col.tokens ?? null);
      setSelectedSourceMetadata(col.sourceMetadata ?? null);
      const transformed = flattenMongoTokens(col.tokens ?? {});
      setTokenData(transformed);
      const sections = Object.keys(transformed);
      if (sections.length > 0) setSelectedSection(sections[0]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setToast({ message: 'Failed to load collection', type: 'error' });
    } finally {
      setLoading(false);
      setTableLoading(false);
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
        const data = await res.json();
        const putRes = await fetch(`/api/collections/${data.existingId}`, {
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

  const saveToken = async (filePath: string, tokenPayload: unknown) => {
    try {
      const res = await fetch(`/api/tokens/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenPayload),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const sections = Object.keys(tokenData);

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
            <p className="px-4 py-3 text-xs text-gray-400">No tokens yet.</p>
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
              <span className={`text-xs ml-1 flex-shrink-0 ${selectedSection === section ? 'text-gray-300' : 'text-gray-400'}`}>
                {tokenData[section].length}
              </span>
            </button>
          ))}

          <div className="border-t border-gray-200 mt-2">
            <button
              onClick={() => setSelectedSection(GENERATE_SECTION)}
              className={`w-full text-left px-4 py-2 text-sm ${
                selectedSection === GENERATE_SECTION
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              + Generate Tokens
            </button>
          </div>
        </aside>

        {/* Detail panel */}
        <main className="flex-1 overflow-y-auto">
          {tableLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {!tableLoading && selectedSection === GENERATE_SECTION && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-1">
                  Create W3C Design Token Specification Compliant Tokens
                </h2>
                <p className="text-gray-600 text-sm">
                  Generate design tokens that follow the W3C Design Tokens specification with proper value, type, and attributes.
                </p>
              </div>
              <TokenGeneratorDocs />
              <TokenGeneratorFormNew
                key={generateFormKey}
                githubConfig={null}
                onTokensChange={(tokens) => setGenerateTabTokens(tokens)}
                collectionToLoad={
                  rawCollectionTokens
                    ? { id, name: collectionName, tokens: rawCollectionTokens }
                    : null
                }
              />
            </div>
          )}

          {!tableLoading && selectedSection !== GENERATE_SECTION && tokenData[selectedSection] && (
            <div className="p-6">
              <h2 className="text-base font-medium text-gray-900 mb-4">{selectedSection}</h2>
              <TokenTable
                section={selectedSection}
                tokens={tokenData[selectedSection]}
                onSave={saveToken}
              />
            </div>
          )}

          {!tableLoading && selectedSection !== GENERATE_SECTION && !tokenData[selectedSection] && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Select a token group from the left panel.
            </div>
          )}
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
