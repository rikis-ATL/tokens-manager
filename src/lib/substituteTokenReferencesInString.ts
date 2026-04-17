/**
 * Replace `{token.path}` segments with resolved token values (full strings).
 * Literal CSS such as `var(--custom-prop)` is left unchanged.
 * When `resolve` is omitted, returns `s` unchanged (e.g. graph preview without collection context).
 */

export function substituteTokenReferencesInString(
  s: string,
  resolve?: (ref: string) => string,
): string {
  if (!resolve) return s;

  return s.replace(/\{[^{}]+\}/g, (match) => {
    let resolved = resolve(match);
    if (resolved === match && match.includes('-')) {
      const dotRef = '{' + match.slice(1, -1).replace(/-/g, '.') + '}';
      resolved = resolve(dotRef);
    }
    return resolved;
  });
}
