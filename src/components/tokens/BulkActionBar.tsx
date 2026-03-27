'use client';

import { useEffect, useRef } from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
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
import { useState } from 'react';

interface BulkActionBarProps {
  selectedCount: number;
  groups: TokenGroup[];
  sourceGroupId: string;
  isReadOnly: boolean;
  prefixValue: string;
  onDelete: () => void;
  onMoveToGroup: (destGroupId: string) => void;
  onChangeType: (type: TokenType) => void;
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
  onDelete,
  onMoveToGroup,
  onChangeType,
  onPrefixFocus,
  onPrefixChange,
  onPrefixBlur,
  onClearSelection,
}: BulkActionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  if (isReadOnly || selectedCount === 0) return null;

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClearSelection();
        }}
      >
        <Menubar className="h-auto px-2 py-1.5 gap-1 shadow-lg border-gray-300 bg-white">
          {/* Selection count */}
          <span className="text-xs font-medium text-gray-500 px-2 select-none">
            {selectedCount} selected
          </span>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete
          </Button>

          {/* Move */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMoveOpen(true)}
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1" />
            Move
          </Button>

          {/* Change type */}
          <MenubarMenu>
            <MenubarTrigger className="h-7 px-2 text-xs font-normal cursor-pointer">
              Change type
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

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Prefix — single live-edit control */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 select-none">Prefix</span>
            <Input
              value={prefixValue}
              onFocus={onPrefixFocus}
              onChange={(e) => onPrefixChange(e.target.value)}
              onBlur={onPrefixBlur}
              placeholder="token-prefix-"
              className="h-7 w-36 text-xs font-mono"
            />
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
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
    </>
  );
}
