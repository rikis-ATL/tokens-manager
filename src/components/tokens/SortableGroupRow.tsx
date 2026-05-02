'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  DragVertical,
  OverflowMenuHorizontal,
  Edit,
  Add,
  TableSplit,
  TrashCan,
} from '@carbon/icons-react';
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
    ? 'bg-info/10 text-foreground font-medium'
    : 'hover:bg-muted text-foreground';
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
        className="flex-1 py-0.5 px-1 text-xs rounded border border-primary/50 bg-card outline-none min-w-0"
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
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
          onClick={e => e.stopPropagation()}
          title="Group actions"
        >
          <OverflowMenuHorizontal size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={e => e.stopPropagation()}>
        {onRenameGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={() => onStartRename()}
          >
            <Edit size={12} /> Rename
          </DropdownMenuItem>
        )}
        {onToggleOmitFromPath && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onToggleOmitFromPath(node.group.id)}
          >
            <TableSplit size={12} className={isOmitted ? 'text-warning' : ''} />
            {isOmitted ? 'Include name in output' : 'Skip name in output'}
          </DropdownMenuItem>
        )}
        {(onRenameGroup || onToggleOmitFromPath) && onAddSubGroup && <DropdownMenuSeparator />}
        {onAddSubGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => onAddSubGroup(node.group.id)}
          >
            <Add size={12} /> Add Sub-group
          </DropdownMenuItem>
        )}
        {onAddSubGroup && onDeleteGroup && <DropdownMenuSeparator />}
        {!onAddSubGroup && (onRenameGroup || onToggleOmitFromPath) && onDeleteGroup && <DropdownMenuSeparator />}
        {onDeleteGroup && (
          <DropdownMenuItem
            className="gap-2 text-xs text-destructive focus:text-destructive"
            onClick={() => onDeleteGroup(node.group.id)}
          >
            <TrashCan size={12} /> Delete Group
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
        <DragVertical size={12} className="text-muted-foreground mr-1 flex-shrink-0" />
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

  useEffect(() => {
    if (!isEditing) return;
    const t = setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [isEditing]);

  function startEdit() {
    setEditValue(node.displayLabel);
    setIsEditing(true);
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

  const dropIntoRing = dropIntent === 'into' ? 'ring-2 ring-inset ring-primary rounded' : '';

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
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
      )}

      {/* Insertion line — bottom (after) */}
      {dropIntent === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full z-10 pointer-events-none" />
      )}

      {/* Drag handle with expanded drop zone — hidden while editing */}
      <div
        ref={setDragIconDropRef}
        className={`flex-shrink-0 ${isEditing ? 'pointer-events-none opacity-0' : ''}`}
      >
        <button
          {...(isEditing ? {} : listeners)}
          className={`p-2 text-muted-foreground flex-shrink-0 transition-all ${
            isEditing 
              ? 'pointer-events-none opacity-0' 
              : 'cursor-grab hover:text-muted-foreground'
          }`}
          title="Drag to reorder"
          tabIndex={-1}
          aria-hidden={isEditing}
        >
          <DragVertical size={12} className="shrink-0" />
        </button>
      </div>

      {/* Expand/collapse caret for groups with children */}
      {hasChildren ? (
        <button
          className="p-0.5 text-muted-foreground hover:text-muted-foreground flex-shrink-0 -ml-0.5 mr-0.5"
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

      {/* omitFromPath toggle */}
      {onToggleOmitFromPath && !isEditing && (
        <button
          title={node.group.omitFromPath ? 'Name skipped in output — click to include' : 'Click to skip name in output'}
          className={`p-0.5 rounded flex-shrink-0 transition-colors ${
            node.group.omitFromPath
              ? 'text-warning hover:text-warning'
              : 'text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-muted-foreground'
          }`}
          onClick={e => { e.stopPropagation(); onToggleOmitFromPath(node.group.id); }}
        >
          <TableSplit size={10} className="shrink-0" />
        </button>
      )}
      {!onToggleOmitFromPath && node.group.omitFromPath && !isEditing && (
        <span title="Name omitted from output path" className="text-warning flex-shrink-0">
          <TableSplit size={10} className="shrink-0" />
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
