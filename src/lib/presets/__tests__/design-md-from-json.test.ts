import {
  mergePresetTokens,
  findPreset,
  PALETTE_PRESETS,
  TYPESCALE_PRESETS,
  SPACING_PRESETS,
  getPaletteFamilies,
  getPaletteFamilyColors,
} from '@/lib/presets';

describe('design-md Vercel JSON preset', () => {
  it('registers palette, typescale, and spacing preset options', () => {
    expect(findPreset(PALETTE_PRESETS, 'design-md-vercel-palette')).toBeDefined();
    expect(findPreset(TYPESCALE_PRESETS, 'design-md-vercel-typescale')).toBeDefined();
    expect(findPreset(SPACING_PRESETS, 'design-md-vercel-spacing')).toBeDefined();
  });

  it('mergePresetTokens merges typographic, color, and layout groups', () => {
    const palette = findPreset(PALETTE_PRESETS, 'design-md-vercel-palette');
    const typescale = findPreset(TYPESCALE_PRESETS, 'design-md-vercel-typescale');
    const spacing = findPreset(SPACING_PRESETS, 'design-md-vercel-spacing');
    const merged = mergePresetTokens(palette, typescale, spacing);
    expect(merged.color).toBeDefined();
    expect(merged.fontSize).toBeDefined();
    expect(merged.dimension).toBeDefined();
    expect(merged.borderRadius).toBeDefined();
    expect(merged.breakpoint).toBeDefined();
  });

  it('exposes color families for palette graph preset mode', () => {
    const families = getPaletteFamilies('design-md-vercel-palette');
    const ids = families.map((f) => f.id).sort();
    expect(ids).toContain('neutral');
    expect(ids).toContain('workflow');
    const colors = getPaletteFamilyColors('design-md-vercel-palette', 'neutral');
    expect(colors?.values.length).toBeGreaterThan(0);
    expect(colors?.values.some((v) => v.startsWith('#'))).toBe(true);
  });
});
