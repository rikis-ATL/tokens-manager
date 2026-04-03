'use client';

import { useMemo } from 'react';
import { Network, GitBranch } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupStructureGraph } from './GroupStructureGraph';
import { TokenDetailGraph } from './TokenDetailGraph';
import { SandboxPreview } from '@/components/sandbox/SandboxPreview';
import { tokenService } from '@/services';
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
  /** Active theme ID — ensures graph remounts when switching themes (each theme has unique nodes) */
  activeThemeId?: string | null;
  /** Sandbox URL for live preview */
  sandboxUrl?: string | null;
  /** Tokens for sandbox preview (TokenGroup[] or Record<string, unknown>) */
  tokens?: TokenGroup[] | Record<string, unknown>;
  /** Collection ID for sandbox preview */
  collectionId?: string;
  /** Collection name for sandbox preview */
  collectionName?: string;
  /** Theme name for sandbox preview */
  themeName?: string;
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
  activeThemeId,
  sandboxUrl,
  tokens,
  collectionId,
  collectionName,
  themeName,
}: TokenGraphPanelProps) {
  // Convert TokenGroup[] to Record<string, unknown> for SandboxPreview if needed
  const tokensForSandbox = useMemo(() => {
    if (!tokens) return {};
    if (Array.isArray(tokens)) {
      return tokenService.generateStyleDictionaryOutput(tokens, namespace || 'token');
    }
    return tokens;
  }, [tokens, namespace]);

  const selectedGroup = selectedGroupId && selectedGroupId !== '__all_groups__' 
    ? findGroupById(allGroups, selectedGroupId) 
    : null;
  const isAllGroupsView = selectedGroupId === '__all_groups__';

  // If sandbox URL is configured, show tabs
  const hasSandbox = !!(sandboxUrl && tokens && collectionId);

  const graphContent = () => {
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

    // All Groups view - unified graph showing all top-level groups
    if (isAllGroupsView) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0">
            <Network size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-gray-600">All Groups</span>
            <span className="text-xs text-gray-400 ml-auto">unified view</span>
          </div>
          <GroupStructureGraph
            key={`__all_groups__-${activeThemeId ?? 'default'}`}
            allGroupsMode={true}
            allGroupsData={allGroups}
            namespace={namespace}
            allTokens={allTokens}
            allGroups={flatGroups}
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
        <div className="flex flex-col h-full">
          <GroupStructureGraph
            key={`${selectedGroup.id}-${activeThemeId ?? 'default'}`}
            group={selectedGroup}
            namespace={namespace}
            allTokens={allTokens}
            allGroups={flatGroups}
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
      <div className="flex flex-col h-full items-center justify-center text-center p-8">
        <Network size={32} className="text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">Select a group from the sidebar</p>
        <p className="text-xs text-gray-300 mt-1">or click a token row to inspect its reference chain</p>
      </div>
    );
  };

  // If no sandbox configured, show only graph
  if (!hasSandbox) {
    return graphContent();
  }

  // With sandbox: show tabs for Graph | Live Preview
  return (
    <Tabs defaultValue="graph" className="flex flex-col h-full">
      <TabsList className="w-full justify-start rounded-none border-b">
        <TabsTrigger value="graph">Graph</TabsTrigger>
        <TabsTrigger value="preview">Live Preview</TabsTrigger>
      </TabsList>
      
      <TabsContent value="graph" className="flex-1 min-h-0 mt-0">
        {graphContent()}
      </TabsContent>
      
      <TabsContent value="preview" className="flex-1 min-h-0 mt-0">
        <SandboxPreview
          sandboxUrl={sandboxUrl}
          collectionId={collectionId}
          themeId={activeThemeId || null}
          tokens={tokensForSandbox}
          namespace={namespace || 'token'}
        />
      </TabsContent>
    </Tabs>
  );
}
