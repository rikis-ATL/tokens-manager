/**
 * Marketing theme for sign-in, signup, landing (data-marketing="true").
 * Semantic tokens map to Tailwind default palette — tweak colors here by name.
 */
const colors = require('tailwindcss/colors');
const { borderRadius } = require('tailwindcss/defaultTheme');

/** @param {string} hex */
function hexToHslChannels(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      default:
        hue = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

/** shadcn CSS vars (H S% L% channels) — keys match --token names without prefix */
const MARKETING_SHADCN = {
  // Canvas
  background: colors.zinc[800], // bg-slate-950
  foreground: colors.slate[200], // text-slate-200
  // Cards / surfaces
  card: colors.zinc[900], // bg-slate-900
  cardForeground: colors.zinc[200],
  cardBorder: colors.zinc[800], // border-slate-800
  popover: colors.zinc[900],
  popoverForeground: colors.zinc[200],
  popoverBorder: colors.zinc[800],
  // Borders & inputs
  border: colors.zinc[700], // border-slate-700
  input: colors.zinc[800], // bg-input — field fill (slate-900)
  inputBorder: colors.zinc[600],
  buttonBorder: colors.zinc[800],
  menuBorder: colors.zinc[800],
  tabsBorder: colors.zinc[800],
  dialogBorder: colors.zinc[800],
  badgeBorder: colors.zinc[800],
  // Muted
  muted: colors.zinc[900],
  mutedForeground: colors.zinc[400], // text-slate-500
  // Accents
  accent: colors.slate[800],
  accentForeground: colors.slate[200],
  // Primary CTA
  primary: colors.cyan[300], // bg-sky-400
  primaryForeground: colors.slate[950],
  // Secondary
  secondary: colors.zinc[700],
  secondaryForeground: colors.slate[200],
  // Misc
  ring: colors.sky[400],
  destructive: colors.red[500],
  destructiveForeground: colors.slate[50],
};

/** Full CSS color values (not HSL channels) — used by motion text highlights */
const MARKETING_FULL = {
  textAccent: colors.cyan[400],
  surface1: colors.zinc[800],
};

/** Layout / radius — use bracket notation for colors (zinc[800]), Tailwind rounded-* for radius */
const MARKETING_LAYOUT = {
  radius: borderRadius.lg,
  buttonBorderRadius: borderRadius.md,
};

/**
 * CSS custom properties for `[data-marketing="true"]`.
 * Injected via tailwind.config.js plugin.
 */
function getMarketingThemeCssVars() {
  return {
    '--background': hexToHslChannels(MARKETING_SHADCN.background),
    '--foreground': hexToHslChannels(MARKETING_SHADCN.foreground),
    color: 'hsl(var(--foreground))',
    '--card': hexToHslChannels(MARKETING_SHADCN.card),
    '--card-background': hexToHslChannels(MARKETING_SHADCN.card),
    '--card-foreground': hexToHslChannels(MARKETING_SHADCN.cardForeground),
    '--card-border': hexToHslChannels(MARKETING_SHADCN.cardBorder),
    '--popover': hexToHslChannels(MARKETING_SHADCN.popover),
    '--popover-foreground': hexToHslChannels(MARKETING_SHADCN.popoverForeground),
    '--popover-border': hexToHslChannels(MARKETING_SHADCN.popoverBorder),
    '--border': hexToHslChannels(MARKETING_SHADCN.border),
    '--input': hexToHslChannels(MARKETING_SHADCN.input),
    '--input-border': hexToHslChannels(MARKETING_SHADCN.inputBorder),
    '--button-border': hexToHslChannels(MARKETING_SHADCN.buttonBorder),
    '--menu-border': hexToHslChannels(MARKETING_SHADCN.menuBorder),
    '--tabs-border': hexToHslChannels(MARKETING_SHADCN.tabsBorder),
    '--dialog-border': hexToHslChannels(MARKETING_SHADCN.dialogBorder),
    '--badge-border': hexToHslChannels(MARKETING_SHADCN.badgeBorder),
    '--muted': hexToHslChannels(MARKETING_SHADCN.muted),
    '--muted-foreground': hexToHslChannels(MARKETING_SHADCN.mutedForeground),
    '--accent': hexToHslChannels(MARKETING_SHADCN.accent),
    '--accent-foreground': hexToHslChannels(MARKETING_SHADCN.accentForeground),
    '--primary': hexToHslChannels(MARKETING_SHADCN.primary),
    '--primary-foreground': hexToHslChannels(MARKETING_SHADCN.primaryForeground),
    '--secondary': hexToHslChannels(MARKETING_SHADCN.secondary),
    '--secondary-foreground': hexToHslChannels(MARKETING_SHADCN.secondaryForeground),
    '--ring': hexToHslChannels(MARKETING_SHADCN.ring),
    '--destructive': hexToHslChannels(MARKETING_SHADCN.destructive),
    '--destructive-foreground': hexToHslChannels(MARKETING_SHADCN.destructiveForeground),
    '--text-accent': MARKETING_FULL.textAccent,
    '--surface1': MARKETING_FULL.surface1,
    '--radius': MARKETING_LAYOUT.radius,
    '--button-border-radius': MARKETING_LAYOUT.buttonBorderRadius,
  };
}

const marketingAutofillSelectors = [
  '[data-marketing="true"] input:-webkit-autofill',
  '[data-marketing="true"] input:-webkit-autofill:hover',
  '[data-marketing="true"] input:-webkit-autofill:focus',
  '[data-marketing="true"] input:-webkit-autofill:active',
];

function getMarketingAutofillStyles() {
  const fill = MARKETING_SHADCN.card;
  return Object.fromEntries(
    marketingAutofillSelectors.map((selector) => [
      selector,
      {
        '-webkit-text-fill-color': `${MARKETING_SHADCN.foreground} !important`,
        '-webkit-box-shadow': `0 0 0 1000px ${fill} inset !important`,
      },
    ])
  );
}

module.exports = {
  MARKETING_SHADCN,
  MARKETING_FULL,
  MARKETING_LAYOUT,
  getMarketingThemeCssVars,
  getMarketingAutofillStyles,
};
