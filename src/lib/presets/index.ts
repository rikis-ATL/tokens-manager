import type { PresetOption, DesignSystemPreset } from './types';
import { tailwind } from './tailwind';
import { material } from './material';
import { carbon } from './carbon';
import { antDesign } from './ant-design';
import { openProps } from './open-props';

export type { PresetOption, DesignSystemPreset } from './types';

export const DESIGN_SYSTEMS: DesignSystemPreset[] = [
  tailwind,
  material,
  carbon,
  antDesign,
  openProps,
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
