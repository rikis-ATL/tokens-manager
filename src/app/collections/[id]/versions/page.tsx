'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermissions } from '@/context/PermissionsContext';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import type { ICollectionVersionListItem } from '@/types/collection-version.types';

interface VersionsPageProps {
  params: { id: string };
}

export default function CollectionVersionsPage({ params }: VersionsPageProps) {
  const { id } = params;
  const { canManageVersions, canPublishNpm } = usePermissions();

  const [collectionName, setCollectionName] = useState('');
  const [isPlayground, setIsPlayground] = useState(false);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<ICollectionVersionListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [saveSemver, setSaveSemver] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);

  const [restoreId, setRestoreId] = useState<string | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSemver, setPublishSemver] = useState('');
  /** null = publish from live DB; string = publish from saved snapshot id */
  const [publishVersionId, setPublishVersionId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadMeta = useCallback(async () => {
    const res = await fetch(`/api/collections/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    const col = data.collection;
    setCollectionName(col.name ?? '');
    setIsPlayground(col.isPlayground ?? false);
  }, [id]);

  const loadVersions = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`/api/collections/${id}/versions`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to load versions');
      }
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Failed to load versions');
    } finally {
      setListLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadMeta();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMeta]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleSaveVersion = async () => {
    if (!saveSemver.trim()) {
      showErrorToast('Enter a semver (e.g. 1.0.0)');
      return;
    }
    setSavingVersion(true);
    try {
      const res = await fetch(`/api/collections/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semver: saveSemver.trim(), note: saveNote.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
      }
      showSuccessToast(`Saved version ${saveSemver.trim()}`);
      setSaveSemver('');
      setSaveNote('');
      await loadVersions();
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingVersion(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoreId) return;
    try {
      const res = await fetch(`/api/collections/${id}/versions/${restoreId}/restore`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Restore failed');
      }
      showSuccessToast('Collection restored from version');
      setRestoreId(null);
      await loadMeta();
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Restore failed');
    }
  };

  const openPublish = (defaults?: { semver?: string; versionId?: string | null }) => {
    setPublishSemver(defaults?.semver ?? '');
    setPublishVersionId(defaults?.versionId ?? null);
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!publishSemver.trim()) {
      showErrorToast('Enter package semver to publish');
      return;
    }
    setPublishing(true);
    try {
      const body: {
        version: string;
        source: 'live' | 'version';
        versionId?: string;
      } = {
        version: publishSemver.trim(),
        source: publishVersionId ? 'version' : 'live',
      };
      if (publishVersionId) {
        body.versionId = publishVersionId;
      }
      const res = await fetch(`/api/collections/${id}/publish/npm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Publish failed');
      }
      showSuccessToast(`Published ${data.packageName}@${data.version}`);
      setPublishOpen(false);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/collections/${id}/settings`} className="text-sm text-blue-600 hover:underline">
          Settings
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Versions: {collectionName}</h1>
      </div>

      {isPlayground && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Playground collections cannot save versions or restore.
        </div>
      )}

      {canManageVersions && !isPlayground && (
        <section className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Save current state</h2>
          <p className="text-xs text-gray-500">
            Captures default tokens, graph state, and all themes as an immutable snapshot.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Semver</label>
              <Input
                value={saveSemver}
                onChange={(e) => setSaveSemver(e.target.value)}
                placeholder="1.0.0"
                className="w-40"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-600 mb-1">Note (optional)</label>
              <Input
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                placeholder="Release notes"
              />
            </div>
            <Button type="button" onClick={handleSaveVersion} disabled={savingVersion}>
              {savingVersion ? 'Saving…' : 'Save version'}
            </Button>
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Saved versions</h2>
          {canPublishNpm && !isPlayground && (
            <Button type="button" variant="outline" size="sm" onClick={() => openPublish()}>
              Publish to NPM…
            </Button>
          )}
        </div>

        {listLoading ? (
          <p className="text-sm text-gray-500">Loading versions…</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-500">No versions yet.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Semver</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2">Saved</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v._id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{v.semver}</td>
                    <td className="px-3 py-2 text-gray-600">{v.note ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                      {canPublishNpm && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => openPublish({ semver: v.semver, versionId: v._id })}
                        >
                          Publish
                        </Button>
                      )}
                      {canManageVersions && !isPlayground && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => setRestoreId(v._id)}
                        >
                          Restore
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog open={!!restoreId} onOpenChange={(open) => !open && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This overwrites the current collection tokens, themes, and graph state. Integration
              settings (Figma, GitHub, NPM) are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish to NPM</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-gray-500">
              Configure package name and token under{' '}
              <Link href={`/collections/${id}/settings`} className="text-blue-600 hover:underline">
                Settings
              </Link>
              . The published package version must match the semver below.
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-medium">Source:</span>{' '}
              {publishVersionId
                ? 'Saved snapshot (this row)'
                : 'Live collection (current database state)'}
            </p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Package version (semver)</label>
              <Input
                value={publishSemver}
                onChange={(e) => setPublishSemver(e.target.value)}
                placeholder="1.0.0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
