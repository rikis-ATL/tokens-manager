import { appendShadcnBridge } from '../shadcn-bridge';
import {
  buildGoogleFontsStylesheetUrl,
  collectGoogleFontSpecsFromShadcnCss,
  parseGoogleFontFamilyValue,
} from '../google-fonts';

describe('buildGoogleFontsStylesheetUrl', () => {
  it('returns null for empty', () => {
    expect(buildGoogleFontsStylesheetUrl([])).toBeNull();
  });

  it('encodes a single spec with + for spaces and ampersand for multiple', () => {
    const u = buildGoogleFontsStylesheetUrl(['Inter:wght@400;500;600', 'JetBrains Mono:ital,wght@0,400']);
    expect(u).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?/);
    expect(u).toContain('display=swap');
    expect(u).toContain('family=Inter');
    expect(u).toContain('JetBrains+Mono');
  });
});

describe('collectGoogleFontSpecsFromShadcnCss', () => {
  it('accepts spec values with semicolons in wght', () => {
    const css = ':root { --token-shadcn-font-google-sans: Inter:wght@400;500;600; }';
    const specs = collectGoogleFontSpecsFromShadcnCss(css, 'token');
    expect(specs).toEqual(['Inter:wght@400;500;600']);
  });
});

describe('appendShadcnBridge + Google', () => {
  it('prepends a Google @import when font-google token lines exist', () => {
    const raw = `:root {
  --token-shadcn-font-google-sans: Inter:wght@400;500;
  --token-shadcn-font-google-mono: JetBrains+Mono:ital,wght@0,400;0,500;
  --token-shadcn-background: 0 0% 100%;
}
`;
    const out = appendShadcnBridge(raw, 'token');
    expect(out.startsWith('@import url("https://fonts.googleapis.com/css2?')).toBe(true);
    expect(out).toContain('family=Inter');
    expect(out).toContain('JetBrains%2BMono');
  });
});

describe('parseGoogleFontFamilyValue', () => {
  it('strips matching quotes', () => {
    expect(parseGoogleFontFamilyValue('"Inter:wght@400"')).toBe('Inter:wght@400');
  });
});
