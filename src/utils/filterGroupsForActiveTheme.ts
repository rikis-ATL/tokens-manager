import type { TokenGroup } from '@/types/token.types';
import type { ITheme } from '@/types/theme.types';

/**
 * Returns a copy of the group tree with groups marked `disabled` in the theme removed.
 * When `activeTheme` is missing, returns `masterGroups` unchanged (Default / unknown theme).
 */
export function filterGroupsForActiveTheme(
  masterGroups: TokenGroup[],
  activeTheme: ITheme | null | undefined,
): TokenGroup[] {
  if (!activeTheme) return masterGroups;

  function filterGroups(groups: TokenGroup[]): TokenGroup[] {
    return groups
      .filter((g) => {
        const state = activeTheme.groups[g.id] ?? 'disabled';
        return state !== 'disabled';
      })
      .map((g) => ({
        ...g,
        children: g.children ? filterGroups(g.children) : undefined,
      }));
  }

  return filterGroups(masterGroups);
}

/**
 * Dual-theme variant: a group is visible if it is enabled or source in EITHER active theme.
 * When both themes are null, returns masterGroups unchanged (collection default view).
 * Per CONTEXT.md D-03/D-04.
 */
export function filterGroupsForDualThemes(
  masterGroups: TokenGroup[],
  colorTheme: ITheme | null | undefined,
  densityTheme: ITheme | null | undefined,
): TokenGroup[] {
  if (!colorTheme && !densityTheme) return masterGroups;

  function filterGroups(groups: TokenGroup[]): TokenGroup[] {
    return groups
      .filter((g) => {
        const colorState = colorTheme?.groups[g.id] ?? 'disabled';
        const densityState = densityTheme?.groups[g.id] ?? 'disabled';
        return colorState !== 'disabled' || densityState !== 'disabled';
      })
      .map((g) => ({
        ...g,
        children: g.children ? filterGroups(g.children) : undefined,
      }));
  }

  return filterGroups(masterGroups);
}
