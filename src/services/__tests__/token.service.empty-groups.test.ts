import { tokenService } from '../token.service';
import type { TokenGroup } from '@/types';

describe('tokenService.generateStyleDictionaryOutput — empty groups', () => {
  it('emits {} for a leaf group with no tokens so round-trip keeps the group', () => {
    const groups: TokenGroup[] = [
      {
        id: 'colors',
        name: 'colors',
        path: 'colors',
        level: 0,
        tokens: [],
        expanded: true,
      },
    ];
    const out = tokenService.generateStyleDictionaryOutput(groups, 'token');
    expect(out).toEqual({ token: { colors: {} } });
    const roundTrip = tokenService.processImportedTokens(out, '');
    expect(roundTrip.groups.some(g => g.name === 'colors')).toBe(true);
  });

  it('still emits tokens when present alongside an empty sibling', () => {
    const groups: TokenGroup[] = [
      {
        id: 'a',
        name: 'a',
        path: 'a',
        level: 0,
        tokens: [],
        expanded: true,
      },
      {
        id: 'b',
        name: 'b',
        path: 'b',
        level: 0,
        tokens: [
          {
            id: 't1',
            path: 'x',
            value: '#fff',
            type: 'color',
          },
        ],
        expanded: true,
      },
    ];
    const out = tokenService.generateStyleDictionaryOutput(groups, 'token');
    expect(out.token.a).toEqual({});
    expect(out.token.b.x.$value).toBe('#fff');
  });
});

describe('tokenService.resolveTokenReference', () => {
  it('resolves hyphenated token paths and shorthand {token-name}', () => {
    const groups: TokenGroup[] = [
      {
        id: 'g',
        name: 'spacing',
        path: 'spacing',
        level: 0,
        tokens: [
          {
            id: 't1',
            path: 'token-num',
            value: 8,
            type: 'number',
          },
        ],
        expanded: true,
      },
    ];
    expect(tokenService.resolveTokenReference('{spacing.token-num}', groups)).toBe('8');
    expect(tokenService.resolveTokenReference('{token-num}', groups)).toBe('8');
  });

  it('does not treat empty string path as the parent group name', () => {
    const groups: TokenGroup[] = [
      {
        id: 'g',
        name: 'spacing',
        path: '',
        level: 0,
        tokens: [
          {
            id: 't1',
            path: 'base',
            value: '4px',
            type: 'dimension',
          },
        ],
        expanded: true,
      },
    ];
    expect(tokenService.resolveTokenReference('{spacing.base}', groups)).toBe('4px');
  });
});
