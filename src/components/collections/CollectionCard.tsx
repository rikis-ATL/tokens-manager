'use client';

import { useRef, useState, useEffect } from 'react';
import { OverflowMenuVertical,Plug, Tag ,Box, EventSchedule} from '@carbon/icons-react';
import type { CollectionCardData } from '@/types/collection.types';
import { Badge } from '../ui/badge';
import { CollectionThemesSummaryChips } from './CollectionThemesSummaryChips';

interface CollectionCardProps {
  collection: CollectionCardData;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
  onClick: (id: string) => void;
}

export function CollectionCard({
  collection,
  onRename,
  onDelete,
  onDuplicate,
  onEdit,
  onClick,
}: CollectionCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(collection.name);
  const [isRenamePending, setIsRenamePending] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleKebabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const handleRenameSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(collection.name);
    setIsMenuOpen(false);
    setIsRenaming(true);
  };

  const handleEditSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit(collection._id);
  };

  const handleDuplicateSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDuplicate(collection._id);
  };

  const handleDeleteSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete(collection._id);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === collection.name) {
      setIsRenaming(false);
      return;
    }
    setIsRenamePending(true);
    try {
      await onRename(collection._id, trimmed);
    } finally {
      setIsRenamePending(false);
      setIsRenaming(false);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  const formattedDate = new Date(collection.updatedAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

  const themeTotal =
    collection.themesSummary.colorLight +
    collection.themesSummary.colorDark +
    collection.themesSummary.density;
  const showTagsRow = collection.tags.length > 0 || themeTotal > 0;

  return (
    <div
      className="relative bg-card rounded-lg min-h-[150px] border border-border p-4 cursor-pointer hover:shadow-md hover:border-border transition-all group"
      onClick={() => onClick(collection._id)}
    >

      {/* Color swatch accent bar */}
      {collection.accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ backgroundColor: collection.accentColor }}
        />
      )}

      {/* Kebab menu button */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="p-1 rounded hover:bg-muted transition-opacity"
          onClick={handleKebabClick}
          aria-label="Collection options"
        >
          <OverflowMenuVertical size={16} className="text-muted-foreground" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-7 z-10 w-36 bg-card border border-border rounded-md shadow-lg py-1">
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-background"
              onClick={handleRenameSelect}
            >
              Rename
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-background"
              onClick={handleEditSelect}
            >
              Edit details
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-background"
              onClick={handleDuplicateSelect}
            >
              Duplicate
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              onClick={handleDeleteSelect}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between gap-1 h-full">


      <header className="flex flex-col">
        {/* Title / Inline rename */}
        {isRenaming ? (
          <input
            ref={inputRef}
            autoFocus
            className="w-full text-foreground font-semibold text-base border border-border rounded px-1 py-0.5 pr-6 mb-1 focus:outline-none focus:ring-2 focus:ring-primary"
            value={renameValue}
            disabled={isRenamePending}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="text-foreground font-semibold text-base truncate pr-6">
            {collection.name}
          </h3>
        )}

        <div className="flex items-center gap-3 justify-between text-xs text-muted-foreground">
          <span>{collection.tokenCount} tokens</span>
          <span className="flex items-center gap-1"> <EventSchedule size={12} className="mr-1" />{formattedDate}</span>
        </div>
      </header>

    <div className="flex flex-col h-full flex-grow gap-1">
      {/* Description */}
      {collection.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {collection.description}
        </p>
      )}

      {/* Tags + theme summary */}
      {showTagsRow && (
        <div className="flex flex-wrap gap-1 mt-2">
          {collection.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              <Tag size={12} className="text-info mr-1" />
              {tag}
            </Badge>
          ))}
          <CollectionThemesSummaryChips summary={collection.themesSummary} />
        </div>
      )}
</div>



      {/* Integration badges */}
      {(collection.figmaConfigured || collection.githubConfigured || collection.isPlayground) && (
        <div className="flex gap-1.5 mt-2">
          {collection.isPlayground && (
            <Badge variant="default" title="Playground" className="bg-info"><Box size={12} className="mr-1" />Playground</Badge>
          )}
          {collection.figmaConfigured && (
            <Badge variant="default" title="Figma"><Plug size={12} className="text-success mr-1" /> Figma</Badge>
          )}
          {collection.githubConfigured && (
            <Badge variant="default" title="GitHub"><Plug size={12} className="text-success mr-1" /> GitHub</Badge>
          )}
        </div>
      )}
    </div>

    </div>

  );
}
