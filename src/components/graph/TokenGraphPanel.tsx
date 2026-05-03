'use client';

import { Network_4, Branch, Maximize, Minimize } from '@carbon/icons-react';
import { Button } from '@/components/ui/button';
import { GroupStructureGraph } from './GroupStructureGraph';
import { TokenDetailGraph } from './TokenDetailGraph';
import type { TokenGroup, GeneratedToken } from '@/types';
import type { GraphGroupState, CollectionGraphState } from '@/types/graph-state.types';
import type { FlatToken, FlatGroup } from '@/types/graph-nodes.types';

interface TokenGraphPanelProps {
  /** Full group tree — used for navigation and TokenDetailGraph */
  allGroups: TokenGroup[];
  selectedGroupId: string;
  selectedToken: { token: GeneratedToken; groupPath: string } | null;
  onBulkAddTokens?: (groupId: string, tokens: GeneratedToken[], subgroupName?: string) => void;
  onBulkCreateGroups?: (parentGroupId: string | null, groupData: { name: string; tokens: GeneratedToken[] }) => void;
  graphStateMap?: CollectionGraphState;
  onGraphStateChange?: (groupId: string, state: GraphGroupState, flushImmediate?: boolean) => void;
  namespace?: string;
  allTokens?: FlatToken[];
  /** Flat group list for the destination-group picker inside nodes */
  flatGroups?: FlatGroup[];
  /** Dual active theme IDs — used to produce a stable remount key for GroupStructureGraph */
  activeColorThemeId?: string | null;
  activeDensityThemeId?: string | null;
  /** Fullscreen state — controlled by parent GraphPanelWithChrome */
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function findGroupById(groups: TokenGroup[], id: string): TokenGroup | null {
  for (const g of groups) {
    if (g.id === id) return g;
    if (g.children) {
      const found = findGroupById(g.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function TokenGraphPanel({
  allGroups,
  selectedGroupId,
  selectedToken,
  onBulkAddTokens,
  onBulkCreateGroups,
  graphStateMap,
  onGraphStateChange,
  namespace,
  allTokens,
  flatGroups,
  activeColorThemeId,
  activeDensityThemeId,
  isFullscreen,
  onToggleFullscreen,
}: TokenGraphPanelProps) {
  const selectedGroup = selectedGroupId && selectedGroupId !== '__all_groups__' 
    ? findGroupById(allGroups, selectedGroupId) 
    : null;
  const isAllGroupsView = selectedGroupId === '__all_groups__';

  const fullscreenButton = onToggleFullscreen ? (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground"
      onClick={onToggleFullscreen}
      aria-label={isFullscreen ? 'Exit fullscreen graph view' : 'Enter fullscreen graph view'}
      title={isFullscreen ? 'Exit fullscreen graph view' : 'Enter fullscreen graph view'}
    >
      {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
    </Button>
  ) : null;

  // Token detail takes priority when a token row is selected
  if (selectedToken) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-muted bg-background flex-shrink-0">
          <Branch size={14} className="text-warning" />
          <span className="text-xs font-medium text-muted-foreground">Token</span>
          <span className="font-mono text-xs text-warning bg-warning/10 border border-warning px-1.5 py-0.5 rounded">
            {selectedToken.token.path}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">reference chain</span>
          {fullscreenButton}
        </div>
        <div className="flex-1 min-h-0" style={{ position: 'relative' }}>
          <TokenDetailGraph
            key={selectedToken.token.id}
            token={selectedToken.token}
            groupPath={selectedToken.groupPath}
            allGroups={allGroups}
          />
        </div>
      </div>
    );
  }

  // All Groups view - unified graph showing all top-level groups
  if (isAllGroupsView) {
    return (
      <div className="relative flex flex-col h-full">
        {fullscreenButton && (
          <div className="absolute top-2 right-2 z-10">{fullscreenButton}</div>
        )}
        <GroupStructureGraph
          key={`__all_groups__-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}`}
          allGroupsMode={true}
          allGroupsData={allGroups}
          namespace={namespace}
          allTokens={allTokens}
          allGroups={flatGroups}
          collectionTokenGroups={allGroups}
          initialGraphState={graphStateMap?.__all_groups__}
          onBulkAddTokens={onBulkAddTokens}
          onBulkCreateGroups={onBulkCreateGroups}
          onGraphStateChange={
            onGraphStateChange
              ? (state, options) => onGraphStateChange('__all_groups__', state, options?.flushImmediate)
              : undefined
          }
        />
      </div>
    );
  }

  // Single group view
  if (selectedGroup) {
    return (
      <div className="relative flex flex-col h-full">
        {fullscreenButton && (
          <div className="absolute top-2 right-2 z-10">{fullscreenButton}</div>
        )}
        <GroupStructureGraph
          key={`${selectedGroup.id}-${activeColorThemeId ?? 'c0'}-${activeDensityThemeId ?? 'd0'}`}
          group={selectedGroup}
          namespace={namespace}
          allTokens={allTokens}
          allGroups={flatGroups}
          collectionTokenGroups={allGroups}
          initialGraphState={graphStateMap?.[selectedGroup.id]}
          onBulkAddTokens={onBulkAddTokens}
          onBulkCreateGroups={onBulkCreateGroups}
          onGraphStateChange={
            onGraphStateChange
              ? (state, options) => onGraphStateChange(selectedGroup.id, state, options?.flushImmediate)
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full items-center justify-center text-center p-8">
      {fullscreenButton && (
        <div className="absolute top-2 right-2 z-10">{fullscreenButton}</div>
      )}
      <Network_4 size={32} className="text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Select a group from the sidebar</p>
      <p className="text-xs text-muted-foreground mt-1">or click a token row to inspect its reference chain</p>
    </div>
  );
}
