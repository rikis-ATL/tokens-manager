'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
} from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TokenGroup } from '@/types';
import { applyGroupMove, flattenTree, type FlatNode, type DropMode } from '@/utils/groupMove';
import { SortableGroupRow } from '@/components/tokens/SortableGroupRow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DropIntent {
  id: string;
  intent: DropMode;
}

interface TokenGroupTreeProps {
  groups: TokenGroup[];
  namespace?: string;
  selectedGroupId?: string;
  onGroupSelect?: (groupId: string) => void;
  onAddGroup?: () => void;
  onDeleteGroup?: (groupId: string) => void;
  onAddSubGroup?: (parentGroupId: string) => void;
  onGroupsReordered?: (newGroups: TokenGroup[], activeId: string, overId: string, dropMode: DropMode) => void;
  onRenameGroup?: (groupId: string, newLabel: string) => void;
  onToggleOmitFromPath?: (groupId: string) => void;
}

// ---------------------------------------------------------------------------
// Collapse filtering
// ---------------------------------------------------------------------------

/**
 * Filter flat nodes to exclude children of collapsed groups.
 * Propagates collapse downward: if a parent is collapsed, all descendants are hidden.
 */
function filterCollapsed(nodes: FlatNode[], collapsedIds: Set<string>): FlatNode[] {
  const hiddenSubtrees = new Set<string>();
  return nodes.filter(node => {
    if (node.parentId && hiddenSubtrees.has(node.parentId)) {
      hiddenSubtrees.add(node.group.id);
      return false;
    }
    if (collapsedIds.has(node.group.id) && (node.group.children?.length ?? 0) > 0) {
      hiddenSubtrees.add(node.group.id);
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TokenGroupTree({
  groups,
  namespace: _namespace,
  selectedGroupId,
  onGroupSelect,
  onAddGroup,
  onDeleteGroup,
  onAddSubGroup,
  onGroupsReordered,
  onRenameGroup,
  onToggleOmitFromPath,
}: TokenGroupTreeProps) {
  const [activeNode, setActiveNode] = useState<FlatNode | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const flatNodes = flattenTree(groups);
  const visibleNodes = filterCollapsed(flatNodes, collapsedIds);
  const sortedIds = visibleNodes.map(n => n.group.id);

  function handleToggleCollapse(groupId: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleDragStart({ active }: DragStartEvent) {
    const found = visibleNodes.find(n => n.group.id === active.id);
    setActiveNode(found ?? null);
    setDropIntent(null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) {
      setDropIntent(null);
      return;
    }

    const overId = String(over.id);
    
    // Check if we're over a drag icon drop zone (these have IDs ending with '-drag-icon')
    if (overId.endsWith('-drag-icon')) {
      const groupId = overId.replace('-drag-icon', '');
      setDropIntent({ id: groupId, intent: 'into' });
      return;
    }

    // Original logic for main row areas
    const overRect = over.rect;
    const activeRect = active.rect.current?.translated;
    if (!activeRect || !overRect) {
      setDropIntent(null);
      return;
    }

    const activeCenterY = activeRect.top + activeRect.height / 2;
    const zoneTop = overRect.top + overRect.height * 0.2;
    const zoneBottom = overRect.top + overRect.height * 0.8;

    let intent: DropMode;
    if (activeCenterY < zoneTop) {
      intent = 'before';
    } else if (activeCenterY > zoneBottom) {
      intent = 'after';
    } else {
      intent = 'into';
    }

    setDropIntent({ id: overId, intent });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const currentIntent = dropIntent;
    setActiveNode(null);
    setDropIntent(null);
    if (!over || active.id === over.id) return;
    
    const activeId = String(active.id);
    let overId = String(over.id);
    
    // Handle drag icon drop zone IDs
    if (overId.endsWith('-drag-icon')) {
      overId = overId.replace('-drag-icon', '');
    }
    
    // Prevent dropping on self
    if (activeId === overId) return;
    
    const dropMode: DropMode =
      currentIntent?.id === overId ? currentIntent.intent : 'before';
    const { groups: newGroups } = applyGroupMove(groups, activeId, overId, [], dropMode);
    onGroupsReordered?.(newGroups, activeId, overId, dropMode);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveNode(null);
    setDropIntent(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section heading */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups</span>
        {onAddGroup && (
          <button
            onClick={onAddGroup}
            className="text-muted-foreground hover:text-foreground text-base leading-none px-1"
            title="Add group"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-1">
        {flatNodes.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted-foreground">No groups yet</p>
        )}
        
        {/* All Groups item - only show if there are groups */}
        {flatNodes.length > 0 && (
          <div
            className={`px-3 py-2 mx-2 mb-1 rounded cursor-pointer transition-colors ${
              selectedGroupId === '__all_groups__'
                ? 'bg-primary/10 border border-primary text-primary'
                : 'hover:bg-muted/50 text-foreground'
            }`}
            onClick={() => onGroupSelect?.('__all_groups__')}
          >
            <div className="flex items-center">
              <span className="text-sm font-medium">All Groups</span>
              <span className="ml-2 text-xs text-muted-foreground">({flatNodes.length})</span>
            </div>
          </div>
        )}
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortedIds} strategy={() => null}>
            {visibleNodes.map(node => (
              <SortableGroupRow
                key={node.group.id}
                node={node}
                isSelected={node.group.id === selectedGroupId}
                onSelect={id => onGroupSelect?.(id)}
                onDeleteGroup={onDeleteGroup}
                onAddSubGroup={onAddSubGroup}
                onRenameGroup={onRenameGroup}
                onToggleOmitFromPath={onToggleOmitFromPath}
                dropIntent={dropIntent?.id === node.group.id ? dropIntent.intent : null}
                isCollapsed={collapsedIds.has(node.group.id)}
                onToggleCollapse={handleToggleCollapse}
              />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeNode ? (
              <SortableGroupRow
                node={activeNode}
                isSelected={false}
                onSelect={() => {}}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
