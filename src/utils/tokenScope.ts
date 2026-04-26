import type { TokenType } from '@/types/token.types';

/** Token types that belong to the color scope (overridden by color themes) */
export const COLOR_SCOPE_TYPES: readonly TokenType[] = ['color', 'gradient'] as const;

/**
 * Token types that belong to the density scope (overridden by density themes).
 * Covers the full range of sizing and typographic scale tokens per CONTEXT.md D-05/D-06.
 */
export const DENSITY_SCOPE_TYPES: readonly TokenType[] = [
  'dimension',
  'fontSize',
  'fontWeight',
  'borderRadius',
  'borderWidth',
] as const;

export function isColorScopeType(t: TokenType): boolean {
  return (COLOR_SCOPE_TYPES as readonly string[]).includes(t);
}

export function isDensityScopeType(t: TokenType): boolean {
  return (DENSITY_SCOPE_TYPES as readonly string[]).includes(t);
}

/**
 * Returns 'color' | 'density' | null based on majority token type in a list.
 * Tie goes to 'color'. Empty or all-unscoped list returns null.
 * Per CONTEXT.md D-08.
 */
export function dominantScopeForTokenTypes(types: TokenType[]): 'color' | 'density' | null {
  const colorCount = types.filter(isColorScopeType).length;
  const densityCount = types.filter(isDensityScopeType).length;
  if (colorCount === 0 && densityCount === 0) return null;
  return colorCount >= densityCount ? 'color' : 'density';
}
