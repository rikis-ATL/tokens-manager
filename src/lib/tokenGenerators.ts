/**
 * Token generation algorithms.
 * Converts a GeneratorConfig into a list of { name, value } token previews.
 */

import {
  GeneratorConfig,
  GeneratedTokenPreview,
  ColorGeneratorConfig,
  DimensionGeneratorConfig,
  TSHIRT_SIZES,
} from '@/types/generator.types';
import type { GeneratedToken } from '@/types';
import { generateId } from '@/utils';

// ─── Utilities ───────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Naming helpers ───────────────────────────────────────────────────────────

function buildNames(count: number, naming: GeneratorConfig['naming']): string[] {
  switch (naming) {
    case 'step-100': return Array.from({ length: count }, (_, i) => String((i + 1) * 100));
    case 'step-50':  return Array.from({ length: count }, (_, i) => String((i + 1) * 50));
    case 'step-10':  return Array.from({ length: count }, (_, i) => String((i + 1) * 10));
    case 'step-1':   return Array.from({ length: count }, (_, i) => String(i + 1));
    case 'tshirt':   return TSHIRT_SIZES.slice(0, count);
    default:         return Array.from({ length: count }, (_, i) => String(i + 1));
  }
}

// ─── Distribution ─────────────────────────────────────────────────────────────

function linearSteps(min: number, max: number, count: number): number[] {
  if (count === 1) return [(min + max) / 2];
  return Array.from({ length: count }, (_, i) => min + (max - min) * (i / (count - 1)));
}

function logarithmicSteps(min: number, max: number, count: number): number[] {
  if (count === 1) return [(min + max) / 2];
  const logMin = Math.log(Math.max(min, 0.001));
  const logMax = Math.log(Math.max(max, 0.001));
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return Math.exp(logMin + (logMax - logMin) * t);
  });
}

function modularSteps(base: number, ratio: number, count: number): number[] {
  const mid = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => {
    const exp = i - mid;
    return base * Math.pow(ratio, exp);
  });
}

function harmonicSteps(min: number, max: number, count: number): number[] {
  // Harmonic: min * ratio^i  where ratio = (max/min)^(1/(n-1))
  if (count === 1) return [min];
  const safeMin = Math.max(min, 0.001);
  const safeMax = Math.max(max, 0.001);
  const ratio = Math.pow(safeMax / safeMin, 1 / (count - 1));
  return Array.from({ length: count }, (_, i) => safeMin * Math.pow(ratio, i));
}

// ─── Color conversion ─────────────────────────────────────────────────────────

import {
  hslToRgb,
  rgbToHex,
  formatHsl,
  formatOklch,
  rgbToOklch,
} from './colorUtils';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatColor(h: number, s: number, l: number, format: string): string {
  h = clamp(h, 0, 360);
  s = clamp(s, 0, 100);
  l = clamp(l, 0, 100);
  
  const rgb = hslToRgb(h, s, l);
  
  switch (format) {
    case 'hsl':   return formatHsl(h, s, l);
    case 'hex':   return rgbToHex(rgb.r, rgb.g, rgb.b);
    case 'rgb':   return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'oklch': {
      const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      return formatOklch(oklch.l, oklch.c, oklch.h);
    }
    default:      return formatHsl(h, s, l);
  }
}

// ─── Color generation ─────────────────────────────────────────────────────────

function generateColorTokens(
  cfg: ColorGeneratorConfig,
  count: number,
  names: string[]
): GeneratedTokenPreview[] {
  const dist = cfg.distribution === 'logarithmic'
    ? logarithmicSteps(cfg.minChannel, cfg.maxChannel, count)
    : linearSteps(cfg.minChannel, cfg.maxChannel, count);

  return dist.map((channelValue, i) => {
    let h = cfg.baseHue, s = cfg.baseSaturation, l = 50;
    switch (cfg.channel) {
      case 'lightness':  l = channelValue; break;
      case 'saturation': s = channelValue; break;
      case 'hue':        h = channelValue; break;
    }
    const value = formatColor(h, s, l, cfg.format);
    const cssColor = formatColor(h, s, l, 'hsl'); // always HSL for preview swatch
    return { name: names[i], value, cssPreview: cssColor };
  });
}

// ─── Dimension generation ─────────────────────────────────────────────────────

function formatDimension(value: number, format: string): string {
  const r = round2(value);
  return format === 'unitless' ? String(r) : `${r}${format}`;
}

function generateDimensionTokens(
  cfg: DimensionGeneratorConfig,
  count: number,
  names: string[]
): GeneratedTokenPreview[] {
  let steps: number[];
  switch (cfg.scale) {
    case 'linear':   steps = linearSteps(cfg.minValue, cfg.maxValue, count); break;
    case 'harmonic': steps = harmonicSteps(cfg.minValue, cfg.maxValue, count); break;
    case 'modular':  steps = modularSteps(cfg.modularBase, cfg.modularRatio, count); break;
    default:         steps = linearSteps(cfg.minValue, cfg.maxValue, count);
  }
  return steps.map((v, i) => ({
    name: names[i],
    value: formatDimension(v, cfg.format),
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function previewGeneratedTokens(config: GeneratorConfig): GeneratedTokenPreview[] {
  const names = buildNames(config.count, config.naming);
  const { config: cfg } = config;
  if (cfg.kind === 'color') return generateColorTokens(cfg, config.count, names);
  return generateDimensionTokens(cfg, config.count, names);
}

export function buildGeneratedTokens(
  config: GeneratorConfig,
  groupPath: string
): GeneratedToken[] {
  const previews = previewGeneratedTokens(config);
  return previews.map(p => ({
    id: `${config.groupId}/${config.id}/${p.name}-${generateId()}`,
    path: p.name,
    value: p.value,
    type: config.type,
    description: `Generated by ${config.label}`,
  }));
}

// ─── Default configs ──────────────────────────────────────────────────────────

export function defaultColorConfig(): ColorGeneratorConfig {
  return {
    kind: 'color',
    format: 'hsl',
    channel: 'lightness',
    baseHue: 210,
    baseSaturation: 80,
    minChannel: 10,
    maxChannel: 90,
    distribution: 'linear',
  };
}

export function defaultDimensionConfig(): DimensionGeneratorConfig {
  return {
    kind: 'dimension',
    format: 'rem',
    scale: 'modular',
    baseValue: 1,
    minValue: 0.25,
    maxValue: 4,
    modularRatio: 1.25,
    modularBase: 1,
  };
}
