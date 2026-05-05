'use client';

import { TokenGraphPanel } from './TokenGraphPanel';
import type { TokenGroup, GeneratedToken } from '@/types';
import type { GraphGroupState, CollectionGraphState } from '@/types/graph-state.types';
import type { FlatToken, FlatGroup } from '@/types/graph-nodes.types';

export interface GraphPanelWithChromeProps {
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
  /** Navigation callback for group node double-click and breadcrumb */
  onNavigateToGroup?: (groupId: string) => void;
}

/**
 * Simple wrapper for TokenGraphPanel. Fullscreen is managed at the workspace level.
 */
export function GraphPanelWithChrome(props: GraphPanelWithChromeProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <TokenGraphPanel {...props} />
      </div>
    </div>
  );
}
