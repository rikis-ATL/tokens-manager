import type { TokenGroup } from '@/types';
import type { ITheme } from '@/types/theme.types';
import { tokenService } from '@/services/token.service';

/**
 * Merge collection-default tokens with a selected theme's group states.
 *
 * - theme === null → returns masterTokens unchanged (Collection default pass-through)
 * - Disabled root groups → excluded entirely
 * - Source root groups → use master collection token values
 * - Enabled root groups → use theme.tokens snapshot values
 *
 * Only root-level groups (no parent) are checked against theme.groups — the same
 * rule established in Phase 11: children are governed by their parent's state.
 *
 * @param masterTokens  Raw collection token JSON (namespace-wrapped from MongoDB)
 * @param theme         Selected theme, or null for "Collection default"
 * @param namespace     Collection namespace string (e.g. "token")
 * @returns             Merged token JSON ready for SD build
 */
export function mergeThemeTokens(
  masterTokens: Record<string, unknown>,
  theme: ITheme | null,
  namespace: string
): Record<string, unknown> {
  if (!theme) {
    const { groups } = tokenService.processImportedTokens(masterTokens, namespace);
    return tokenService.generateStyleDictionaryOutput(groups, namespace, true);
  }

  // Parse master collection tokens into TokenGroup tree
  const { groups: masterGroups } = tokenService.processImportedTokens(masterTokens, namespace);

  // Build a lookup map for theme.tokens (already TokenGroup[] — do NOT re-parse)
  const themeGroupMap = new Map<string, TokenGroup>(
    theme.tokens.map(g => [g.id, g])
  );

  const mergedGroups: TokenGroup[] = [];
  for (const masterGroup of masterGroups) {
    // Root-level groups only (children are governed by parent's state)
    const state = theme.groups[masterGroup.id] ?? 'disabled';
    if (state === 'disabled') continue;
    if (state === 'source') {
      mergedGroups.push(masterGroup); // collection-default values
    } else {
      // 'enabled': use theme snapshot if group has been edited, else collection default
      // This ensures newly-enabled groups (not yet edited) still appear in exports
      const themeGroup = themeGroupMap.get(masterGroup.id);
      mergedGroups.push(themeGroup ?? masterGroup);
    }
  }

  return tokenService.generateStyleDictionaryOutput(mergedGroups, namespace, true);
}
