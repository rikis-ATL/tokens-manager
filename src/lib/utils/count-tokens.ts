// src/lib/utils/count-tokens.ts
// Shared token counting for billing, GET /api/collections, and GET /api/org/usage.
// Uses the same parsing as the token table and export pipeline (TokenService.processImportedTokens
// + TokenGroup tree count) so totals match what users see — not raw $value-only JSON walks.

import { tokenService } from '@/services/token.service';
import { countTokensRecursive as countInTokenGroupTree } from '@/utils/token.utils';

/**
 * Count design tokens in a collection document's `tokens` JSON.
 * Honors per-collection namespace, W3C vs legacy `value`, and structure A/B the same as exports.
 */
export function countTokensInCollection(tokens: unknown, namespace: string = 'token'): number {
  if (!tokens || typeof tokens !== 'object') return 0;
  const { groups } = tokenService.processImportedTokens(
    tokens as Record<string, unknown>,
    namespace
  );
  return countInTokenGroupTree(groups);
}
