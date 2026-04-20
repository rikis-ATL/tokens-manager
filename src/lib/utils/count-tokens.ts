// src/lib/utils/count-tokens.ts
// Phase 23 — Shared token counting utility. Extracted from src/app/api/collections/route.ts
// for reuse by GET /api/collections token counting AND src/lib/billing/check-token-limit.ts
// (D-07: live token aggregation). Pure function, no side effects, framework-agnostic.

/**
 * Recursively count design tokens in a nested token object.
 * A token is identified by the presence of a `$value` property at its level.
 * Returns 0 for null/undefined/non-object inputs.
 */
export function countTokensRecursive(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0;
  const o = obj as Record<string, unknown>;
  if (o.$value !== undefined) return 1;
  let count = 0;
  for (const value of Object.values(o)) {
    if (value && typeof value === 'object') {
      count += countTokensRecursive(value);
    }
  }
  return count;
}

/**
 * Count tokens across a collection's namespaced root (tokens[namespace][...nested]).
 * Skips the namespace level and recurses each namespace's content.
 */
export function countTokensInCollection(tokens: unknown): number {
  if (!tokens || typeof tokens !== 'object') return 0;
  let total = 0;
  for (const namespaceContent of Object.values(tokens as Record<string, unknown>)) {
    if (namespaceContent && typeof namespaceContent === 'object') {
      total += countTokensRecursive(namespaceContent);
    }
  }
  return total;
}
