'use client';

import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Pencil, Plus, Slash, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type FlatNode, type DropMode } from '@/utils/groupMove';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SortableGroupRowProps {
  node: FlatNode;
  isSelected: boolean;
  onSelect: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
  onRenameGroup?: (groupId: string, newLabel: string) => void;
  onToggleOmitFromPath?: (groupId: string) => void;
  isDragOverlay?: boolean;
  /** Drop intent for THIS row when it is the active over-target. Null when not targeted. */
  dropIntent?: DropMode | null;
  isCollapsed?: boolean;
  onToggleCollapse?: (groupId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowClassName(node: FlatNode, isSelected: boolean): string {
  const base = 'group/item flex items-center pr-1 text-sm cursor-pointer transition-colors';
  const selected = isSelected
    ? 'bg-indigo-50 text-indigo-900 font-medium'
    : 'hover:bg-gray-100 text-gray-700';
  return `${base} ${selected}`;
}

// ---------------------------------------------------------------------------
// Inline rename input
// ---------------------------------------------------------------------------

interface InlineLabelProps {
  displayLabel: string;
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onEditValueChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
}

function InlineLabel({
  displayLabel,
  isEditing,
  editValue,
  inputRef,
  onEditValueChange,
  onCommit,
  onCancel,
  onStartEdit,
}: InlineLabelProps) {
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="flex-1 py-0.5 px-1 text-xs rounded border border-indigo-400 bg-white outline-none min-w-0"
        value={editValue}
        onClick={e => e.stopPropagation()}
        onChange={e => onEditValueChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          e.stopPropagation();
        }}
      />
    );
  }

  return (
    <span
      className="flex-1 py-1.5 truncate text-xs"
      onDoubleClick={e => { e.stopPropagation(); onStartEdit(); }}
    >
      {displayLabel}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Group actions dropdown
// ---------------------------------------------------------------------------

interface GroupActionsProps {
  node: FlatNode;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
  onRenameGroup?: (groupId: string, newLabel: string) => void;
  onToggleOmitFromPath?: (groupId: string) => void;
  onStartRename: () => void;
}

function GroupActions({
  node,
  onDeleteGroup,
  onAddSubGroup,
  onRenameGroup,
  onToggleOmitFromPath,
  onStartRename,
}: GroupActionsProps) {
  const hasActions = onDeleteGroup || onAddSubGroup || onRenameGroup || onToggleOmitFromPath;
  if (!hasActions) return null;

  const isOmitted = node.group.omitFromPath;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-all flex-shrink-0"
          onClick={e => e.stopPropagation()}
          title="Group actions"
        >
          <MoreHorizontal size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={e => e.stopPropagation()}>
        {onRenameGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={e => { e.preventDefault(); onStartRename(); }}
          >
            <Pencil size={12} /> Rename
          </DropdownMenuItem>
        )}
        {onToggleOmitFromPath && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onToggleOmitFromPath(node.group.id)}
          >
            <Slash size={12} className={isOmitted ? 'text-amber-500' : ''} />
            {isOmitted ? 'Include name in output' : 'Skip name in output'}
          </DropdownMenuItem>
        )}
        {(onRenameGroup || onToggleOmitFromPath) && onAddSubGroup && <DropdownMenuSeparator />}
        {onAddSubGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddSubGroup(node.group.id)}
          >
            <Plus size={12} /> Add Sub-group
          </DropdownMenuItem>
        )}
        {onAddSubGroup && onDeleteGroup && <DropdownMenuSeparator />}
        {!onAddSubGroup && (onRenameGroup || onToggleOmitFromPath) && onDeleteGroup && <DropdownMenuSeparator />}
        {onDeleteGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs text-red-600 focus:text-red-700"
            onClick={() => onDeleteGroup(node.group.id)}
          >
            <Trash2 size={12} /> Delete Group
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SortableGroupRow({
  node,
  isSelected,
  onSelect,
  onDeleteGroup,
  onAddSubGroup,
  onRenameGroup,
  onToggleOmitFromPath,
  isDragOverlay = false,
  dropIntent,
  isCollapsed,
  onToggleCollapse,
}: SortableGroupRowProps) {
  // Static overlay version — no sortable hooks, no transform, no ring
  if (isDragOverlay) {
    return (
      <div
        style={{ paddingLeft: node.depth * 14 + 8 }}
        className={rowClassName(node, isSelected)}
      >
        <GripVertical size={12} className="text-gray-300 mr-1 flex-shrink-0" />
        <span className="flex-1 py-1.5 truncate text-xs">{node.displayLabel}</span>
      </div>
    );
  }

  return <SortableRowInner
    node={node}
    isSelected={isSelected}
    onSelect={onSelect}
    onDeleteGroup={onDeleteGroup}
    onAddSubGroup={onAddSubGroup}
    onRenameGroup={onRenameGroup}
    onToggleOmitFromPath={onToggleOmitFromPath}
    dropIntent={dropIntent}
    isCollapsed={isCollapsed}
    onToggleCollapse={onToggleCollapse}
  />;
}

// Inner component keeps hook calls unconditional (hooks rules)
function SortableRowInner({
  node,
  isSelected,
  onSelect,
  onDeleteGroup,
  onAddSubGroup,
  onRenameGroup,
  onToggleOmitFromPath,
  dropIntent,
  isCollapsed,
  onToggleCollapse,
}: Omit<SortableGroupRowProps, 'isDragOverlay'>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.group.id });

  // Separate droppable area for the drag icon (handles 'into' drops)
  const {
    setNodeRef: setDragIconDropRef,
    isOver: isDragIconOver,
  } = useDroppable({
    id: `${node.group.id}-drag-icon`,
  });

  const style: React.CSSProperties = {
    paddingLeft: node.depth * 14 + 8,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const hasChildren = (node.group.children?.length ?? 0) > 0;

  function startEdit() {
    setEditValue(node.displayLabel);
    setIsEditing(true);
    // Defer focus until after Radix dropdown finishes its own focus management
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== node.displayLabel && onRenameGroup) {
      onRenameGroup(node.group.id, trimmed);
    }
    setIsEditing(false);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  const dropIntoRing = dropIntent === 'into' ? 'ring-2 ring-inset ring-blue-400 rounded' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${rowClassName(node, isSelected)} ${dropIntoRing}`}
      {...attributes}
      onClick={e => { e.stopPropagation(); if (!isEditing) onSelect(node.group.id); }}
    >
      {/* Insertion line — top (before) */}
      {dropIntent === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 pointer-events-none" />
      )}

      {/* Insertion line — bottom (after) */}
      {dropIntent === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10 pointer-events-none" />
      )}

      {/* Drag handle with expanded drop zone — hidden while editing */}
      <div
        ref={setDragIconDropRef}
        className={`flex-shrink-0 ${isEditing ? 'pointer-events-none opacity-0' : ''}`}
      >
        <button
          {...(isEditing ? {} : listeners)}
          className={`p-2 text-gray-300 flex-shrink-0 transition-all ${
            isEditing 
              ? 'pointer-events-none opacity-0' 
              : 'cursor-grab hover:text-gray-500'
          }`}
          title="Drag to reorder"
          tabIndex={-1}
          aria-hidden={isEditing}
        >
          <GripVertical size={12} />
        </button>
      </div>

      {/* Expand/collapse caret for groups with children */}
      {hasChildren ? (
        <button
          className="p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0 -ml-0.5 mr-0.5"
          onClick={e => { e.stopPropagation(); onToggleCollapse?.(node.group.id); }}
          tabIndex={-1}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        </button>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* Label / inline input */}
      <InlineLabel
        displayLabel={node.displayLabel}
        isEditing={isEditing}
        editValue={editValue}
        inputRef={editInputRef}
        onEditValueChange={setEditValue}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        onStartEdit={startEdit}
      />

      {/* omitFromPath badge */}
      {node.group.omitFromPath && !isEditing && (
        <span title="Name omitted from output path" className="text-amber-400 flex-shrink-0">
          <Slash size={10} />
        </span>
      )}

      {/* Per-item actions menu — hidden while editing */}
      {!isEditing && (
        <GroupActions
          node={node}
          onDeleteGroup={onDeleteGroup}
          onAddSubGroup={onAddSubGroup}
          onRenameGroup={onRenameGroup}
          onToggleOmitFromPath={onToggleOmitFromPath}
          onStartRename={startEdit}
        />
      )}
    </div>
  );
}
