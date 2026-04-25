/**
 * Default type scale (font-size + line-height) aligned with Tailwind 3, plus 2xs.
 * Used for CSS fallbacks in globals + shadcn bridge when tokens omit a step.
 */
export const TYPE_SCALE_STEPS = [
  '2xs',
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
] as const;

export type TypeScaleStep = (typeof TYPE_SCALE_STEPS)[number];

export const TYPE_SCALE_DEFAULTS: Readonly<Record<TypeScaleStep, { size: string; leading: string }>> = {
  '2xs': { size: '0.625rem', leading: '0.875rem' },
  xs: { size: '0.75rem', leading: '1rem' },
  sm: { size: '0.875rem', leading: '1.25rem' },
  base: { size: '1rem', leading: '1.5rem' },
  lg: { size: '1.125rem', leading: '1.75rem' },
  xl: { size: '1.25rem', leading: '1.75rem' },
  '2xl': { size: '1.5rem', leading: '2rem' },
  '3xl': { size: '1.875rem', leading: '2.25rem' },
  '4xl': { size: '2.25rem', leading: '2.5rem' },
  '5xl': { size: '3rem', leading: '1' },
  '6xl': { size: '3.75rem', leading: '1' },
  '7xl': { size: '4.5rem', leading: '1' },
  '8xl': { size: '6rem', leading: '1' },
  '9xl': { size: '8rem', leading: '1' },
};

/**
 * shadcn group leaf names for type scale: `text-2xs`, `leading-2xs`, …
 * Token paths: `namespace.shadcn.text-2xs`, etc. → `--{ns}-shadcn-text-2xs`
 */
export function shadcnTypeScaleLeaves(): string[] {
  const out: string[] = [];
  for (const s of TYPE_SCALE_STEPS) {
    out.push(`text-${s}`);
    out.push(`leading-${s}`);
  }
  return out;
}
