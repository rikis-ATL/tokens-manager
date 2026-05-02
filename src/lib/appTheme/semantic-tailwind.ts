import { SHADCN_ALIASED_LEAVES } from '@/lib/appTheme/shadcn-bridge';
import {
  type ComponentDensityLeaf,
} from '@/lib/appTheme/component-density-defaults';
import { TYPE_SCALE_STEPS } from '@/lib/appTheme/typography-defaults';

/**
 * App theme contract: collection tokens under `{namespace}.shadcn.<key>` drive CSS variables;
 * the UI uses the Tailwind utilities listed here so borders, surfaces, and text stay themeable.
 *
 * - Align collection **group** name with `shadcn` and **leaf** names with {@link SHADCN_ALIASED_LEAVES}
 *   (optional `font-google-*` in shadcn only loads Google Fonts, no class).
 * - HSL values: bare components or full `hsl()` / `hsla()` in tokens; the app-theme bridge normalizes to components for Tailwind.
 * - Control density: `button-*`, `button-group-*`, `input-*`, `menu-item-*`, `menubar-height`,
 *   `card-*` (surface radius + title/subtitle type) → matching utilities (see {@link COMPONENT_DENSITY_SEMANTIC}).
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

/** Recommended Tailwind utilities for control-density CSS variables (`tailwind-theme-extend.js`). */
const COMPONENT_DENSITY_SEMANTIC = {
  'button-padding-x': ['px-button-x'],
  'button-padding-y': ['py-button-y'],
  'button-padding-x-sm': ['px-button-x-sm'],
  'button-padding-y-sm': ['py-button-y-sm'],
  'button-padding-x-lg': ['px-button-x-lg'],
  'button-padding-y-lg': ['py-button-y-lg'],
  'button-font-size': ['text-button'],
  'button-line-height': ['text-button'],
  'button-icon-size': [
    'min-h-[length:var(--button-icon-size)]',
    'min-w-[length:var(--button-icon-size)]',
  ],
  'button-icon-padding': ['p-[length:var(--button-icon-padding)]'],
  'button-border-radius': ['rounded-button'],
  'button-group-gap': ['gap-button-group-gap'],
  'button-group-padding': ['p-button-group-padding'],
  'input-padding-x': ['px-input-x'],
  'input-padding-y': ['py-input-y'],
  'input-font-size': ['text-input'],
  'input-line-height': ['text-input'],
  'input-min-height': ['min-h-input-min'],
  'input-viewport-padding': ['p-input-viewport'],
  'input-label-font-size': ['text-input-label'],
  'input-label-line-height': ['text-input-label'],
  'input-border-radius': ['rounded-input'],
  'menu-item-padding-x': ['px-menu-item-x'],
  'menu-item-padding-y': ['py-menu-item-y'],
  'menu-item-font-size': ['text-menu-item'],
  'menu-item-line-height': ['text-menu-item'],
  'menubar-height': ['h-menubar'],
  'card-border-radius': ['rounded-card'],
  'card-title-font-size': ['text-card-title'],
  'card-title-line-height': ['text-card-title'],
  'card-subtitle-font-size': ['text-card-subtitle'],
  'card-subtitle-line-height': ['text-card-subtitle'],
} as const satisfies Record<ComponentDensityLeaf, readonly string[]>;

/** Maps each bridge token key to recommended Tailwind class strings (subset you may combine). */
export const SEMANTIC_TAILWIND_BY_TOKEN = {
  background: ['bg-background'],
  foreground: ['text-foreground'],

  card: ['bg-card', 'text-card-foreground', 'rounded-card', 'border-card-border'],
  'card-foreground': ['text-card-foreground'],
  'card-background': ['bg-card'],
  'card-border': ['border-card-border', 'divide-card-border', 'ring-card-border'],
  'button-border': ['border-button-border', 'divide-button-border', 'ring-button-border'],
  'menu-border': ['border-menu-border', 'divide-menu-border', 'ring-menu-border'],
  'tabs-border': ['border-tabs-border', 'divide-tabs-border', 'ring-tabs-border'],
  'popover-border': ['border-popover-border', 'divide-popover-border', 'ring-popover-border'],
  'dialog-border': ['border-dialog-border', 'divide-dialog-border', 'ring-dialog-border'],
  'badge-border': ['border-badge-border', 'divide-badge-border', 'ring-badge-border'],

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

  ...COMPONENT_DENSITY_SEMANTIC,
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
  elevated: 'bg-card text-card-foreground border border-card-border rounded-card',
  mutedBand: 'bg-muted text-muted-foreground',
  interactive: 'bg-accent text-accent-foreground',
  primaryButton:
    'bg-primary text-primary-foreground px-button-x py-button-y text-button rounded-button',
  destructiveButton:
    'bg-destructive text-destructive-foreground px-button-x py-button-y text-button rounded-button',
  buttonGroupShell:
    'inline-flex items-center rounded-button border border-border bg-background p-button-group-padding gap-button-group-gap',
  inputField:
    'bg-background border border-input text-foreground px-input-x py-input-y text-input rounded-input',
  fieldLabel: 'text-input-label font-medium',
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
} as const;
