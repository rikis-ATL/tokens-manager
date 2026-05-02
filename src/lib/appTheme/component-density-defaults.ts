/**
 * Default padding, typography, and sizing for interactive controls.
 * Field controls (`input-*`): native input, textarea, select trigger/list rows, select viewport padding, form labels.
 * Menus (`menu-item-*`): dropdown + menubar rows only.
 * Surfaces (`card-*`): panel radius + title/subtitle type scale (see `Card` primitive).
 * Mirrors `:root` in globals.css and bridge fallbacks in shadcn-bridge.ts.
 */

export const COMPONENT_DENSITY_LEAVES = [
  'button-padding-x',
  'button-padding-y',
  'button-padding-x-sm',
  'button-padding-y-sm',
  'button-padding-x-lg',
  'button-padding-y-lg',
  'button-font-size',
  'button-line-height',
  'button-icon-size',
  'button-icon-padding',
  'button-border-radius',
  'button-group-gap',
  'button-group-padding',
  'input-padding-x',
  'input-padding-y',
  'input-font-size',
  'input-line-height',
  'input-min-height',
  'input-viewport-padding',
  'input-label-font-size',
  'input-label-line-height',
  'input-border-radius',
  'menu-item-padding-x',
  'menu-item-padding-y',
  'menu-item-font-size',
  'menu-item-line-height',
  'menubar-height',
  'card-border-radius',
  'card-title-font-size',
  'card-title-line-height',
  'card-subtitle-font-size',
  'card-subtitle-line-height',
] as const;

export type ComponentDensityLeaf = (typeof COMPONENT_DENSITY_LEAVES)[number];

export function shadcnComponentDensityLeaves(): readonly string[] {
  return [...COMPONENT_DENSITY_LEAVES];
}

/** Fallback RHS strings for `appendShadcnBridge` (same as `:root` defaults). */
export const COMPONENT_DENSITY_DEFAULTS: Readonly<Record<ComponentDensityLeaf, string>> = {
  'button-padding-x': '1rem',
  'button-padding-y': '0.625rem',
  'button-padding-x-sm': '0.75rem',
  'button-padding-y-sm': '0.375rem',
  'button-padding-x-lg': '1.25rem',
  'button-padding-y-lg': '0.75rem',
  'button-font-size': 'var(--text-xs)',
  'button-line-height': 'var(--leading-xs)',
  'button-icon-size': '1.75rem',
  'button-icon-padding': '0.375rem',
  'button-border-radius': 'calc(var(--radius) - 4px)',
  'button-group-gap': 'var(--button-padding-y)',
  'button-group-padding': 'var(--button-padding-y)',
  'input-padding-x': '0.75rem',
  'input-padding-y': '0.5rem',
  'input-font-size': 'var(--text-sm)',
  'input-line-height': 'var(--leading-sm)',
  'input-min-height': '5rem',
  'input-viewport-padding': '0.25rem',
  'input-label-font-size': 'var(--text-sm)',
  'input-label-line-height': 'var(--leading-sm)',
  'input-border-radius': 'calc(var(--radius) - 2px)',
  'menu-item-padding-x': '0.5rem',
  'menu-item-padding-y': '0.375rem',
  'menu-item-font-size': 'var(--text-sm)',
  'menu-item-line-height': 'var(--leading-sm)',
  'menubar-height': 'calc(var(--input-line-height) + 2 * var(--input-padding-y) + 2px)',
  'card-border-radius': 'var(--radius)',
  'card-title-font-size': 'var(--text-lg)',
  'card-title-line-height': 'var(--leading-lg)',
  'card-subtitle-font-size': 'var(--text-sm)',
  'card-subtitle-line-height': 'var(--leading-sm)',
};
