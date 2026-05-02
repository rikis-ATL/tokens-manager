'use client';

import { useRef, useState, useEffect } from 'react';
import {
  OverflowMenuVertical,
  Plug,
  Tag,
  Box,
  EventSchedule,
} from '@carbon/icons-react';
import type { CollectionCardData } from '@/types/collection.types';
import { Badge } from '../ui/badge';
import { CollectionThemesSummaryChips } from './CollectionThemesSummaryChips';

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

  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-8">
              <span className="sr-only">Accent</span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tags</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Themes</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Connection</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Token count</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Last updated</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {collections.map((collection) => {
            const formattedDate = new Date(collection.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: '2-digit',
            });
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
                    <span className="text-sm font-medium text-foreground">{collection.name}</span>
                  )}
                </td>

                {/* Description */}
                <td className="px-4 py-3 max-w-xs">
                  {collection.description?.trim() ? (
                    <p className="text-sm text-foreground truncate">{collection.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </td>

                {/* Tags */}
                <td className="px-4 py-3">
                  {collection.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {collection.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          <Tag size={12} className="text-info mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {collection.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{collection.tags.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                {/* Themes */}
                <td className="px-4 py-3">
                  <CollectionThemesSummaryChips
                    summary={collection.themesSummary}
                    whenEmpty={<span className="text-sm text-muted-foreground">—</span>}
                  />
                </td>

                {/* Connection */}
                <td className="px-4 py-3">
                  {collection.figmaConfigured || collection.githubConfigured || collection.isPlayground ? (
                    <div className="flex flex-wrap gap-1.5">
                      {collection.isPlayground && (
                        <Badge variant="default" title="Playground" className="bg-info">
                          <Box size={12} className="mr-1" />
                          Playground
                        </Badge>
                      )}
                      {collection.figmaConfigured && (
                        <Badge variant="default" title="Figma">
                          <Plug size={12} className="text-success mr-1" /> Figma
                        </Badge>
                      )}
                      {collection.githubConfigured && (
                        <Badge variant="default" title="GitHub">
                          <Plug size={12} className="text-success mr-1" /> GitHub
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                {/* Token count */}
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">{collection.tokenCount}</span>
                </td>

                {/* Last Updated */}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <EventSchedule size={12} className="text-info shrink-0" />
                    {formattedDate}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => handleKebabClick(e, collection._id)}
                    aria-label="Collection options"
                  >
                    <OverflowMenuVertical size={16} className="text-muted-foreground" />
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
