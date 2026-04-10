import type { DesignSystemPreset } from './types';
import vercelTokens from '../../../data/design-md/vercel.tokens.json';
import figmaTokens from '../../../data/design-md/figma.tokens.json';
import claudeTokens from '../../../data/design-md/claude.tokens.json';
import lovableTokens from '../../../data/design-md/lovable.tokens.json';
import appleTokens from '../../../data/design-md/apple.tokens.json';
import airbnbTokens from '../../../data/design-md/airbnb.tokens.json';
import orbitTokens from '../../../data/design-md/orbit.tokens.json';
import polarisTokens from '../../../data/design-md/polaris.tokens.json';
import primerTokens from '../../../data/design-md/primer.tokens.json';
import pasteTokens from '../../../data/design-md/paste.tokens.json';
import atlassianTokens from '../../../data/design-md/atlassian.tokens.json';
import baseWebTokens from '../../../data/design-md/base-web.tokens.json';
import elasticUiTokens from '../../../data/design-md/elastic-ui.tokens.json';
import fluent2Tokens from '../../../data/design-md/fluent2.tokens.json';
import lightningTokens from '../../../data/design-md/lightning.tokens.json';
import gestaltTokens from '../../../data/design-md/gestalt.tokens.json';
import vscodeDarkTokens from '../../../data/design-md/vscode-dark-plus.tokens.json';
import vscodeLightTokens from '../../../data/design-md/vscode-light-plus.tokens.json';
import jetbrainsDarculaTokens from '../../../data/design-md/jetbrains-darcula.tokens.json';
import jetbrainsLightTokens from '../../../data/design-md/jetbrains-light.tokens.json';
import datavizTokens from '../../../data/design-md/dataviz.tokens.json';
import unifiLightTokens from '../../../data/design-md/unifi-light.tokens.json';
import unifiDarkTokens from '../../../data/design-md/unifi-dark.tokens.json';
import abletonTokens from '../../../data/design-md/ableton.tokens.json';

// ─── Shared slice helpers ────────────────────────────────────────────────────

function slicePalette<T extends { color: unknown }>(tokens: T): Record<string, unknown> {
  return { color: tokens.color };
}

function sliceTypescale<T extends {
  fontFamily: unknown;
  fontSize: unknown;
  fontWeight: unknown;
  lineHeight: unknown;
  letterSpacing: unknown;
}>(tokens: T): Record<string, unknown> {
  return {
    fontFamily: tokens.fontFamily,
    fontSize: tokens.fontSize,
    fontWeight: tokens.fontWeight,
    lineHeight: tokens.lineHeight,
    letterSpacing: tokens.letterSpacing,
  };
}

function sliceSpacing<T extends {
  dimension: unknown;
  borderRadius: unknown;
  breakpoint: unknown;
  shadow: unknown;
}>(tokens: T): Record<string, unknown> {
  return {
    dimension: tokens.dimension,
    borderRadius: tokens.borderRadius,
    breakpoint: tokens.breakpoint,
    shadow: tokens.shadow,
  };
}

interface TokenFile {
  color: unknown;
  fontFamily: unknown;
  fontSize: unknown;
  fontWeight: unknown;
  lineHeight: unknown;
  letterSpacing: unknown;
  dimension: unknown;
  borderRadius: unknown;
  breakpoint: unknown;
  shadow: unknown;
}

function makePreset(
  id: string,
  name: string,
  description: string,
  tokens: TokenFile,
): DesignSystemPreset {
  return {
    id,
    name,
    palette: { id: `${id}-palette`, name, description, tokens: slicePalette(tokens) },
    typescale: { id: `${id}-typescale`, name, description, tokens: sliceTypescale(tokens) },
    spacing: { id: `${id}-spacing`, name, description, tokens: sliceSpacing(tokens) },
  };
}

// ─── Presets ─────────────────────────────────────────────────────────────────

/** W3C tokens derived from design-md/vercel/DESIGN.md (see data/design-md/vercel.tokens.md). */
export const vercelDesignMd = makePreset(
  'design-md-vercel',
  'Vercel (design-md)',
  'Tokens interpreted from awesome-design-md Vercel DESIGN.md (not official Geist/Vercel). https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/vercel/DESIGN.md',
  vercelTokens,
);

export const figmaDesignMd = makePreset(
  'design-md-figma',
  'Figma',
  'Tokens derived from Figma\'s brand and product UI — Inter typeface, purple brand, 8px grid.',
  figmaTokens,
);

export const claudeDesignMd = makePreset(
  'design-md-claude',
  'Claude (Anthropic)',
  'Tokens derived from claude.ai — warm cream palette, amber/orange brand accent, Söhne typeface.',
  claudeTokens,
);

export const lovableDesignMd = makePreset(
  'design-md-lovable',
  'Lovable',
  'Tokens derived from lovable.dev — orange brand, violet AI accent, Inter typeface, 8px grid.',
  lovableTokens,
);

export const appleDesignMd = makePreset(
  'design-md-apple',
  'Apple (HIG)',
  'Tokens from the Apple Human Interface Guidelines — SF Pro, system colors, 8pt grid, HIG text styles.',
  appleTokens,
);

export const airbnbDesignMd = makePreset(
  'design-md-airbnb',
  'Airbnb (DLS)',
  'Tokens from the Airbnb Design Language System — Circular typeface, Rausch coral brand, 8px grid.',
  airbnbTokens,
);

