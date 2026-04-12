'use client';

import type { GeneratedToken, TokenGroup } from '@/types/token.types';
import { StyleGuidePanel } from '@/components/tokens/StyleGuidePanel';

export interface StyleGuideTabPanelProps {
  tokens: GeneratedToken[];
  allGroups: TokenGroup[];
  colorGroupsTree?: TokenGroup[];
}

/**
 * Style Guide tab: collection-wide previews only (no sidebar or graph).
 */
export function StyleGuideTabPanel({ tokens, allGroups, colorGroupsTree }: StyleGuideTabPanelProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <StyleGuidePanel tokens={tokens} allGroups={allGroups} colorGroupsTree={colorGroupsTree} />
    </div>
  );
}
