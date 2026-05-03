/**
 * Utilities for converting embedded {token.path} references inside composite
 * token values (e.g. calc expressions, gradient strings) to CSS var() references
 * for CSS/SCSS/LESS build output.
 *
 * Pure aliases — where the entire $value is a single {ref} — are left unchanged
 * here and handled by Style Dictionary's own `outputReferences` mechanism.
 *
 * Example:
 *   calc({token.shadcn.radius} - 4px)  →  calc(var(--token-shadcn-radius) - 4px)
 *   {token.shadcn.radius}              →  (untouched — pure alias)
 *   calc(var(--radius) - 4px)          →  (untouched — already a CSS var string)
 */

/** Matches every {dotted.token.path} reference in a string. */
const REF_RE = /\{([^}]+)\}/g;

/**
 * Convert a dot-separated (possibly camelCase) token path to a CSS custom-property name.
 * Strips trailing .value suffix.
 * e.g. "token.shadcn.buttonBorderRadius" → "--token-shadcn-button-border-radius"
 */
export function refPathToCssVar(dotPath: string): string {
  const clean = dotPath.replace(/\.value$/, '');
  const kebab = clean
    .split('.')
    .map(s => s.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`))
    .join('-');
  return `--${kebab}`;
}

/**
 * Returns true when a value contains {ref} patterns but is NOT a pure alias.
 * Pure alias: the entire trimmed value is exactly one "{...}" with no surrounding text.
 */
export function isEmbeddedRefValue(value: string): boolean {
  const t = value.trim();
  if (!t.includes('{')) return false;
  return !(t.startsWith('{') && t.endsWith('}') && t.indexOf('{', 1) === -1);
}

/**
 * Replace every {token.path} inside a composite string with var(--token-path).
 * Strips .value suffix from each path.
 *
 * calc({token.shadcn.radius} - 4px)          → calc(var(--token-shadcn-radius) - 4px)
 * linear-gradient({token.a}, {token.b})       → linear-gradient(var(--token-a), var(--token-b))
 * calc({token.spacing.base} * {token.scale})  → calc(var(--token-spacing-base) * var(--token-scale))
 */
export function substituteRefsWithCssVars(value: string): string {
  return value.replace(REF_RE, (_, path) => `var(${refPathToCssVar(path)})`);
}

/**
 * Deep-walk a normalised token tree and apply substituteRefsWithCssVars to every
 * $value that contains embedded references (not pure aliases).
 * Returns a new object — does not mutate the input.
 */
export function preprocessTokensForCss(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '$value' && typeof val === 'string' && isEmbeddedRefValue(val)) {
      result[key] = substituteRefsWithCssVars(val);
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = preprocessTokensForCss(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }
  return result;
}
