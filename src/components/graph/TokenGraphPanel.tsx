'use client';

import { Network, GitBranch } from 'lucide-react';
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
  graphStateMap?: CollectionGraphState;
  onGraphStateChange?: (groupId: string, state: GraphGroupState) => void;
  namespace?: string;
  allTokens?: FlatToken[];
  /** Flat group list for the destination-group picker inside nodes */
  flatGroups?: FlatGroup[];
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
  graphStateMap,
  onGraphStateChange,
  namespace,
  allTokens,
  flatGroups,
}: TokenGraphPanelProps) {
  const selectedGroup = selectedGroupId ? findGroupById(allGroups, selectedGroupId) : null;

  // Token detail takes priority when a token row is selected
  if (selectedToken) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <GitBranch size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-gray-600">Token</span>
          <span className="font-mono text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            {selectedToken.token.path}
          </span>
          <span className="text-xs text-gray-400 ml-auto">reference chain</span>
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

  if (selectedGroup) {
    return (
      <div className="flex flex-col h-full">
        <GroupStructureGraph
          key={selectedGroup.id}
          group={selectedGroup}
          namespace={namespace}
          allTokens={allTokens}
          allGroups={flatGroups}
          initialGraphState={graphStateMap?.[selectedGroup.id]}
          onBulkAddTokens={onBulkAddTokens}
          onGraphStateChange={
            onGraphStateChange
              ? (state) => onGraphStateChange(selectedGroup.id, state)
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8">
      <Network size={32} className="text-gray-300 mb-3" />
      <p className="text-sm text-gray-400">Select a group from the sidebar</p>
      <p className="text-xs text-gray-300 mt-1">or click a token row to inspect its reference chain</p>
    </div>
  );
}
