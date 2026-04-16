/**
 * Safe numeric expression evaluator for Math node Expression mode.
 * Supports: + - * / parentheses, unary -, decimal literals, variable `a`.
 * Optionally strips outer calc(...) wrapper.
 * Substitutes {token.path} references via resolveTokenReference.
 * Returns null on any parse/evaluation error.
 */

export interface ExpressionContext {
  /** Resolve a full token reference string including braces, e.g. "{colors.brand.500}" */
  resolveTokenReference?: (ref: string) => string;
  /** Bound variable `a` — wired input value for per-element evaluation */
  a?: number;
}

export function evaluateExpression(raw: string, ctx?: ExpressionContext): number | null {
  try {
    let expr = raw.trim();
    if (!expr) return null;

    // Strip outer calc(...) wrapper
    expr = stripCalc(expr);

    // Substitute {token.path} references
    const substituted = substituteRefs(expr, ctx?.resolveTokenReference);
    if (substituted === null) return null;

    // Parse and evaluate
    const result = parseExpr(substituted, ctx?.a);
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// ── calc() stripping ──────────────────────────────────────────────────────────

function stripCalc(s: string): string {
  const trimmed = s.trim();
  if (trimmed.toLowerCase().startsWith('calc(') && trimmed.endsWith(')')) {
    return trimmed.slice(5, -1).trim();
  }
  return trimmed;
}

// ── Token ref substitution ────────────────────────────────────────────────────

/**
 * Replace every {token.path} in the expression with its resolved numeric value.
 * Returns null if any reference cannot be resolved or coerced to a number.
 */
function substituteRefs(
  s: string,
  resolve?: (ref: string) => string,
): string | null {
  let failed = false;
  const result = s.replace(/\{[^{}]+\}/g, (match) => {
    if (!resolve) {
      failed = true;
      return '0';
    }
    const resolved = resolve(match);
    const n = coerceToNumber(resolved);
    if (n === null) {
      failed = true;
      return '0';
    }
    return String(n);
  });
  return failed ? null : result;
}

/**
 * Extract a leading numeric value from a string.
 * Handles plain numbers and dimension-like strings such as "16px", "1.5rem".
 */
function coerceToNumber(value: string): number | null {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

// ── Recursive descent parser ──────────────────────────────────────────────────
// Grammar:
//   expr   → addSub
//   addSub → mulDiv ( ('+' | '-') mulDiv )*
//   mulDiv → unary  ( ('*' | '/') unary  )*
//   unary  → '-' unary | '+' unary | primary
//   primary→ '(' expr ')' | number | 'a'

interface ParseState {
  input: string;
  pos: number;
  a: number | undefined;
}

function parseExpr(input: string, a?: number): number {
  const state: ParseState = { input, pos: 0, a };
  skipWS(state);
  const result = parseAddSub(state);
  skipWS(state);
  if (state.pos !== state.input.length) {
    throw new Error(`Unexpected token at position ${state.pos}: "${state.input.slice(state.pos)}"`);
  }
  return result;
}

function skipWS(s: ParseState) {
  while (s.pos < s.input.length && /\s/.test(s.input[s.pos])) s.pos++;
}

function parseAddSub(s: ParseState): number {
  let left = parseMulDiv(s);
  skipWS(s);
  while (s.pos < s.input.length) {
    const ch = s.input[s.pos];
    if (ch === '+') {
      s.pos++;
      skipWS(s);
      left += parseMulDiv(s);
      skipWS(s);
    } else if (ch === '-') {
      s.pos++;
      skipWS(s);
      left -= parseMulDiv(s);
      skipWS(s);
    } else {
      break;
    }
  }
  return left;
}

function parseMulDiv(s: ParseState): number {
  let left = parseUnary(s);
  skipWS(s);
  while (s.pos < s.input.length) {
    const ch = s.input[s.pos];
    if (ch === '*') {
      s.pos++;
      skipWS(s);
      left *= parseUnary(s);
      skipWS(s);
    } else if (ch === '/') {
      s.pos++;
      skipWS(s);
      const right = parseUnary(s);
      if (right === 0) throw new Error('Division by zero');
      left /= right;
      skipWS(s);
    } else {
      break;
    }
  }
  return left;
}

function parseUnary(s: ParseState): number {
  skipWS(s);
  if (s.pos < s.input.length && s.input[s.pos] === '-') {
    s.pos++;
    return -parseUnary(s);
  }
  if (s.pos < s.input.length && s.input[s.pos] === '+') {
    s.pos++;
    return parseUnary(s);
  }
  return parsePrimary(s);
}

function parsePrimary(s: ParseState): number {
  skipWS(s);
  if (s.pos >= s.input.length) throw new Error('Unexpected end of expression');

  // Parenthesised sub-expression
  if (s.input[s.pos] === '(') {
    s.pos++;
    skipWS(s);
    const result = parseAddSub(s);
    skipWS(s);
    if (s.pos >= s.input.length || s.input[s.pos] !== ')') {
      throw new Error('Missing closing parenthesis');
    }
    s.pos++;
    return result;
  }

  // Variable `a` — bound wired input
  if (
    s.input[s.pos] === 'a' &&
    (s.pos + 1 >= s.input.length || !/\w/.test(s.input[s.pos + 1]))
  ) {
    s.pos++;
    if (s.a === undefined) throw new Error('Variable a is not bound');
    return s.a;
  }

  // Numeric literal, optionally followed by a unit suffix (px, rem, em, %, …)
  const numMatch = s.input.slice(s.pos).match(/^(\d+\.?\d*|\.\d+)/);
  if (numMatch) {
    s.pos += numMatch[0].length;
    // Consume optional trailing unit suffix so the parser advances past it
    const unitMatch = s.input.slice(s.pos).match(/^[a-z%]+/);
    if (unitMatch) s.pos += unitMatch[0].length;
    return parseFloat(numMatch[0]);
  }

  throw new Error(`Unexpected character at position ${s.pos}: "${s.input[s.pos]}"`);
}
