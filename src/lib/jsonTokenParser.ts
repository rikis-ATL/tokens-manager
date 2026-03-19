/**
 * Parse JSON into normalized token pairs { name, value }[].
 * Supports multiple formats: direct array, flat object, nested object, DTCG-style.
 */

export interface TokenPair {
  name: string;
  value: string;
}

function extractValue(obj: unknown): string {
  if (obj == null) return '';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  if (typeof obj === 'object' && obj !== null && '$value' in obj) {
    return extractValue((obj as { $value: unknown }).$value);
  }
  return JSON.stringify(obj);
}

function flattenToPairs(
  obj: Record<string, unknown>,
  prefix = ''
): TokenPair[] {
  const result: TokenPair[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$') && key !== '$value') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (val != null && typeof val === 'object' && !Array.isArray(val)) {
      if ('$value' in val) {
        result.push({ name: path, value: extractValue(val) });
      } else {
        result.push(...flattenToPairs(val as Record<string, unknown>, path));
      }
    } else {
      result.push({ name: path, value: extractValue(val) });
    }
  }
  return result;
}

interface DirectTokenItem {
  name?: string;
  path?: string;
  value?: unknown;
  $value?: unknown;
}

function isDirectArray(arr: unknown): arr is DirectTokenItem[] {
  return Array.isArray(arr) && arr.length > 0 && arr.every(
    item => item != null && typeof item === 'object' && ('name' in item || 'path' in item)
  );
}

function parseDirectArray(arr: DirectTokenItem[]): TokenPair[] {
  return arr
    .filter(item => item != null)
    .map(item => {
      const name = (item.name ?? item.path ?? '').toString().trim();
      const value = extractValue(item.value ?? item.$value ?? '');
      return { name, value };
    })
    .filter(p => p.name !== '');
}

/** Remove line and block comments from JS/TS source. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const STEP_NAMES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

/**
 * Parse array-with-comments format (JS/TS style).
 * Comments are stripped — names come from step sequence (100, 200, ...), not from comments.
 * [
 *   '#BBDEFB', // ignored
 *   '#90CAF9', // ignored
 * ]
 */
function parseArrayWithComments(raw: string): TokenPair[] {
  const result: TokenPair[] = [];
  const cleaned = stripComments(raw)
    .replace(/^(?:const|let|var)\s+\w+\s*=\s*/i, '')
    .replace(/;\s*$/, '')
    .trim();
  const match = cleaned.match(/\[\s*([\s\S]*)\s*\]/);
  if (!match) return result;

  const lines = match[1].split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let value = '';
    const hexMatch = trimmed.match(/#[0-9A-Fa-f]{3,8}/);
    const quotedMatch = trimmed.match(/['"]([^'"]+)['"]/);
    if (hexMatch) {
      value = hexMatch[0];
    } else if (quotedMatch) {
      value = quotedMatch[1];
    } else {
      continue;
    }

    const name = STEP_NAMES[result.length] ?? String(result.length + 1);
    result.push({ name, value });
  }

  return result;
}

/**
 * Parse array literal (with comments stripped) into string values only.
 * Used by Array node for "array" paste mode.
 * Handles: JSON array, JS-style array with // and /* comments.
 */
export function parseArrayToValues(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(item => extractValue(item)).filter(Boolean);
    }
  } catch {
    // Not valid JSON — try array-with-comments
  }
  const pairs = parseArrayWithComments(raw);
  return pairs.map(p => p.value);
}

/**
 * Parse raw JSON string into normalized token pairs.
 * Supports:
 * - Direct: [{ name, value }] or [{ path, value }]
 * - Flat object: { "color.primary": "#ff0000" }
 * - Nested object: { color: { primary: "#ff0000" } }
 * - DTCG-style: { color: { primary: { $value: "#ff0000" } } }
 * - Array with comments: ['#BBDEFB', // TOKEN_COLOR_BASE_BLUE_100, ...]
 */
export function parseJsonToTokens(raw: string): TokenPair[] {
  // Try JSON first
  try {
    const parsed = JSON.parse(raw);
    if (parsed != null) {
      if (isDirectArray(parsed)) {
        return parseDirectArray(parsed);
      }
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return flattenToPairs(parsed as Record<string, unknown>);
      }
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, i) => {
            const value = extractValue(item);
            return value ? { name: String(i + 1), value } : null;
          })
          .filter((p): p is TokenPair => p != null);
      }
    }
  } catch {
    // JSON failed — try array-with-comments format
  }

  const fromComments = parseArrayWithComments(raw);
  if (fromComments.length > 0) return fromComments;

  return [];
}
