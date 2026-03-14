import type { TokenType } from './token.types';

// ─── Output naming ────────────────────────────────────────────────────────────

export type NamingPattern =
  | 'step-100'   // 100, 200, 300 … 900
  | 'step-50'    // 50, 100, 150 … 500
  | 'step-10'    // 10, 20, 30 … 100
  | 'step-1'     // 1, 2, 3 … n
  | 'tshirt';    // xs, sm, md, lg, xl, 2xl, 3xl …

export const NAMING_PATTERNS: { value: NamingPattern; label: string }[] = [
  { value: 'step-100', label: '100 · 200 · 300 …' },
  { value: 'step-50',  label: '50 · 100 · 150 …' },
  { value: 'step-10',  label: '10 · 20 · 30 …' },
  { value: 'step-1',   label: '1 · 2 · 3 …' },
  { value: 'tshirt',   label: 'xs · sm · md · lg …' },
];

export const TSHIRT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];

// ─── Color generator ──────────────────────────────────────────────────────────

export type ColorFormat   = 'hsl' | 'hex' | 'rgb' | 'oklch';
export type ColorChannel  = 'lightness' | 'saturation' | 'hue';
export type DistributionScale = 'linear' | 'logarithmic';

export const COLOR_FORMATS:  { value: ColorFormat;  label: string }[] = [
  { value: 'hsl',   label: 'HSL' },
  { value: 'hex',   label: 'HEX' },
  { value: 'rgb',   label: 'RGB' },
  { value: 'oklch', label: 'OKLCH' },
];

export const COLOR_CHANNELS: { value: ColorChannel; label: string }[] = [
  { value: 'lightness',  label: 'Lightness (L)' },
  { value: 'saturation', label: 'Saturation (S)' },
  { value: 'hue',        label: 'Hue (H)' },
];

export interface ColorGeneratorConfig {
  kind: 'color';
  format: ColorFormat;
  channel: ColorChannel;
  baseHue: number;        // 0–360
  baseSaturation: number; // 0–100
  minChannel: number;     // min value for the chosen channel
  maxChannel: number;     // max value for the chosen channel
  distribution: DistributionScale;
}

// ─── Dimension / numeric generator ───────────────────────────────────────────

export type DimensionFormat = 'rem' | 'px' | 'em' | '%' | 'unitless';
export type DimensionScale  = 'linear' | 'harmonic' | 'modular';

export const DIMENSION_FORMATS: { value: DimensionFormat; label: string }[] = [
  { value: 'rem',      label: 'rem' },
  { value: 'px',       label: 'px' },
  { value: 'em',       label: 'em' },
  { value: '%',        label: '%' },
  { value: 'unitless', label: 'unitless' },
];

export const DIMENSION_SCALES: { value: DimensionScale; label: string }[] = [
  { value: 'linear',   label: 'Linear' },
  { value: 'harmonic', label: 'Harmonic' },
  { value: 'modular',  label: 'Modular (type scale)' },
];

export const MODULAR_RATIOS: { value: number; label: string }[] = [
  { value: 1.067, label: 'Minor Second (×1.067)' },
  { value: 1.125, label: 'Major Second (×1.125)' },
  { value: 1.200, label: 'Minor Third (×1.200)' },
  { value: 1.250, label: 'Major Third (×1.250)' },
  { value: 1.333, label: 'Perfect Fourth (×1.333)' },
  { value: 1.414, label: 'Augmented Fourth (×1.414)' },
  { value: 1.500, label: 'Perfect Fifth (×1.500)' },
  { value: 1.618, label: 'Golden Ratio (×1.618)' },
];

export interface DimensionGeneratorConfig {
  kind: 'dimension';
  format: DimensionFormat;
  scale: DimensionScale;
  baseValue: number;     // base numeric value (in the chosen format)
  minValue: number;      // min numeric value
  maxValue: number;      // max numeric value
  modularRatio: number;  // used when scale === 'modular'
  modularBase: number;   // the "1" step when scale === 'modular'
}

// ─── Union generator config ───────────────────────────────────────────────────

export type GeneratorSpecificConfig = ColorGeneratorConfig | DimensionGeneratorConfig;

export const GENERATOR_CATEGORIES: { type: TokenType; kind: 'color' | 'dimension'; label: string }[] = [
  { type: 'color',        kind: 'color',     label: 'Color' },
  { type: 'dimension',    kind: 'dimension', label: 'Dimension' },
  { type: 'fontSize',     kind: 'dimension', label: 'Font Size' },
  { type: 'borderRadius', kind: 'dimension', label: 'Border Radius' },
  { type: 'borderWidth',  kind: 'dimension', label: 'Border Width' },
  { type: 'lineHeight',   kind: 'dimension', label: 'Line Height' },
  { type: 'opacity',      kind: 'dimension', label: 'Opacity' },
  { type: 'fontWeight',   kind: 'dimension', label: 'Font Weight' },
];

export interface GeneratorConfig {
  id: string;
  groupId: string;
  label: string;
  type: TokenType;
  count: number;
  naming: NamingPattern;
  config: GeneratorSpecificConfig;
}

export interface GeneratedTokenPreview {
  name: string;
  value: string;
  cssPreview?: string; // for color: the resolved color value
}
