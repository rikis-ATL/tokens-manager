import type { TokenGroup } from '@/types/token.types';
import { dominantScopeForTokenTypes } from '@/utils/tokenScope';

/**
 * Returns the correct active theme ID for graph state reads/writes,
 * based on the dominant token type in the given group (CONTEXT.md D-08).
 *
 * - Color-dominant group → activeColorThemeId
 * - Density-dominant group → activeDensityThemeId
 * - Mixed equal (tie) → 'color' (color wins tie)
 * - Null/unscoped group → null (collection default)
 */
export function resolveActiveThemeIdForGroup(
  group: TokenGroup | null | undefined,
  activeColorThemeId: string | null,
  activeDensityThemeId: string | null,
): string | null {
  if (!group) return null;
  const allTypes = group.tokens.map(t => t.type);
  const scope = dominantScopeForTokenTypes(allTypes);
  if (scope === 'color') return activeColorThemeId;
  if (scope === 'density') return activeDensityThemeId;
  return null; // unscoped group → collection default
}
