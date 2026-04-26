import { resolveActiveThemeIdForGroup } from '@/utils/resolveActiveThemeForGroup';
import type { TokenGroup, GeneratedToken } from '@/types/token.types';

function makeToken(id: string, type: 'color' | 'dimension' | 'string'): GeneratedToken {
  return { id, path: id, value: '', type, level: 0 } as GeneratedToken;
}

function makeGroup(id: string, tokens: GeneratedToken[]): TokenGroup {
  return { id, name: id, tokens, level: 0 };
}

const colorGroup = makeGroup('colors', [makeToken('primary', 'color'), makeToken('secondary', 'color')]);
const densityGroup = makeGroup('spacing', [makeToken('sm', 'dimension'), makeToken('md', 'dimension')]);
const mixedGroup = makeGroup('mixed', [
  makeToken('t1', 'color'),
  makeToken('t2', 'color'),
  makeToken('t3', 'dimension'),
]);
const unscopedGroup = makeGroup('misc', [makeToken('a', 'string'), makeToken('b', 'string')]);

describe('resolveActiveThemeIdForGroup', () => {
  it('returns color theme id for a color-dominant group', () => {
    expect(resolveActiveThemeIdForGroup(colorGroup, 'cThemeId', 'dThemeId')).toBe('cThemeId');
  });

  it('returns density theme id for a density-dominant group', () => {
    expect(resolveActiveThemeIdForGroup(densityGroup, 'cThemeId', 'dThemeId')).toBe('dThemeId');
  });

  it('returns null for a null group', () => {
    expect(resolveActiveThemeIdForGroup(null, 'cThemeId', 'dThemeId')).toBeNull();
  });

  it('returns color theme id for a mixed group (color wins tie/majority)', () => {
    expect(resolveActiveThemeIdForGroup(mixedGroup, 'cThemeId', null)).toBe('cThemeId');
  });

  it('returns null when no color theme active for a color-dominant group', () => {
    expect(resolveActiveThemeIdForGroup(colorGroup, null, 'dThemeId')).toBeNull();
  });

  it('returns null for an unscoped group', () => {
    expect(resolveActiveThemeIdForGroup(unscopedGroup, 'cThemeId', 'dThemeId')).toBeNull();
  });
});
