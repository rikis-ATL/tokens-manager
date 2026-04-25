'use client';

import { useRef, useState, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import type { CollectionCardData } from '@/types/collection.types';

interface CollectionTableViewProps {
  collections: CollectionCardData[];
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
  onClick: (id: string) => void;
}

export function CollectionTableView({
  collections,
  onRename,
  onDelete,
  onDuplicate,
  onEdit,
  onClick,
}: CollectionTableViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenamePending, setIsRenamePending] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleKebabClick = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === collectionId ? null : collectionId));
  };

  const handleRenameSelect = (e: React.MouseEvent, collection: CollectionCardData) => {
    e.stopPropagation();
    setRenameValue(collection.name);
    setOpenMenuId(null);
    setRenamingId(collection._id);
  };

  const handleEditSelect = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onEdit(collectionId);
  };

  const handleDuplicateSelect = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onDuplicate(collectionId);
  };

  const handleDeleteSelect = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onDelete(collectionId);
  };

  const commitRename = async (collectionId: string, originalName: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === originalName) {
      setRenamingId(null);
      return;
    }
    setIsRenamePending(true);
    try {
      await onRename(collectionId, trimmed);
    } finally {
      setIsRenamePending(false);
      setRenamingId(null);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, collectionId: string, originalName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename(collectionId, originalName);
    } else if (e.key === 'Escape') {
      setRenamingId(null);
    }
  };

  const getThemeDisplay = (collection: CollectionCardData) => {
    if (collection.themesCount === 0) {
      return <span className="text-muted-foreground">—</span>;
    }
    const hasLightDark = collection.themesCount >= 2;
    if (hasLightDark) {
      return <span className="text-sm text-foreground">Light, Dark{collection.themesCount > 2 ? `, +${collection.themesCount - 2}` : ''}</span>;
    }
    return <span className="text-sm text-foreground">{collection.themesCount} theme{collection.themesCount > 1 ? 's' : ''}</span>;
  };

  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-8">
              {/* Color swatch column */}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tags
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Themes
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Connection
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Token Count
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Last Updated
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {collections.map((collection) => {
            const formattedDate = new Date(collection.updatedAt).toLocaleDateString();
            const isRenaming = renamingId === collection._id;

            return (
              <tr
                key={collection._id}
                onClick={() => onClick(collection._id)}
                className="hover:bg-background cursor-pointer transition-colors group"
              >
                {/* Color swatch */}
                <td className="px-4 py-3">
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: collection.accentColor ?? '#e5e7eb' }}
                    title={collection.accentColor ?? 'No color set'}
                  />
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  {isRenaming ? (
                    <input
                      ref={inputRef}
                      autoFocus
                      className="w-full text-sm text-foreground font-medium border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                      value={renameValue}
                      disabled={isRenamePending}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, collection._id, collection.name)}
                      onBlur={() => commitRename(collection._id, collection.name)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{collection.name}</span>
                      {collection.isPlayground && (
                        <span className="bg-warning/10 text-warning text-xs px-1.5 py-0.5 rounded border border-warning flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                          Playground
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* Description */}
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-sm text-muted-foreground truncate">
                    {collection.description || <span className="text-muted-foreground">—</span>}
                  </p>
                </td>

                {/* Tags */}
                <td className="px-4 py-3">
                  {collection.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {collection.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {collection.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{collection.tags.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Themes */}
                <td className="px-4 py-3">
                  {getThemeDisplay(collection)}
                </td>

                {/* Connection */}
                <td className="px-4 py-3">
                  {(collection.figmaConfigured || collection.githubConfigured) ? (
                    <div className="flex gap-1">
                      {collection.figmaConfigured && (
                        <span className="bg-success/10 text-success text-xs px-1.5 py-0.5 rounded border border-success flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                          Figma
                        </span>
                      )}
                      {collection.githubConfigured && (
                        <span className="bg-success/10 text-success text-xs px-1.5 py-0.5 rounded border border-success flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                          GitHub
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Token count */}
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">{collection.tokenCount}</span>
                </td>

                {/* Last Updated */}
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">{formattedDate}</span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => handleKebabClick(e, collection._id)}
                    aria-label="Collection options"
                  >
                    <MoreVertical size={16} className="text-muted-foreground" />
                  </button>

                  {openMenuId === collection._id && (
                    <div
                      ref={menuRef}
                      className="absolute right-8 top-8 z-10 w-36 bg-card border border-border rounded-md shadow-lg py-1"
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-background"
                        onClick={(e) => handleRenameSelect(e, collection)}
                      >
                        Rename
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-background"
                        onClick={(e) => handleEditSelect(e, collection._id)}
                      >
                        Edit details
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-background"
                        onClick={(e) => handleDuplicateSelect(e, collection._id)}
                      >
                        Duplicate
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteSelect(e, collection._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
