'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, Minimize } from '@carbon/icons-react';
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
}

export function GraphPanelWithChrome(props: GraphPanelWithChromeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : 'flex flex-col h-full'}>
      <div className="flex items-center justify-end px-3 py-1 border-b border-muted bg-background flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={() => setIsFullscreen(prev => !prev)}
          aria-label={isFullscreen ? 'Exit fullscreen graph view' : 'Enter fullscreen graph view'}
          title={isFullscreen ? 'Exit fullscreen graph view' : 'Enter fullscreen graph view'}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <TokenGraphPanel {...props} />
      </div>
    </div>
  );
}
