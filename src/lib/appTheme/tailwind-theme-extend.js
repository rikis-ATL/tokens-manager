/**
 * Single source for Tailwind `theme.extend` — matches CSS variables in
 * `src/app/globals.css`, the shadcn bridge, `semantic-tailwind.ts`, and
 * `component-density-defaults.ts`. Keep in sync when adding a new semantic token.
 */
const typeSteps = [
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
];

const fontSize = {};
const lineHeight = {};
for (const s of typeSteps) {
  fontSize[s] = [`var(--text-${s})`, { lineHeight: `var(--leading-${s})` }];
  lineHeight[s] = `var(--leading-${s})`;
}

fontSize.button = ['var(--button-font-size)', { lineHeight: 'var(--button-line-height)' }];
fontSize.input = ['var(--input-font-size)', { lineHeight: 'var(--input-line-height)' }];
fontSize['input-label'] = [
  'var(--input-label-font-size)',
  { lineHeight: 'var(--input-label-line-height)' },
];
fontSize['menu-item'] = [
  'var(--menu-item-font-size)',
  { lineHeight: 'var(--menu-item-line-height)' },
];
fontSize['dropdown-item'] = [
  'var(--dropdown-item-font-size)',
  { lineHeight: 'var(--dropdown-item-line-height)' },
];
fontSize['card-title'] = [
  'var(--card-title-font-size)',
  { lineHeight: 'var(--card-title-line-height)' },
];
fontSize['card-subtitle'] = [
  'var(--card-subtitle-font-size)',
  { lineHeight: 'var(--card-subtitle-line-height)' },
];
fontSize['tabs-trigger'] = [
  'var(--tabs-trigger-font-size)',
  { lineHeight: 'var(--tabs-trigger-line-height)' },
];
fontSize['table-header'] = ['var(--table-header-font-size)', { lineHeight: 'var(--table-header-line-height)' }];
fontSize['table-cell'] = ['var(--table-cell-font-size)', { lineHeight: 'var(--table-cell-line-height)' }];

/** Matches `--*-padding-*` in globals.css / component-density-defaults */
const controlSpacing = {
  'button-x': 'var(--button-padding-x)',
  'button-y': 'var(--button-padding-y)',
  'button-x-sm': 'var(--button-padding-x-sm)',
  'button-y-sm': 'var(--button-padding-y-sm)',
  'button-x-lg': 'var(--button-padding-x-lg)',
  'button-y-lg': 'var(--button-padding-y-lg)',
  'input-x': 'var(--input-padding-x)',
  'input-y': 'var(--input-padding-y)',
  'input-viewport': 'var(--input-viewport-padding)',
  'menu-item-x': 'var(--menu-item-padding-x)',
  'menu-item-y': 'var(--menu-item-padding-y)',
  'dropdown-item-x': 'var(--dropdown-item-padding-x)',
  'dropdown-item-y': 'var(--dropdown-item-padding-y)',
  'button-group-gap': 'var(--button-group-gap)',
  'button-group-padding': 'var(--button-group-padding)',
  'tabs-list-pad': 'var(--tabs-list-padding)',
  'tabs-trigger-x': 'var(--tabs-trigger-padding-x)',
  'tabs-trigger-y': 'var(--tabs-trigger-padding-y)',
  'tabs-content': 'var(--tabs-content-margin-top)',
  'table-header-x': 'var(--table-header-padding-x)',
  'table-header-y': 'var(--table-header-padding-y)',
  'table-cell-x': 'var(--table-cell-padding-x)',
  'table-cell-y': 'var(--table-cell-padding-y)',
};

module.exports = {
  colors: {
    border: 'hsl(var(--border))',
    input: {
      DEFAULT: 'hsl(var(--input))',
      border: 'hsl(var(--input-border))',
    },
    ring: 'hsl(var(--ring))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    primary: {
      DEFAULT: 'hsl(var(--primary))',
      foreground: 'hsl(var(--primary-foreground))',
    },
    secondary: {
      DEFAULT: 'hsl(var(--secondary))',
      foreground: 'hsl(var(--secondary-foreground))',
    },
    destructive: {
      DEFAULT: 'hsl(var(--destructive))',
      foreground: 'hsl(var(--destructive-foreground))',
    },
    button: {
      border: 'hsl(var(--button-border))',
    },
    menu: {
      border: 'hsl(var(--menu-border))',
    },
    tabs: {
      border: 'hsl(var(--tabs-border))',
    },
    dialog: {
      border: 'hsl(var(--dialog-border))',
    },
    badge: {
      border: 'hsl(var(--badge-border))',
    },
    muted: {
      DEFAULT: 'hsl(var(--muted))',
      foreground: 'hsl(var(--muted-foreground))',
    },
    accent: {
      DEFAULT: 'hsl(var(--accent))',
      foreground: 'hsl(var(--accent-foreground))',
    },
    popover: {
      DEFAULT: 'hsl(var(--popover))',
      foreground: 'hsl(var(--popover-foreground))',
      border: 'hsl(var(--popover-border))',
    },
    card: {
      DEFAULT: 'hsl(var(--card-background))',
      foreground: 'hsl(var(--card-foreground))',
      border: 'hsl(var(--card-border))',
    },
    success: {
      DEFAULT: 'hsl(var(--success))',
      foreground: 'hsl(var(--success-foreground))',
    },
    warning: {
      DEFAULT: 'hsl(var(--warning))',
      foreground: 'hsl(var(--warning-foreground))',
    },
    info: {
      DEFAULT: 'hsl(var(--info))',
      foreground: 'hsl(var(--info-foreground))',
    },
  },
  spacing: controlSpacing,
  height: {
    menubar: 'var(--menubar-height)',
    'tabs-list': 'var(--tabs-list-height)',
    'table-row': 'var(--table-row-height)',
  },
  minHeight: {
    'input-min': 'var(--input-min-height)',
    'table-row': 'var(--table-row-height)',
  },
  borderRadius: {
    lg: 'var(--radius)',
    md: 'calc(var(--radius) - 2px)',
    sm: 'calc(var(--radius) - 4px)',
    button: 'var(--button-border-radius)',
    input: 'var(--input-border-radius)',
    'tabs-list': 'var(--tabs-list-border-radius)',
    card: 'var(--card-border-radius)',
  },
  fontFamily: {
    sans: [
      'var(--font-sans)',
      'ui-sans-serif',
      'system-ui',
      'sans-serif',
      'Apple Color Emoji',
      'Segoe UI Emoji',
      'Segoe UI Symbol',
    ],
    mono: [
      'var(--font-mono)',
      'ui-monospace',
      'SFMono-Regular',
      'SF Mono',
      'Menlo',
      'Consolas',
      'Liberation Mono',
      'monospace',
    ],
    secondary: [
      'var(--font-secondary)',
      'var(--font-sans)',
      'ui-sans-serif',
      'system-ui',
      'sans-serif',
    ],
  },
  lineHeight,
  fontSize,
};
