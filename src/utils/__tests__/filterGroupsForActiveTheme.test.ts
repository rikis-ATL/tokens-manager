import { filterGroupsForActiveTheme } from '../filterGroupsForActiveTheme';
import type { TokenGroup } from '@/types/token.types';
import type { ITheme } from '@/types/theme.types';

function group(
  id: string,
  name: string,
  tokens: TokenGroup['tokens'] = [],
  children?: TokenGroup[],
): TokenGroup {
  return {
    id,
    name,
    level: 0,
    tokens,
    children,
  };
}

describe('filterGroupsForActiveTheme', () => {
  it('returns masterGroups when activeTheme is null', () => {
    const tree = [group('a', 'A')];
    expect(filterGroupsForActiveTheme(tree, null)).toBe(tree);
  });

  it('returns masterGroups when activeTheme is undefined', () => {
    const tree = [group('a', 'A')];
    expect(filterGroupsForActiveTheme(tree, undefined)).toBe(tree);
  });

  it('excludes groups with state disabled', () => {
    const tree = [
      group('keep', 'Keep', [], [group('child', 'Child')]),
      group('drop', 'Drop'),
    ];
    const theme: ITheme = {
      id: 't1',
      name: 'T',
      colorMode: 'light',
      groups: { keep: 'enabled', drop: 'disabled', child: 'enabled' },
      tokens: [],
    };
    const out = filterGroupsForActiveTheme(tree, theme);
    expect(out.map((g) => g.id)).toEqual(['keep']);
    expect(out[0].children?.map((c) => c.id)).toEqual(['child']);
  });

  it('defaults missing group ids to disabled', () => {
    const tree = [group('only', 'Only')];
    const theme: ITheme = {
      id: 't1',
      name: 'T',
      colorMode: 'light',
      groups: {},
      tokens: [],
    };
    expect(filterGroupsForActiveTheme(tree, theme)).toEqual([]);
  });

  it('recursively removes disabled child branches', () => {
    const tree = [
      group('root', 'Root', [], [
        group('gone', 'Gone', [], [group('deep', 'Deep')]),
        group('stay', 'Stay'),
      ]),
    ];
    const theme: ITheme = {
      id: 't1',
      name: 'T',
      colorMode: 'light',
      groups: { root: 'enabled', gone: 'disabled', stay: 'enabled', deep: 'enabled' },
      tokens: [],
    };
    const out = filterGroupsForActiveTheme(tree, theme);
    expect(out[0].children?.map((c) => c.id)).toEqual(['stay']);
  });
});