export const orbitDesignMd = makePreset(
  'design-md-orbit',
  'Orbit (Kiwi.com)',
  'Tokens from Kiwi.com Orbit design system — Circular Pro, travel orange brand, inkDark/cloudLight neutrals.',
  orbitTokens,
);

export const polarisDesignMd = makePreset(
  'design-md-polaris',
  'Polaris (Shopify)',
  'Tokens from Shopify Polaris — Shopify green brand, commerce-focused neutrals, system font stack.',
  polarisTokens,
);

export const primerDesignMd = makePreset(
  'design-md-primer',
  'Primer (GitHub)',
  'Tokens from GitHub Primer design system — GitHub blue, fg/canvas/border semantic scale, mono-heavy.',
  primerTokens,
);

export const pasteDesignMd = makePreset(
  'design-md-paste',
  'Paste (Twilio)',
  'Tokens from Twilio Paste design system — Twilio red brand, strong a11y focus, Inter typeface.',
  pasteTokens,
);

export const atlassianDesignMd = makePreset(
  'design-md-atlassian',
  'Atlassian Design System',
  'Tokens from the Atlassian Design System — Atlassian blue, full N0–N900 neutral ramp, Jira/Confluence palette.',
  atlassianTokens,
);

export const baseWebDesignMd = makePreset(
  'design-md-base-web',
  'Base Web (Uber)',
  'Tokens from Uber Base Web design system — Uber blue primary, full semantic scale, dense data-table aesthetic.',
  baseWebTokens,
);

export const elasticUiDesignMd = makePreset(
  'design-md-elastic-ui',
  'Elastic UI (Kibana)',
  'Tokens from Elastic UI — Kibana blue, 10-series data vis palette, dense control sizing, dark-mode ready.',
  elasticUiTokens,
);

export const fluent2DesignMd = makePreset(
  'design-md-fluent2',
  'Fluent 2 (Microsoft)',
  'Tokens from Microsoft Fluent 2 — Segoe UI Variable, 16-step brand ramp, Windows 11 shadow scale.',
  fluent2Tokens,
);

export const lightningDesignMd = makePreset(
  'design-md-lightning',
  'Lightning DS (Salesforce)',
  'Tokens from Salesforce Lightning Design System — dense 14px body, structured neutral ramp, enterprise palette.',
  lightningTokens,
);

export const gestaltDesignMd = makePreset(
  'design-md-gestalt',
  'Gestalt (Pinterest)',
  'Tokens from Pinterest Gestalt — Pinterest red, Graphik typeface, image-first pin card sizing.',
  gestaltTokens,
);

export const unifiLightDesignMd = makePreset(
  'design-md-unifi-light',
  'UniFi (Light)',
  'Tokens from the Ubiquiti UniFi design system — #006FFF brand blue, cool-gray neutrals, 4px grid, dense data UI. Light theme with UI + chart series colors.',
  unifiLightTokens,
);

export const unifiDarkDesignMd = makePreset(
  'design-md-unifi-dark',
  'UniFi (Dark)',
  'Tokens from the Ubiquiti UniFi design system — dark canvas (#0F1115), #3D8BFF links, cool-gray neutrals. Dark theme with UI + chart series colors optimised for dark backgrounds.',
  unifiDarkTokens,
);

// ─── Bundle ──────────────────────────────────────────────────────────────────

/** All committed design-md JSON bundles. Add new entries here when extending. */
export const DESIGN_MD_JSON_BUNDLES: DesignSystemPreset[] = [
  vercelDesignMd,
  figmaDesignMd,
  claudeDesignMd,
  lovableDesignMd,
  appleDesignMd,
  airbnbDesignMd,
  orbitDesignMd,
  polarisDesignMd,
  primerDesignMd,
  pasteDesignMd,
  atlassianDesignMd,
  baseWebDesignMd,
  elasticUiDesignMd,
  fluent2DesignMd,
  lightningDesignMd,
  gestaltDesignMd,
  makePreset('design-md-vscode-dark', 'VS Code Dark+', 'VS Code Dark+ theme — #1E1E1E editor, syntax palette (comments green, strings salmon, keywords blue), ANSI terminal colors.', vscodeDarkTokens),
  makePreset('design-md-vscode-light', 'VS Code Light+', 'VS Code Light+ theme — white editor, syntax palette (comments green, strings dark-red, keywords blue), ANSI terminal colors.', vscodeLightTokens),
  makePreset('design-md-jetbrains-darcula', 'JetBrains Darcula', 'IntelliJ Darcula dark theme — #2B2B2B bg, orange keywords, green strings, JetBrains Mono, VCS diff colors.', jetbrainsDarculaTokens),
  makePreset('design-md-jetbrains-light', 'JetBrains Light', 'IntelliJ Light theme — white editor, classic blue keywords, JetBrains Mono, light VCS diff colors.', jetbrainsLightTokens),
  makePreset('design-md-dataviz', 'Data Visualization', 'Curated data viz palettes — Tableau10, D3 Category10, Observable10, IBM DataViz, ColorBrewer, Viridis, Plasma, RdBu diverging, traffic-light.', datavizTokens),
  unifiLightDesignMd,
  unifiDarkDesignMd,
  makePreset('design-md-ableton', 'Ableton Live', 'Tokens from the Ableton Live UI — warm dark grays (#222), #FF7200 orange active states, Helvetica Neue, 4px grid, dense control-heavy interface. Includes clip colors, audio meters, and waveform palette.', abletonTokens),
];

export function findDesignMdJsonBundleById(id: string): DesignSystemPreset | undefined {
  return DESIGN_MD_JSON_BUNDLES.find((ds) => ds.id === id);
}
