const GOOGLE_LEAVES = ['font-google-sans', 'font-google-mono', 'font-google-secondary'] as const;

function cssVarNamespaceSegment(namespace: string): string {
  const trimmed = namespace.trim() || 'token';
  return trimmed.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, '');
}

function shadcnSourceVarName(namespace: string, leaf: string): string {
  const ns = cssVarNamespaceSegment(namespace);
  return `--${ns}-shadcn-${leaf}`;
}

/**
 * One CSS `font=` parameter value for fonts.googleapis.com/css2, e.g.
 * `Inter:wght@400;500;600;700` (semicolons are part of the value).
 * Strip optional quotes; empty values are skipped.
 */
export function parseGoogleFontFamilyValue(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null) return null;
  const t = raw
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!t) return null;
  return t;
}

/**
 * Build a single Google Fonts v2 CSS URL, or `null` if no family specs.
 * Values should match what you use in the `family` query (spaces → `+` in output).
 */
export function buildGoogleFontsStylesheetUrl(families: string[]): string | null {
  const cleaned = [...new Set(families.map((f) => f.trim()).filter(Boolean))];
  if (cleaned.length === 0) return null;
  const familyParams = cleaned.map(
    (f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`
  );
  return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=swap`;
}

/**
 * Read `--{ns}-shadcn-font-google-*` from built CSS; values drive `@import` of Google Fonts.
 * Line-based so values can contain `;` (e.g. `Inter:wght@400;500;600`).
 */
export function collectGoogleFontSpecsFromShadcnCss(css: string, namespace: string): string[] {
  const out: string[] = [];
  const lines = css.split(/\r?\n/);
  for (const leaf of GOOGLE_LEAVES) {
    const name = shadcnSourceVarName(namespace, leaf);
    const prop = `${name}:`;
    for (const line of lines) {
      const t = line.trim();
      const idx = t.indexOf(prop);
      if (idx === -1) continue;
      let rest = t.slice(idx + prop.length).trim();
      rest = rest.replace(/\s*}\s*$/, '');
      if (rest.endsWith(';')) {
        rest = rest.slice(0, -1).trim();
      }
      const spec = parseGoogleFontFamilyValue(rest);
      if (spec) out.push(spec);
      break;
    }
  }
  return out;
}

/**
 * Prepend a single `@import` for Google Fonts when the CSS defines optional `font-google-*` token values.
 */
export function prependGoogleFontImportsToCss(css: string, namespace: string): string {
  const families = collectGoogleFontSpecsFromShadcnCss(css, namespace);
  const url = buildGoogleFontsStylesheetUrl(families);
  if (!url) return css;
  return `@import url("${url}");\n\n${css}`;
}
