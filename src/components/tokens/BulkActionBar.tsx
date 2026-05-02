'use client';

import { useEffect, useRef } from 'react';
import { Close, TrashCan, ArrowRight, ColorPalette, TextFont } from '@carbon/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar';
import { TokenGroup, TokenType, TOKEN_TYPES } from '@/types/token.types';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { GroupPickerModal } from './GroupPickerModal';
import { ColorFormatDialog } from './ColorFormatDialog';
import { type ColorFormat } from '@/utils/color.utils';
import { useState } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  groups: TokenGroup[];
  sourceGroupId: string;
  isReadOnly: boolean;
  prefixValue: string;
  selectedColorCount?: number;
  selectedColorPreviews?: Array<{ path: string; value: string }>;
  onDelete: () => void;
  onMoveToGroup: (destGroupId: string) => void;
  onChangeType: (type: TokenType) => void;
  onChangeColorFormat?: (format: ColorFormat) => void;
  onPrefixFocus: () => void;
  onPrefixChange: (value: string) => void;
  onPrefixBlur: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  groups,
  sourceGroupId,
  isReadOnly,
  prefixValue,
  selectedColorCount = 0,
  selectedColorPreviews = [],
  onDelete,
  onMoveToGroup,
  onChangeType,
  onChangeColorFormat,
  onPrefixFocus,
  onPrefixChange,
  onPrefixBlur,
  onClearSelection,
}: BulkActionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);

  if (isReadOnly || selectedCount === 0) return null;

  const hasColorTokens = selectedColorCount > 0;

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClearSelection();
        }}
      >
        <Menubar className="h-auto px-2 py-1.5 gap-1 shadow-lg border-border bg-card">
          {/* Selection count */}
          <span className="text-xs font-medium text-muted-foreground px-2 select-none">
            {selectedCount} selected
          </span>

          <div className="w-px h-4 bg-muted mx-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
            title="Delete selected tokens"
          >
            <TrashCan size={16} className="shrink-0 scale-90" />
          </Button>

          {/* Move */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setMoveOpen(true)}
            title="Move to another group"
          >
            <ArrowRight size={16} className="shrink-0 scale-90" />
          </Button>

          {/* Change type */}
          <MenubarMenu>
            <MenubarTrigger 
              className="h-7 w-7 p-0 font-normal cursor-pointer flex items-center justify-center" 
              title="Change token type"
            >
              <TextFont size={16} className="shrink-0 scale-90" />
            </MenubarTrigger>
            <MenubarContent>
              {TOKEN_TYPES.map((type) => (
                <MenubarItem
                  key={type}
                  className="text-xs"
                  onSelect={() => onChangeType(type as TokenType)}
                >
                  {type}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>

          {/* Change format (only for color tokens) */}
          {hasColorTokens && onChangeColorFormat && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setFormatOpen(true)}
              title="Change color format"
            >
              <ColorPalette size={16} className="shrink-0 scale-90" />
            </Button>
          )}

          <div className="w-px h-4 bg-muted mx-1" />

          {/* Prefix — single live-edit control */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground select-none">Prefix</span>
            <Input
              value={prefixValue}
              onFocus={onPrefixFocus}
              onChange={(e) => onPrefixChange(e.target.value)}
              onBlur={onPrefixBlur}
              placeholder="token-prefix-"
              className="h-7 w-36 text-xs font-mono"
            />
          </div>

          <div className="w-px h-4 bg-muted mx-1" />

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClearSelection}
            title="Clear selection (Esc)"
          >
            <Close size={16} className="shrink-0 scale-90 text-muted-foreground" />
          </Button>
        </Menubar>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        count={selectedCount}
        onConfirm={() => {
          onDelete();
          setDeleteOpen(false);
        }}
        onCancel={() => setDeleteOpen(false)}
      />

      <GroupPickerModal
        open={moveOpen}
        groups={groups}
        sourceGroupId={sourceGroupId}
        onSelect={(id) => {
          onMoveToGroup(id);
          setMoveOpen(false);
        }}
        onCancel={() => setMoveOpen(false)}
      />

      {hasColorTokens && onChangeColorFormat && (
        <ColorFormatDialog
          open={formatOpen}
          selectedCount={selectedCount}
          colorTokenCount={selectedColorCount}
          previewTokens={selectedColorPreviews}
          onConfirm={(format) => {
            onChangeColorFormat(format);
            setFormatOpen(false);
          }}
          onCancel={() => setFormatOpen(false)}
        />
      )}
    </>
  );
}
