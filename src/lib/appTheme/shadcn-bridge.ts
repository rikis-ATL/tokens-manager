/**
 * Maps design tokens under `{namespace}.shadcn.*` (Style Dictionary CSS output:
 * `--{namespace}-shadcn-*`) onto shadcn/ui semantic variables consumed by Tailwind
 * (`tailwind.config.js` → `hsl(var(--background))`, etc.).
 *
 * Token authors should add a **shadcn** group with leaf names matching the contract.
 * For which Tailwind classes consume each variable, see {@link semantic-tailwind.ts}.
 * Color values may be either **HSL components** (e.g. `222.2 84% 4.9%`) or a full **`hsl()` /
 * `hsla()`** function. The bridge normalizes color leaves before aliasing. Non-color leaves
 * (`radius`, **typography**, **font stacks**) are not treated as HSL. **`font-google-***` are
 * optional: set to a [Google Fonts v2 `family` value](https://developers.google.com/fonts/docs/css2)
 * (e.g. `Inter:wght@400;500;600;700` or `JetBrains+Mono:ital,wght@0,400;0,500`) to prepend
 * a single `@import` for those families.
 *
 * | shadcn CSS variable   | Token path (under namespace.shadcn) | SD example (`token` ns)   |
 * |-----------------------|-------------------------------------|---------------------------|
 * | (semantic colors)     | (see list in SHADCN_COLOR_LEAVES)   | --token-shadcn-background |
 * | --radius              | radius                              | --token-shadcn-radius     |
 * | --font-sans           | font-sans (primary UI)              | --token-shadcn-font-sans  |
 * | --font-mono           | font-mono                           | --token-shadcn-font-mono  |
 * | --font-secondary      | font-secondary (accent / headings)  | --token-shadcn-font-secondary |
 * | type scale            | `text-2xs`…`text-9xl`, matching `leading-*` | see typography-defaults |
 * | control density       | `button-*`, `button-group-*`, `input-*`, `card-*`, `menu-item-*`, `dropdown-item-*`, `menubar-height` | see component-density-defaults |
 * | (import only)         | `font-google-sans` / `font-google-mono` / `font-google-secondary` | no Tailwind var alias |
 */
import { COMPONENT_DENSITY_DEFAULTS, shadcnComponentDensityLeaves } from '@/lib/appTheme/component-density-defaults';
import { prependGoogleFontImportsToCss } from '@/lib/appTheme/google-fonts';
import { TYPE_SCALE_DEFAULTS, TYPE_SCALE_STEPS, shadcnTypeScaleLeaves } from '@/lib/appTheme/typography-defaults';

/** Color + status tokens; normal HSL/hex handling applies. */
export const SHADCN_COLOR_LEAVES: readonly string[] = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'card-background',
  'card-border',
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
  'input-border',
  'ring',
  'button-border',
  'menu-border',
  'tabs-border',
  'popover-border',
  'dialog-border',
  'badge-border',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
];

const SHADCN_FONT_LEAVES = ['font-sans', 'font-mono', 'font-secondary'] as const;
export const SHADCN_GOOGLE_LEAVES: readonly string[] = [
  'font-google-sans',
  'font-google-mono',
  'font-google-secondary',
];

/**
 * Receives shadcn → short CSS aliases (e.g. `--background`, `--text-xs`); this is the set wired in Tailwind
 * and {@link semantic-tailwind.ts}. Google-only leaves are excluded — they only drive {@link prependGoogleFontImportsToCss}.
 */
export const SHADCN_ALIASED_LEAVES: readonly string[] = [
  ...SHADCN_COLOR_LEAVES,
  'radius',
  ...SHADCN_FONT_LEAVES,
  ...shadcnTypeScaleLeaves(),
  ...shadcnComponentDensityLeaves(),
];

/** Full `shadcn` group contract including optional Google `family=` specs (no top-level -- alias). */
export const SHADCN_BRIDGE_LEAVES: readonly string[] = [...SHADCN_ALIASED_LEAVES, ...SHADCN_GOOGLE_LEAVES];

const OPTIONAL_COMPONENT_BORDER_FALLBACKS: Record<string, string> = {
  'input-border': 'var(--input)',
  'button-border': 'var(--input)',
  'menu-border': 'var(--border)',
  'tabs-border': 'var(--border)',
  'popover-border': 'var(--border)',
  'dialog-border': 'var(--border)',
  'badge-border': 'var(--border)',
};

const OPTIONAL_CARD_SURFACE_FALLBACKS: Record<string, string> = {
  'card-background': 'var(--card)',
  'card-border': 'var(--border)',
};

const OPTIONAL_STATUS_FALLBACKS: Record<string, string> = {
  success: '142.1 76.2% 36.3%',
  'success-foreground': '355.7 100% 97.3%',
  warning: '32.1 94.6% 43.7%',
  'warning-foreground': '26 83.3% 14.1%',
  info: '221.2 83.2% 53.3%',
  'info-foreground': '210 40% 98%',
};

const OPTIONAL_FONT_STACK_FALLBACKS: Record<string, string> = {
  'font-sans': `var(--font-inter), ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  'font-mono': `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`,
  'font-secondary': `var(--font-sans)`,
};

function buildTypeScaleFallbacks(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const step of TYPE_SCALE_STEPS) {
    const d = TYPE_SCALE_DEFAULTS[step];
    o[`text-${step}`] = d.size;
    o[`leading-${step}`] = d.leading;
  }
  return o;
}

const MERGED_OPTIONAL_FALLBACKS: Record<string, string> = {
  ...OPTIONAL_CARD_SURFACE_FALLBACKS,
  ...OPTIONAL_COMPONENT_BORDER_FALLBACKS,
  ...buildTypeScaleFallbacks(),
  ...OPTIONAL_FONT_STACK_FALLBACKS,
  ...OPTIONAL_STATUS_FALLBACKS,
  ...COMPONENT_DENSITY_DEFAULTS,
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

const SHADCN_COLOR_LEAVES_FOR_HSL_STRIP: readonly string[] = [...SHADCN_COLOR_LEAVES];

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

/**
 * @internal Aliased leaves get `--<leaf>: var(--<ns>-shadcn-<leaf>[, fallback])` in :root.
 */
function buildShadcnAliasLines(namespace: string): string {
  return SHADCN_ALIASED_LEAVES.map((leaf) => {
    const src = shadcnSourceVarName(namespace, leaf);
    const fb = MERGED_OPTIONAL_FALLBACKS[leaf];
    const rhs = fb !== undefined ? `var(${src}, ${fb})` : `var(${src})`;
    return `  --${leaf}: ${rhs};`;
  }).join('\n');
}

/**
 * Append alias blocks so `--background` etc. point at `--{ns}-shadcn-*` from the SD output.
 * When the build only contains a dark selector (no `:root`), aliases are applied there only.
 * Prepends a Google Fonts `@import` when `font-google-*` tokens are present in the source CSS.
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
  const combined = `${parts.join('\n')}\n`;
  return prependGoogleFontImportsToCss(combined, namespace);
}
