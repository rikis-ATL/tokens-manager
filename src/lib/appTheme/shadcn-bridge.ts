/**
 * Maps design tokens under `{namespace}.shadcn.*` (Style Dictionary CSS output:
 * `--{namespace}-shadcn-*`) onto shadcn/ui semantic variables consumed by Tailwind
 * (`tailwind.config.js` → `hsl(var(--background))`, etc.).
 *
 * Token authors should add a **shadcn** group with leaf names matching the second column.
 * For which Tailwind classes consume each variable, see {@link semantic-tailwind.ts}.
 * Color values may be either **HSL components** (e.g. `222.2 84% 4.9%`) or a full **`hsl()` /
 * `hsla()`** function (e.g. `hsl(222.2 84% 4.9%)`) so previews in the token table match common CSS.
 * The bridge normalizes color leaves before aliasing, because Tailwind uses `hsl(var(--background))`
 * (space-separated HSL components only): it strips outer `hsl()` / `hsla()`, and converts `#rgb` /
 * `#rrggbb` from the token table into those components. **`radius`** is left unchanged (not a color).
 *
 * | shadcn CSS variable   | Token path (under namespace.shadcn) | SD variable example (`token` ns) |
 * |-----------------------|-------------------------------------|----------------------------------|
 * | --background          | background                          | --token-shadcn-background        |
 * | --foreground          | foreground                          | --token-shadcn-foreground        |
 * | --card                | card                                | --token-shadcn-card              |
 * | --card-foreground     | card-foreground                     | --token-shadcn-card-foreground   |
 * | --popover             | popover                             | --token-shadcn-popover           |
 * | --popover-foreground| popover-foreground                  | --token-shadcn-popover-foreground |
 * | --primary             | primary                             | --token-shadcn-primary           |
 * | --primary-foreground  | primary-foreground                  | --token-shadcn-primary-foreground |
 * | --secondary           | secondary                           | --token-shadcn-secondary         |
 * | --secondary-foreground| secondary-foreground                | --token-shadcn-secondary-foreground |
 * | --muted               | muted                               | --token-shadcn-muted             |
 * | --muted-foreground    | muted-foreground                    | --token-shadcn-muted-foreground  |
 * | --accent              | accent                              | --token-shadcn-accent            |
 * | --accent-foreground   | accent-foreground                   | --token-shadcn-accent-foreground |
 * | --destructive         | destructive                         | --token-shadcn-destructive       |
 * | --destructive-foreground | destructive-foreground           | --token-shadcn-destructive-foreground |
 * | --border              | border                              | --token-shadcn-border            |
 * | --input               | input                               | --token-shadcn-input             |
 * | --ring                | ring                                | --token-shadcn-ring              |
 * | --radius              | radius                              | --token-shadcn-radius            |
 * | --success             | success                             | --token-shadcn-success           |
 * | --success-foreground  | success-foreground                  | --token-shadcn-success-foreground |
 * | --warning             | warning                             | --token-shadcn-warning           |
 * | --warning-foreground  | warning-foreground                  | --token-shadcn-warning-foreground |
 * | --info                | info                                | --token-shadcn-info              |
 * | --info-foreground     | info-foreground                     | --token-shadcn-info-foreground   |
 */

/** shadcn semantic name → leaf name under the `shadcn` group (kebab-case path segment). */
export const SHADCN_BRIDGE_LEAVES: readonly string[] = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'radius',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
];

/** HSL components (no hsl() wrapper) used when the collection has no matching `shadcn.*` token. */
const OPTIONAL_SEMANTIC_FALLBACKS: Partial<Record<string, string>> = {
  success: '142.1 76.2% 36.3%',
  'success-foreground': '355.7 100% 97.3%',
  warning: '32.1 94.6% 43.7%',
  'warning-foreground': '26 83.3% 14.1%',
  info: '221.2 83.2% 53.3%',
  'info-foreground': '210 40% 98%',
};

/**
 * Convert collection namespace (e.g. `token`) to the first segment of SD CSS vars (`token` → `token`).
 */
export function cssVarNamespaceSegment(namespace: string): string {
  const trimmed = namespace.trim() || 'token';
  return trimmed.replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, '');
}

/** e.g. namespace `token`, leaf `card-foreground` → `--token-shadcn-card-foreground` */
export function shadcnSourceVarName(namespace: string, leaf: string): string {
  const ns = cssVarNamespaceSegment(namespace);
  return `--${ns}-shadcn-${leaf}`;
}

