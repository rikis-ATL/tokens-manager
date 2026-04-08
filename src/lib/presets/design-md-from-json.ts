import type { DesignSystemPreset } from './types';
import vercelTokens from '../../../data/design-md/vercel.tokens.json';

const VERCEL_DOC =
  'https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/vercel/DESIGN.md';

const vercelAttribution =
  `Tokens interpreted from awesome-design-md Vercel DESIGN.md (not official Geist/Vercel). ${VERCEL_DOC}`;

type VercelTokenFile = typeof vercelTokens;

function slicePalette(tokens: VercelTokenFile): Record<string, unknown> {
  return { color: tokens.color };
}

function sliceTypescale(tokens: VercelTokenFile): Record<string, unknown> {
  return {
    fontFamily: tokens.fontFamily,
    fontSize: tokens.fontSize,
    fontWeight: tokens.fontWeight,
    lineHeight: tokens.lineHeight,
    letterSpacing: tokens.letterSpacing,
  };
}

function sliceSpacing(tokens: VercelTokenFile): Record<string, unknown> {
  return {
    dimension: tokens.dimension,
    borderRadius: tokens.borderRadius,
    breakpoint: tokens.breakpoint,
    shadow: tokens.shadow,
  };
}

/** W3C tokens derived from design-md/vercel/DESIGN.md (see data/design-md/vercel.tokens.md). */
export const vercelDesignMd: DesignSystemPreset = {
  id: 'design-md-vercel',
  name: 'Vercel (design-md)',
  palette: {
    id: 'design-md-vercel-palette',
    name: 'Vercel (design-md)',
    description: vercelAttribution,
    tokens: slicePalette(vercelTokens),
  },
  typescale: {
    id: 'design-md-vercel-typescale',
    name: 'Vercel (design-md)',
    description: vercelAttribution,
    tokens: sliceTypescale(vercelTokens),
  },
  spacing: {
    id: 'design-md-vercel-spacing',
    name: 'Vercel (design-md)',
    description: vercelAttribution,
    tokens: sliceSpacing(vercelTokens),
  },
};

/** Bundles backed by committed JSON under data/design-md/ — extend when adding more slugs. */
export const DESIGN_MD_JSON_BUNDLES: DesignSystemPreset[] = [vercelDesignMd];

export function findDesignMdJsonBundleById(id: string): DesignSystemPreset | undefined {
  return DESIGN_MD_JSON_BUNDLES.find((ds) => ds.id === id);
}
