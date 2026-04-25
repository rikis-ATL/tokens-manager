import { SHADCN_ALIASED_LEAVES } from '@/lib/appTheme/shadcn-bridge';
import { TYPE_SCALE_STEPS } from '@/lib/appTheme/typography-defaults';

/**
 * App theme contract: collection tokens under `{namespace}.shadcn.<key>` drive CSS variables;
 * the UI uses the Tailwind utilities listed here so borders, surfaces, and text stay themeable.
 *
 * - Align collection **group** name with `shadcn` and **leaf** names with {@link SHADCN_ALIASED_LEAVES}
 *   (optional `font-google-*` in shadcn only loads Google Fonts, no class).
 * - HSL values: bare components or full `hsl()` / `hsla()` in tokens; the app-theme bridge normalizes to components for Tailwind.
 * - Typography: set `text-*` / `leading-*` in tokens, then use the matching `text-*` / `leading-*` classes;
 *   `font-sans` = primary, `font-secondary` = secondary, `font-mono` = monospace. Pair with
 *   optional `font-google-*` leaves for the same families.
 *
 * @see shadcn-bridge.ts for `--*` → `--token-shadcn-*` mapping
 * @see tailwind.config.js — `theme.extend` is loaded from `tailwind-theme-extend.js` (same tokens).
 */

function typeScaleSemanticMap(): Record<string, readonly string[]> {
  const o: Record<string, readonly string[]> = {};
  for (const s of TYPE_SCALE_STEPS) {
    o[`text-${s}`] = [`text-${s}`];
    o[`leading-${s}`] = [`leading-${s}`];
  }
  return o;
}

/** Maps each bridge token key to recommended Tailwind class strings (subset you may combine). */
export const SEMANTIC_TAILWIND_BY_TOKEN = {
  background: ['bg-background'],
  foreground: ['text-foreground'],

  card: ['bg-card', 'text-card-foreground'],
  'card-foreground': ['text-card-foreground'],

  popover: ['bg-background', 'text-foreground', 'text-popover-foreground'],
  'popover-foreground': ['text-foreground', 'text-popover-foreground'],

  primary: ['bg-primary', 'text-primary', 'text-primary-foreground'],
  'primary-foreground': ['text-primary-foreground'],

  secondary: ['bg-secondary', 'text-secondary-foreground'],
  'secondary-foreground': ['text-secondary-foreground'],

  muted: ['bg-muted', 'text-muted-foreground'],
  'muted-foreground': ['text-muted-foreground'],

  accent: ['bg-accent', 'text-accent-foreground'],
  'accent-foreground': ['text-accent-foreground'],

  destructive: ['bg-destructive', 'text-destructive', 'text-destructive-foreground'],
  'destructive-foreground': ['text-destructive-foreground'],

  border: ['border-border', 'divide-border', 'divide-border/60'],
  input: ['border-input', 'ring-offset-background'],
  ring: [
    'ring-ring',
    'ring-1',
    'ring-2',
    'focus-visible:ring-ring',
    'focus:ring-ring',
    'focus:ring-primary/20',
    'focus:ring-destructive',
    'focus:ring-info',
    'focus:ring-warning/40',
  ],

  /** Uses `theme.extend.borderRadius` → `var(--radius)` */
  radius: ['rounded-sm', 'rounded-md', 'rounded-lg'],

  'font-sans': ['font-sans'],
  'font-mono': ['font-mono'],
  'font-secondary': ['font-secondary'],

  success: ['bg-success', 'text-success', 'text-success-foreground'],
  'success-foreground': ['text-success-foreground'],

  warning: ['bg-warning', 'text-warning', 'text-warning-foreground'],
  'warning-foreground': ['text-warning-foreground'],

  info: ['bg-info', 'text-info', 'text-info-foreground'],
  'info-foreground': ['text-info-foreground'],

  ...typeScaleSemanticMap(),
} as const satisfies Record<(typeof SHADCN_ALIASED_LEAVES)[number], readonly string[]>;

/** Flattened unique utilities for pickers, validation, or docs. */
export function allSemanticTailwindClasses(): string[] {
  const set = new Set<string>();
  for (const key of SHADCN_ALIASED_LEAVES) {
    const classes = SEMANTIC_TAILWIND_BY_TOKEN[key as keyof typeof SEMANTIC_TAILWIND_BY_TOKEN];
    for (const c of classes) {
      set.add(c);
    }
  }
  return [...set].sort();
}

/** Typical pairings for surfaces (docs / codegen helpers). */
export const SEMANTIC_SURFACE_EXAMPLES = {
  page: 'bg-background text-foreground',
  elevated: 'bg-card text-card-foreground border border-border',
  mutedBand: 'bg-muted text-muted-foreground',
  interactive: 'bg-accent text-accent-foreground',
  primaryButton: 'bg-primary text-primary-foreground',
  destructiveButton: 'bg-destructive text-destructive-foreground',
  inputField: 'bg-background border border-input text-foreground',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
} as const;