function escapeRegExpChars(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Leaves that represent colors; `radius` keeps arbitrary CSS (e.g. `0.75rem`). */
const SHADCN_COLOR_LEAVES_FOR_HSL_STRIP: readonly string[] = SHADCN_BRIDGE_LEAVES.filter(
  (leaf) => leaf !== 'radius'
);

/**
 * Rewrite `--{ns}-shadcn-*` color declarations so values are HSL components only.
 * Style Dictionary may emit `hsl(...)` when tokens use full CSS; Tailwind expects
 * `hsl(var(--background))` with `--background` holding the inner components.
 */
export function normalizeShadcnHslWrappersInCss(css: string, namespace: string): string {
  const ns = escapeRegExpChars(cssVarNamespaceSegment(namespace));
  const leaves = [...SHADCN_COLOR_LEAVES_FOR_HSL_STRIP].sort((a, b) => b.length - a.length);
  const leafAlt = leaves.map(escapeRegExpChars).join('|');
  const re = new RegExp(
    `(--${ns}-shadcn-(?:${leafAlt}))\\s*:\\s*hsla?\\(\\s*([^)]+)\\s*\\)`,
    'gi'
  );
  return css.replace(re, (_full, prop: string, inner: string) => `${prop}: ${inner.trim()}`);
}

/**
 * `#rgb` / `#rrggbb` → space-separated HSL for Tailwind `hsl(var(--token))`.
 */
export function hexToShadcnHslComponents(hex: string): string | null {
  const raw = hex.trim();
  const m = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hDeg = 0;
  let s = 0;
  const d = max - min;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hDeg = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hDeg = ((b - r) / d + 2) / 6;
        break;
      default:
        hDeg = ((r - g) / d + 4) / 6;
        break;
    }
  }
  const H = Math.round(hDeg * 360 * 1000) / 1000;
  const S = Math.round(s * 1000) / 10;
  const L = Math.round(l * 1000) / 10;
  return `${H} ${S}% ${L}%`;
}

export function normalizeShadcnHexColorsInCss(css: string, namespace: string): string {
  const ns = escapeRegExpChars(cssVarNamespaceSegment(namespace));
  const leaves = [...SHADCN_COLOR_LEAVES_FOR_HSL_STRIP].sort((a, b) => b.length - a.length);
  const leafAlt = leaves.map(escapeRegExpChars).join('|');
  const re = new RegExp(
    `(--${ns}-shadcn-(?:${leafAlt}))\\s*:\\s*(#[0-9a-f]{3}|#[0-9a-f]{6})(?=\\s*;)`,
    'gi'
  );
  return css.replace(re, (full, prop: string, hexVal: string) => {
    const hsl = hexToShadcnHslComponents(hexVal);
    return hsl !== null ? `${prop}: ${hsl}` : full;
  });
}

/** Lines inside a selector block: `--background: var(--token-shadcn-background);` */
export function buildShadcnAliasLines(namespace: string): string {
  return SHADCN_BRIDGE_LEAVES.map((leaf) => {
    const src = shadcnSourceVarName(namespace, leaf);
    const fb = OPTIONAL_SEMANTIC_FALLBACKS[leaf];
    const rhs = fb !== undefined ? `var(${src}, ${fb})` : `var(${src})`;
    return `  --${leaf}: ${rhs};`;
  }).join('\n');
}

/**
 * Append alias blocks so `--background` etc. point at `--{ns}-shadcn-*` from the SD output.
 * When the build only contains a dark selector (no `:root`), aliases are applied there only.
 */
export function appendShadcnBridge(css: string, namespace: string): string {
  const hslStripped = normalizeShadcnHslWrappersInCss(css, namespace);
  const normalizedCss = normalizeShadcnHexColorsInCss(hslStripped, namespace);
  const aliases = buildShadcnAliasLines(namespace);
  const trimmed = normalizedCss.trimEnd();
  const hasLightRoot = /:root\s*\{/.test(trimmed);
  const hasDark =
    trimmed.includes('[data-color-mode="dark"]') || trimmed.includes("[data-color-mode='dark']");

  const parts: string[] = [trimmed];
  if (hasLightRoot) {
    parts.push('', `:root {\n${aliases}\n}`);
  }
  if (hasDark) {
    parts.push('', `[data-color-mode="dark"] {\n${aliases}\n}`);
  }
  if (!hasLightRoot && !hasDark) {
    parts.push('', `:root {\n${aliases}\n}`);
  }
  return `${parts.join('\n')}\n`;
}
