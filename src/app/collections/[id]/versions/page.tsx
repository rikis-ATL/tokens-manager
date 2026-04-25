'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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

  const [npmPackageName, setNpmPackageName] = useState('');
  const [npmTokenConfigured, setNpmTokenConfigured] = useState(false);

  const [saveSemver, setSaveSemver] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);

  const [restoreId, setRestoreId] = useState<string | null>(null);

  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSemver, setPublishSemver] = useState('');
  /** null = publish from live DB; string = publish from saved snapshot id */
  const [publishVersionId, setPublishVersionId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const npmPublishReady =
    Boolean(npmPackageName?.trim()) && npmTokenConfigured;

  const loadMeta = useCallback(async () => {
    const res = await fetch(`/api/collections/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    const col = data.collection;
    setCollectionName(col.name ?? '');
    setIsPlayground(col.isPlayground ?? false);
    setNpmPackageName(col.npmPackageName ?? '');
    setNpmTokenConfigured(col.npmTokenConfigured ?? false);
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

  useEffect(() => {
    setSelectedVersionIds((prev) => prev.filter((vid) => versions.some((v) => v._id === vid)));
  }, [versions]);

  const toggleVersionSelected = (versionId: string) => {
    setSelectedVersionIds((prev) =>
      prev.includes(versionId) ? prev.filter((x) => x !== versionId) : [...prev, versionId]
    );
  };

  const allSelectableSelected =
    versions.length > 0 && selectedVersionIds.length === versions.length;

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedVersionIds([]);
    } else {
      setSelectedVersionIds(versions.map((v) => v._id));
    }
  };

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

  const executeDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/collections/${id}/versions/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionIds: ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed');
      }
      const n = typeof data.deletedCount === 'number' ? data.deletedCount : ids.length;
      showSuccessToast(n === 1 ? 'Version deleted' : `${n} versions deleted`);
      setPendingDeleteIds(null);
      setSelectedVersionIds((prev) => prev.filter((x) => !ids.includes(x)));
      await loadVersions();
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
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
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const showDeleteControls = canManageVersions && !isPlayground;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Versions</h1>
        <p className="text-sm text-muted-foreground mt-1">{collectionName}</p>
      </div>

      {isPlayground && (
        <div className="rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-warning">
          Playground collections cannot save, restore, or delete versions.
        </div>
      )}

      {canPublishNpm && !isPlayground && !npmPublishReady && (
        <div className="rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-foreground">
          <p className="font-medium text-foreground">NPM publishing not configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a package name and automation token in{' '}
            <Link href={`/collections/${id}/settings`} className="text-primary hover:underline">
              Settings
            </Link>{' '}
            to publish from the live collection or from a saved snapshot.
          </p>
        </div>
      )}

      {canManageVersions && !isPlayground && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Save current state</h2>
          <p className="text-xs text-muted-foreground">
            Captures default tokens, graph state, and all themes as an immutable snapshot. Deleting a
            snapshot does not change the live collection.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Semver</label>
              <Input
                value={saveSemver}
                onChange={(e) => setSaveSemver(e.target.value)}
                placeholder="1.0.0"
                className="w-40"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-muted-foreground mb-1">Note (optional)</label>
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
          <h2 className="text-sm font-semibold text-foreground">Saved versions</h2>
          <div className="flex flex-wrap items-center gap-2">
            {showDeleteControls && selectedVersionIds.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setPendingDeleteIds([...selectedVersionIds])}
              >
                Delete selected ({selectedVersionIds.length})
              </Button>
            )}
            {canPublishNpm && !isPlayground && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openPublish()}
                disabled={!npmPublishReady}
                title={
                  !npmPublishReady
                    ? 'Configure NPM package name and token in Settings'
                    : undefined
                }
              >
                Publish to NPM…
              </Button>
            )}
          </div>
        </div>

        {listLoading ? (
          <p className="text-sm text-muted-foreground">Loading versions…</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {showDeleteControls && (
                    <th className="px-2 py-2 w-10">
                      <Checkbox
                        checked={
                          allSelectableSelected
                            ? true
                            : selectedVersionIds.length > 0
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={() => toggleSelectAll()}
                        aria-label={allSelectableSelected ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                  )}
                  <th className="px-3 py-2">Semver</th>
                  <th className="px-3 py-2">Note</th>
                  <th className="px-3 py-2">Saved</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v._id} className="border-t border-border">
                    {showDeleteControls && (
                      <td className="px-2 py-2 align-middle">
                        <Checkbox
                          checked={selectedVersionIds.includes(v._id)}
                          onCheckedChange={() => toggleVersionSelected(v._id)}
                          aria-label={`Select ${v.semver}`}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono">{v.semver}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.note ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
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
                          disabled={!npmPublishReady}
                          title={
                            !npmPublishReady
                              ? 'Configure NPM package name and token in Settings'
                              : undefined
                          }
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
                      {showDeleteControls && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setPendingDeleteIds([v._id])}
                          aria-label={`Delete version ${v.semver}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AlertDialog
        open={!!pendingDeleteIds}
        onOpenChange={(open) => !open && !deleting && setPendingDeleteIds(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteIds && pendingDeleteIds.length > 1
                ? `Delete ${pendingDeleteIds.length} versions?`
                : 'Delete this version?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved snapshot from history only. The live collection in the editor is
              not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (pendingDeleteIds) void executeDelete(pendingDeleteIds);
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            {!npmPublishReady && (
              <div className="rounded-md border border-warning bg-warning/10 px-3 py-2 text-xs text-warning">
                Configure package name and token under{' '}
                <Link href={`/collections/${id}/settings`} className="font-medium underline">
                  Settings
                </Link>{' '}
                before publishing.
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The published package version must match the semver below.
            </p>
            <p className="text-xs text-foreground">
              <span className="font-medium">Source:</span>{' '}
              {publishVersionId
                ? 'Saved snapshot (this row)'
                : 'Live collection (current database state)'}
            </p>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Package version (semver)</label>
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
            <Button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !npmPublishReady}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
