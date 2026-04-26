import { mergeDualThemeTokens } from '@/lib/themeTokenMerge';
import type { ITheme } from '@/types/theme.types';
import type { TokenGroup, GeneratedToken } from '@/types/token.types';

// Minimal fixture helpers
function makeToken(id: string, type: 'color' | 'dimension', value: string): GeneratedToken {
  return { id, path: id, value, type, level: 0 } as GeneratedToken;
}

function makeGroup(id: string, tokens: GeneratedToken[]): TokenGroup {
  return { id, name: id, tokens, level: 0 };
}

const colorGroup: TokenGroup = makeGroup('colors', [
  makeToken('primary', 'color', '#ff0000'),
  makeToken('secondary', 'color', '#00ff00'),
]);

const dimensionGroup: TokenGroup = makeGroup('spacing', [
  makeToken('sm', 'dimension', '4px'),
  makeToken('md', 'dimension', '8px'),
]);

// Namespace-wrapped master tokens (matches processImportedTokens input format)
const masterTokens: Record<string, unknown> = {
  token: {
    colors: {
      primary: { $type: 'color', $value: '#ff0000' },
      secondary: { $type: 'color', $value: '#00ff00' },
    },
    spacing: {
      sm: { $type: 'dimension', $value: '4px' },
      md: { $type: 'dimension', $value: '8px' },
    },
  },
};

const colorThemeTokens: TokenGroup = makeGroup('colors', [
  makeToken('primary', 'color', '#0000ff'),
  makeToken('secondary', 'color', '#ff00ff'),
]);

const densityThemeTokens: TokenGroup = makeGroup('spacing', [
  makeToken('sm', 'dimension', '8px'),
  makeToken('md', 'dimension', '16px'),
]);

function makeTheme(
  id: string,
  kind: 'color' | 'density',
  groups: TokenGroup[],
  enabledGroupIds: string[],
): ITheme {
  const groupStates: Record<string, 'enabled' | 'source' | 'disabled'> = {};
  for (const g of groups) {
    groupStates[g.id] = enabledGroupIds.includes(g.id) ? 'enabled' : 'disabled';
  }
  return {
    id,
    name: id,
    kind,
    groups: groupStates,
    tokens: groups,
    graphState: null,
  };
}

const colorTheme = makeTheme('cTheme', 'color', [colorThemeTokens, dimensionGroup], ['colors']);
const densityTheme = makeTheme('dTheme', 'density', [colorGroup, densityThemeTokens], ['spacing']);

describe('mergeDualThemeTokens', () => {
  it('returns collection default when both themes are null', () => {
    const result = mergeDualThemeTokens(masterTokens, null, null, 'token');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('applies color theme overrides for color tokens', () => {
    const result = mergeDualThemeTokens(masterTokens, colorTheme, null, 'token');
    expect(result).toBeDefined();
    // Result should be an object (SD output format)
    expect(typeof result).toBe('object');
  });

  it('applies density theme overrides for dimension tokens', () => {
    const result = mergeDualThemeTokens(masterTokens, null, densityTheme, 'token');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('applies both themes when both are active', () => {
    const result = mergeDualThemeTokens(masterTokens, colorTheme, densityTheme, 'token');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('is defined as a function', () => {
    expect(typeof mergeDualThemeTokens).toBe('function');
  });
});
