import { isPatternTokenType, type TokenType } from '@/types/token.types';

/**
 * Remove cssClass / htmlTemplate / htmlCssComponent leaves from the token tree before Style Dictionary.
 * Walks nested group objects; drops any object whose `type` or `$type` is a pattern token type.
 */
export function stripPatternTokensForStyleDictionary(
  tokens: Record<string, unknown>
): Record<string, unknown> {
  const walk = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const o = val as Record<string, unknown>;
        const t = o['$type'] ?? o['type'];
        if (typeof t === 'string' && isPatternTokenType(t as TokenType)) {
          continue;
        }
        const nested = walk(o);
        if (Object.keys(nested).length > 0) {
          result[key] = nested;
        }
      } else {
        result[key] = val;
      }
    }
    return result;
  };
  return walk(tokens);
}
