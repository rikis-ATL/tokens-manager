'use client';

import type { ITheme, ThemeGroupState } from '@/types/theme.types';
import type { TokenGroup } from '@/types';
import { parseGroupPath } from '@/utils';
import { dominantScopeForTokenTypes } from '@/utils/tokenScope';

interface ThemeGroupMatrixProps {
  theme: ITheme;
  groups: TokenGroup[];
  onStateChange: (groupId: string, state: ThemeGroupState) => void;
  onColorModeChange?: (themeId: string, colorMode: 'light' | 'dark') => void;
}

const STATES: ThemeGroupState[] = ['disabled', 'enabled', 'source'];

const STATE_LABELS: Record<ThemeGroupState, string> = {
  disabled: 'Disabled',
  enabled: 'Enabled',
  source: 'Source',
};

function groupScope(group: TokenGroup): string {
  const allTokens = group.tokens ?? [];
  const types = allTokens.map(t => t.type);
  const scope = dominantScopeForTokenTypes(types);
  if (scope === 'color') return 'Color';
  if (scope === 'density') return 'Density';
  return '—';
}

export function ThemeGroupMatrix({ theme, groups, onStateChange }: ThemeGroupMatrixProps) {
  if (groups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center mt-8">
        No groups in this collection.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse table-auto">
        <thead className="border-b border-border">
          <tr>
            <th className="px-4 py-2 text-[10px] font-semibold text-left text-muted-foreground uppercase tracking-wide">
              Name
            </th>
            <th className="px-4 py-2 text-[10px] font-semibold text-left text-muted-foreground uppercase tracking-wide w-24">
              Type
            </th>
            <th className="px-4 py-2 text-[10px] font-semibold text-left text-muted-foreground uppercase tracking-wide w-48">
              State
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {groups.map((group) => {
            const segments = parseGroupPath(group.name);
            const label = segments.join(' / ');
            const currentState: ThemeGroupState = theme.groups[group.id] ?? 'disabled';
            const type = groupScope(group);

            return (
              <tr key={group.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-2 text-xs text-foreground truncate max-w-[200px]">
                  {label}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {type}
                </td>
                <td className="px-4 py-2">
                  <div className="flex border border-border rounded-md overflow-hidden w-fit">
                    {STATES.map((state, idx) => {
                      const isActive = currentState === state;
                      return (
                        <button
                          key={state}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            idx < STATES.length - 1 ? 'border-r border-border' : ''
                          } ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-muted-foreground hover:bg-muted'
                          }`}
                          onClick={() => onStateChange(group.id, state)}
                          title={STATE_LABELS[state]}
                        >
                          {STATE_LABELS[state]}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
