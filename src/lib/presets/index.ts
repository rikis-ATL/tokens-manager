import type { PresetOption, DesignSystemPreset } from './types';
import { tailwind } from './tailwind';
import { material } from './material';
import { carbon } from './carbon';
import { antDesign } from './ant-design';
import { openProps } from './open-props';
import {
  DESIGN_MD_JSON_BUNDLES,
  findDesignMdJsonBundleById,
  vercelDesignMd,
} from './design-md-from-json';

export type { PresetOption, DesignSystemPreset } from './types';

export {
  DESIGN_MD_JSON_BUNDLES,
  findDesignMdJsonBundleById,
  vercelDesignMd,
} from './design-md-from-json';

/** Built-in token libraries */
export const CORE_DESIGN_SYSTEMS: DesignSystemPreset[] = [
  tailwind,
  material,
  carbon,
  antDesign,
  openProps,
];

/** Core presets plus JSON-backed awesome-design-md exemplars. */
export const DESIGN_SYSTEMS: DesignSystemPreset[] = [
  ...CORE_DESIGN_SYSTEMS,
  ...DESIGN_MD_JSON_BUNDLES,
];

export const PALETTE_PRESETS: PresetOption[] =
  DESIGN_SYSTEMS.map((ds) => ds.palette);

export const TYPESCALE_PRESETS: PresetOption[] =
  DESIGN_SYSTEMS.map((ds) => ds.typescale);

export const SPACING_PRESETS: PresetOption[] =
  DESIGN_SYSTEMS.map((ds) => ds.spacing);

export function mergePresetTokens(
  palette?: PresetOption,
  typescale?: PresetOption,
  spacing?: PresetOption,
): Record<string, unknown> {
  return {
    ...(palette?.tokens ?? {}),
    ...(typescale?.tokens ?? {}),
    ...(spacing?.tokens ?? {}),
  };
}

export function findPreset(
  list: PresetOption[],
  id: string,
): PresetOption | undefined {
  return list.find((p) => p.id === id);
}

/** Families available for a palette preset (e.g. slate, blue for Tailwind) */
export interface PaletteFamily {
  id: string;
  label: string;
}

export function getPaletteFamilies(presetId: string): PaletteFamily[] {
  const preset = findPreset(PALETTE_PRESETS, presetId);
  if (!preset?.tokens) return [];
  const color = preset.tokens.color as Record<string, unknown> | undefined;
  if (!color || typeof color !== 'object') return [];
  return Object.keys(color)
    .filter((k) => k !== '$type')
    .map((id) => ({ id, label: id }));
}

export function getPaletteFamilyColors(
  presetId: string,
  familyId: string,
): { names: string[]; values: string[] } | null {
  const preset = findPreset(PALETTE_PRESETS, presetId);
  if (!preset?.tokens) return null;
  const color = preset.tokens.color as Record<string, unknown> | undefined;
  if (!color || typeof color !== 'object') return null;
  const family = color[familyId] as Record<string, { $value?: string }> | undefined;
  if (!family || typeof family !== 'object') return null;
  const stepKeys = Object.keys(family).filter((k) => k !== '$type');
  if (stepKeys.length === 0) return null;
  const sorted = [...stepKeys].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });
  const names: string[] = [];
  const values: string[] = [];
  for (const k of sorted) {
    const v = family[k]?.$value;
    if (typeof v === 'string') {
      names.push(k);
      values.push(v);
    }
  }
  return names.length > 0 ? { names, values } : null;
}
