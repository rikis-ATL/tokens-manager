import {
  appendShadcnBridge,
  hexToShadcnHslComponents,
  normalizeShadcnHexColorsInCss,
  normalizeShadcnHslWrappersInCss,
  shadcnSourceVarName,
} from '../shadcn-bridge';

describe('shadcnSourceVarName', () => {
  it('builds SD-style var names for token namespace', () => {
    expect(shadcnSourceVarName('token', 'background')).toBe('--token-shadcn-background');
    expect(shadcnSourceVarName('token', 'card-foreground')).toBe('--token-shadcn-card-foreground');
  });
});

describe('normalizeShadcnHslWrappersInCss', () => {
  it('strips outer hsl() from shadcn color vars', () => {
    const input =
      ':root {\n  --token-shadcn-background: hsl(222.2 84% 4.9%);\n  --token-shadcn-ring: hsla(224.3 76.3% 48% / 0.5);\n}\n';
    const out = normalizeShadcnHslWrappersInCss(input, 'token');
    expect(out).toContain('--token-shadcn-background: 222.2 84% 4.9%;');
    expect(out).toContain('--token-shadcn-ring: 224.3 76.3% 48% / 0.5;');
  });

  it('does not change radius or non-shadcn vars', () => {
    const input =
      ':root {\n  --token-shadcn-radius: 0.75rem;\n  --token-other: hsl(0 0% 50%);\n}\n';
    const out = normalizeShadcnHslWrappersInCss(input, 'token');
    expect(out).toContain('--token-shadcn-radius: 0.75rem;');
    expect(out).toContain('--token-other: hsl(0 0% 50%);');
  });

  it('leaves bare HSL components unchanged', () => {
    const input = ':root {\n  --token-shadcn-foreground: 210 40% 98%;\n}\n';
    expect(normalizeShadcnHslWrappersInCss(input, 'token')).toBe(input);
  });
});

describe('hexToShadcnHslComponents', () => {
  it('converts 3- and 6-digit hex to HSL components', () => {
    expect(hexToShadcnHslComponents('#fff')).toBe('0 0% 100%');
    expect(hexToShadcnHslComponents('#ffffff')).toBe('0 0% 100%');
    expect(hexToShadcnHslComponents('#f00')).toBe('0 100% 50%');
  });
});

describe('normalizeShadcnHexColorsInCss', () => {
  it('rewrites shadcn hex declarations to HSL components', () => {
    const input = ':root {\n  --token-shadcn-background: #ff0000;\n}\n';
    const out = normalizeShadcnHexColorsInCss(input, 'token');
    expect(out).toContain('--token-shadcn-background: 0 100% 50%;');
  });
});

describe('appendShadcnBridge', () => {
  it('normalizes hex on source vars then appends aliases', () => {
    const input = ':root {\n  --token-shadcn-background: #00ff00;\n}\n';
    const out = appendShadcnBridge(input, 'token');
    expect(out).toMatch(/--token-shadcn-background: [\d.]+ [\d.]+% [\d.]+%;/);
    expect(out).toContain('--background: var(--token-shadcn-background);');
  });

  it('normalizes hsl() on source vars then appends aliases', () => {
    const input = ':root {\n  --token-shadcn-background: hsl(0 0% 100%);\n}\n';
    const out = appendShadcnBridge(input, 'token');
    expect(out).toContain('--token-shadcn-background: 0 0% 100%;');
    expect(out).toContain('--background: var(--token-shadcn-background);');
  });

  it('appends :root aliases when only :root exists', () => {
    const input = ':root {\n  --token-shadcn-background: 0 0% 100%;\n}\n';
    const out = appendShadcnBridge(input, 'token');
    expect(out).toContain(':root {');
    expect(out).toContain('--background: var(--token-shadcn-background);');
    expect(out.split(':root').length).toBeGreaterThanOrEqual(2);
  });

  it('appends both selectors for combined light+dark output', () => {
    const input = `:root { --x: 1; }
[data-color-mode="dark"] { --x: 2; }`;
    const out = appendShadcnBridge(input, 'token');
    expect(out).toContain('[data-color-mode="dark"]');
    expect(out.match(/\[data-color-mode="dark"\]/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
