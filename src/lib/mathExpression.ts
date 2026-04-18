/**
 * Safe numeric expression evaluator for Math node Expression mode.
 * Supports: + - * / parentheses, unary -, decimal literals, variables `a` and `b`.
 * Optionally strips outer calc(...) wrapper.
 * Substitutes {token.path} references via resolveTokenReference.
 * Returns null on any parse/evaluation error.
 */

export interface ExpressionContext {
  /** Resolve a full token reference string including braces, e.g. "{colors.brand.500}" */
  resolveTokenReference?: (ref: string) => string;
  /** Bound variable `a` — wired input value for per-element evaluation */
  a?: number;
  /** Bound variable `b` — second operand (Evaluate Math / multi-variable formulas) */
  b?: number;
}

/**
 * Validate an expression without suppressing the error message.
 * Returns null when the expression is valid or empty.
 * Returns a human-readable error string when the expression is invalid.
 */
export function validateExpression(raw: string, ctx?: ExpressionContext): string | null {
  const expr = raw.trim();
  if (!expr) return null;
  try {
    const stripped = stripCalc(expr);
    const substituted = substituteRefs(stripped, ctx?.resolveTokenReference);
    if (substituted === null) return 'Unresolved token reference';
    const result = parseExpr(substituted, ctx?.a, ctx?.b);
    if (!isFinite(result)) return 'Invalid expression';
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid expression';
  }
}


export function evaluateExpression(raw: string, ctx?: ExpressionContext): number | null {
  try {
    let expr = raw.trim();
    if (!expr) return null;

    // Strip outer calc(...) wrapper
    expr = stripCalc(expr);

    // If the expression contains token refs but no resolver is available, can't evaluate
    if (/\{[^{}]+\}/.test(expr) && !ctx?.resolveTokenReference) return null;

    // Substitute {token.path} references
    const substituted = substituteRefs(expr, ctx?.resolveTokenReference);
    if (substituted === null) return null;

    // Parse and evaluate
    const result = parseExpr(substituted, ctx?.a, ctx?.b);
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
 * Supports both dot-separated paths ({token.path}) and dash-separated ({token-name}).
 * When no resolver is available, substitutes 0 so the expression can still be
 * checked for syntactic validity.
 * Returns null only when a resolver IS provided and a reference cannot be resolved.
 */
function substituteRefs(
  s: string,
  resolve?: (ref: string) => string,
): string | null {
  let failed = false;
  const result = s.replace(/\{[^{}]+\}/g, (match) => {
    if (!resolve) {
      // No resolver available — treat as 0 so syntax can still be validated.
      return '0';
    }
    let resolved = resolve(match);
    let n = coerceToNumber(resolved);
    // Fallback: try with dashes converted to dots ({token-name} → {token.name})
    if (n === null && match.includes('-')) {
      const dotRef = '{' + match.slice(1, -1).replace(/-/g, '.') + '}';
      resolved = resolve(dotRef);
      n = coerceToNumber(resolved);
    }
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
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Same spirit as parsePrimary: leading number, optional unit (16px, 1.5rem, …)
  const numMatch = trimmed.match(/^(\d+\.?\d*|\.\d+)/);
  if (numMatch) {
    const n = parseFloat(numMatch[0]);
    if (!isNaN(n) && Number.isFinite(n)) return n;
  }
  const n = parseFloat(trimmed);
  return isNaN(n) || !Number.isFinite(n) ? null : n;
}

// ── Recursive descent parser ──────────────────────────────────────────────────
// Grammar:
//   expr   → addSub
//   addSub → mulDiv ( ('+' | '-') mulDiv )*
//   mulDiv → unary  ( ('*' | '/') unary  )*
//   unary  → '-' unary | '+' unary | primary
//   primary→ '(' expr ')' | number | 'a' | 'b'

interface ParseState {
  input: string;
  pos: number;
  a: number | undefined;
  b: number | undefined;
}

function parseExpr(input: string, a?: number, b?: number): number {
  const state: ParseState = { input, pos: 0, a, b };
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

  // Variable `b` — second bound input (Evaluate Math)
  if (
    s.input[s.pos] === 'b' &&
    (s.pos + 1 >= s.input.length || !/\w/.test(s.input[s.pos + 1]))
  ) {
    s.pos++;
    if (s.b === undefined) throw new Error('Variable b is not bound');
    return s.b;
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
