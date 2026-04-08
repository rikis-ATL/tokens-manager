/**
 * bulkTokenActions.test.ts
 * TDD tests for the six pure bulk-mutation helper functions.
 */

import {
  bulkDeleteTokens,
  bulkMoveTokens,
  bulkChangeType,
  bulkAddPrefix,
  bulkRemovePrefix,
  bulkReplacePrefix,
  detectCommonPrefix,
} from './bulkTokenActions';
import { TokenGroup, GeneratedToken } from '@/types/token.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToken(id: string, path: string, value: string = '#fff', type: GeneratedToken['type'] = 'color'): GeneratedToken {
  return { id, path, value, type };
}

function makeGroup(id: string, tokens: GeneratedToken[], children: TokenGroup[] = []): TokenGroup {
  return { id, name: id, tokens, children, level: 0 };
}

// ---------------------------------------------------------------------------
// detectCommonPrefix
// ---------------------------------------------------------------------------

describe('detectCommonPrefix', () => {
  it('returns empty string for empty array', () => {
    expect(detectCommonPrefix([])).toBe('');
  });

  it('returns empty string for single element array', () => {
    expect(detectCommonPrefix(['color-red'])).toBe('');
  });

  it('returns prefix trimmed at dash boundary', () => {
    expect(detectCommonPrefix(['color-red', 'color-blue', 'color-green'])).toBe('color-');
  });

  it('returns empty string when no common prefix', () => {
    expect(detectCommonPrefix(['red', 'blue'])).toBe('');
  });

  it('returns empty string when no common prefix at boundary', () => {
    expect(detectCommonPrefix(['abc', 'xyz'])).toBe('');
  });

  it('handles dot boundary', () => {
    expect(detectCommonPrefix(['bg.primary', 'bg.secondary'])).toBe('bg.');
  });

  it('returns prefix for two elements', () => {
    expect(detectCommonPrefix(['color-red', 'color-blue'])).toBe('color-');
  });

  it('trims to last separator when prefix does not end at boundary', () => {
    // 'font-size-lg' and 'font-size-sm' share 'font-size-' — cut at last '-'
    expect(detectCommonPrefix(['font-size-lg', 'font-size-sm'])).toBe('font-size-');
  });
});

// ---------------------------------------------------------------------------
// bulkDeleteTokens
// ---------------------------------------------------------------------------

describe('bulkDeleteTokens', () => {
  const groups: TokenGroup[] = [
    makeGroup('g1', [
      makeToken('g1/t1', 'red'),
      makeToken('g1/t2', 'blue'),
      makeToken('g1/t3', 'green'),
    ]),
    makeGroup('g2', [
      makeToken('g2/t4', 'alpha'),
    ]),
  ];

  it('removes exactly the specified token IDs from the target group', () => {
    const result = bulkDeleteTokens(groups, 'g1', new Set(['g1/t1', 'g1/t2']));
    const g1 = result.find(g => g.id === 'g1')!;
    expect(g1.tokens).toHaveLength(1);
    expect(g1.tokens[0].id).toBe('g1/t3');
  });

  it('leaves other groups untouched', () => {
    const result = bulkDeleteTokens(groups, 'g1', new Set(['g1/t1']));
    const g2 = result.find(g => g.id === 'g2')!;
    expect(g2.tokens).toHaveLength(1);
    expect(g2.tokens[0].id).toBe('g2/t4');
  });

  it('returns groups unchanged when tokenIds is empty', () => {
    const result = bulkDeleteTokens(groups, 'g1', new Set());
    expect(result).toEqual(groups);
  });

  it('returns groups unchanged when groupId not found', () => {
    const result = bulkDeleteTokens(groups, 'nonexistent', new Set(['g1/t1']));
    expect(result).toEqual(groups);
  });

  it('works with nested groups', () => {
    const nested: TokenGroup[] = [
      makeGroup('parent', [], [
        makeGroup('parent/child', [
          makeToken('parent/child/t1', 'nested-val'),
          makeToken('parent/child/t2', 'nested-val-2'),
        ]),
      ]),
    ];
    const result = bulkDeleteTokens(nested, 'parent/child', new Set(['parent/child/t1']));
    const child = result[0].children![0];
    expect(child.tokens).toHaveLength(1);
    expect(child.tokens[0].id).toBe('parent/child/t2');
  });
});

// ---------------------------------------------------------------------------
// bulkMoveTokens
// ---------------------------------------------------------------------------

describe('bulkMoveTokens', () => {
  const baseGroups: TokenGroup[] = [
    makeGroup('src', [
      makeToken('src/t1', 'path-one'),
      makeToken('src/t2', 'path-two'),
      makeToken('src/t3', 'path-three'),
    ]),
    makeGroup('dest', [
      makeToken('dest/t4', 'path-four'),
    ]),
  ];

  it('removes tokens from source group', () => {
    const result = bulkMoveTokens(baseGroups, 'src', 'dest', new Set(['src/t1', 'src/t2']));
    const src = result.find(g => g.id === 'src')!;
    expect(src.tokens).toHaveLength(1);
    expect(src.tokens[0].id).toBe('src/t3');
  });

  it('appends tokens to destination group', () => {
    const result = bulkMoveTokens(baseGroups, 'src', 'dest', new Set(['src/t1']));
    const dest = result.find(g => g.id === 'dest')!;
    expect(dest.tokens.some(t => t.id === 'src/t1')).toBe(true);
  });

  it('resolves path collisions in destination', () => {
    const collidingGroups: TokenGroup[] = [
      makeGroup('src', [makeToken('src/a', 'collision')]),
      makeGroup('dest', [makeToken('dest/x', 'collision', '#fff', 'color')]),
    ];
    // The moved token has path 'collision', and dest already has that path
    const srcGroups: TokenGroup[] = [
      makeGroup('src', [makeToken('src/a', 'collision')]),
      makeGroup('dest', [makeToken('dest/x', 'collision')]),
    ];
    const result = bulkMoveTokens(srcGroups, 'src', 'dest', new Set(['src/a']));
    const dest = result.find(g => g.id === 'dest')!;
    const movedToken = dest.tokens.find(t => t.id === 'src/a');
    expect(movedToken).toBeDefined();
    // path collision: dest already had 'collision', so moved token path becomes 'collision-2'
    expect(movedToken!.path).toBe('collision-2');
  });

  it('is a no-op when source equals destination', () => {
    const result = bulkMoveTokens(baseGroups, 'src', 'src', new Set(['src/t1']));
    expect(result).toEqual(baseGroups);
  });

  it('returns groups unchanged when source group not found', () => {
    const result = bulkMoveTokens(baseGroups, 'nonexistent', 'dest', new Set(['x']));
    expect(result).toEqual(baseGroups);
  });

  it('returns groups unchanged when dest group not found', () => {
    const result = bulkMoveTokens(baseGroups, 'src', 'nonexistent', new Set(['src/t1']));
    expect(result).toEqual(baseGroups);
  });
});

// ---------------------------------------------------------------------------
// bulkChangeType
// ---------------------------------------------------------------------------

describe('bulkChangeType', () => {
  const groups: TokenGroup[] = [
    makeGroup('g1', [
      makeToken('g1/t1', 'p1', '#fff', 'color'),
      makeToken('g1/t2', 'p2', '16px', 'dimension'),
      makeToken('g1/t3', 'p3', '#000', 'color'),
    ]),
  ];

  it('sets type on selected tokens only', () => {
    const result = bulkChangeType(groups, 'g1', new Set(['g1/t1', 'g1/t2']), 'opacity');
    const g1 = result.find(g => g.id === 'g1')!;
    expect(g1.tokens.find(t => t.id === 'g1/t1')!.type).toBe('opacity');
    expect(g1.tokens.find(t => t.id === 'g1/t2')!.type).toBe('opacity');
  });

  it('leaves non-selected tokens unchanged', () => {
    const result = bulkChangeType(groups, 'g1', new Set(['g1/t1']), 'dimension');
    const g1 = result.find(g => g.id === 'g1')!;
    expect(g1.tokens.find(t => t.id === 'g1/t3')!.type).toBe('color');
  });

  it('does not alter other fields on changed tokens', () => {
    const result = bulkChangeType(groups, 'g1', new Set(['g1/t1']), 'dimension');
    const g1 = result.find(g => g.id === 'g1')!;
    const changed = g1.tokens.find(t => t.id === 'g1/t1')!;
    expect(changed.path).toBe('p1');
    expect(changed.value).toBe('#fff');
    expect(changed.id).toBe('g1/t1');
  });

  it('returns groups unchanged when groupId not found', () => {
    const result = bulkChangeType(groups, 'unknown', new Set(['g1/t1']), 'color');
    expect(result).toEqual(groups);
  });
});

// ---------------------------------------------------------------------------
// bulkAddPrefix
// ---------------------------------------------------------------------------

describe('bulkAddPrefix', () => {
  const groups: TokenGroup[] = [
    makeGroup('myGroup', [
      makeToken('myGroup/t1', 'old-name', '#fff', 'color'),
      makeToken('myGroup/t2', 'other-name', '#000', 'color'),
      makeToken('myGroup/t3', 'ref-token', '{myGroup.old-name}', 'color'),
    ]),
  ];

  it('renames selected token paths with prefix', () => {
    const result = bulkAddPrefix(groups, 'myGroup', new Set(['myGroup/t1', 'myGroup/t2']), 'pfx-');
    const g = result.find(g => g.id === 'myGroup')!;
    expect(g.tokens.find(t => t.id === 'myGroup/t1')!.path).toBe('pfx-old-name');
    expect(g.tokens.find(t => t.id === 'myGroup/t2')!.path).toBe('pfx-other-name');
  });

  it('leaves unselected token paths unchanged', () => {
    const result = bulkAddPrefix(groups, 'myGroup', new Set(['myGroup/t1']), 'pfx-');
    const g = result.find(g => g.id === 'myGroup')!;
    expect(g.tokens.find(t => t.id === 'myGroup/t2')!.path).toBe('other-name');
  });

  it('rewrites within-group alias values referencing renamed paths', () => {
    const result = bulkAddPrefix(groups, 'myGroup', new Set(['myGroup/t1']), 'pfx-');
    const g = result.find(g => g.id === 'myGroup')!;
    const refToken = g.tokens.find(t => t.id === 'myGroup/t3')!;
    expect(refToken.value).toBe('{myGroup.pfx-old-name}');
  });

  it('returns groups unchanged when prefix is empty string', () => {
    const result = bulkAddPrefix(groups, 'myGroup', new Set(['myGroup/t1']), '');
    expect(result).toEqual(groups);
  });

  it('resolves collisions with auto-suffix', () => {
    const collidingGroups: TokenGroup[] = [
      makeGroup('g', [
        makeToken('g/t1', 'alpha'),
        makeToken('g/t2', 'pfx-alpha'), // already exists
      ]),
    ];
    const result = bulkAddPrefix(collidingGroups, 'g', new Set(['g/t1']), 'pfx-');
    const g = result.find(gr => gr.id === 'g')!;
    expect(g.tokens.find(t => t.id === 'g/t1')!.path).toBe('pfx-alpha-2');
  });

  it('returns groups unchanged when groupId not found', () => {
    const result = bulkAddPrefix(groups, 'unknown', new Set(['myGroup/t1']), 'pfx-');
    expect(result).toEqual(groups);
  });
});

// ---------------------------------------------------------------------------
// bulkRemovePrefix
// ---------------------------------------------------------------------------

describe('bulkRemovePrefix', () => {
  const groups: TokenGroup[] = [
    makeGroup('myGroup', [
      makeToken('myGroup/t1', 'pfx-red', '#f00', 'color'),
      makeToken('myGroup/t2', 'pfx-blue', '#00f', 'color'),
      makeToken('myGroup/t3', 'no-prefix', '#0f0', 'color'),
      makeToken('myGroup/t4', 'ref-token', '{myGroup.pfx-red}', 'color'),
    ]),
  ];

  it('strips prefix from selected tokens that match', () => {
    const result = bulkRemovePrefix(groups, 'myGroup', new Set(['myGroup/t1', 'myGroup/t2']), 'pfx-');
    const g = result.find(gr => gr.id === 'myGroup')!;
    expect(g.tokens.find(t => t.id === 'myGroup/t1')!.path).toBe('red');
    expect(g.tokens.find(t => t.id === 'myGroup/t2')!.path).toBe('blue');
  });

  it('skips selected tokens whose path does not start with prefix', () => {
    const result = bulkRemovePrefix(groups, 'myGroup', new Set(['myGroup/t3']), 'pfx-');
    const g = result.find(gr => gr.id === 'myGroup')!;
    expect(g.tokens.find(t => t.id === 'myGroup/t3')!.path).toBe('no-prefix');
  });

  it('rewrites within-group alias values referencing renamed paths', () => {
    const result = bulkRemovePrefix(groups, 'myGroup', new Set(['myGroup/t1']), 'pfx-');
    const g = result.find(gr => gr.id === 'myGroup')!;
    const refToken = g.tokens.find(t => t.id === 'myGroup/t4')!;
    expect(refToken.value).toBe('{myGroup.red}');
  });

  it('returns groups unchanged when prefix is empty string', () => {
    const result = bulkRemovePrefix(groups, 'myGroup', new Set(['myGroup/t1']), '');
    expect(result).toEqual(groups);
  });

  it('resolves collisions with auto-suffix', () => {
    const collidingGroups: TokenGroup[] = [
      makeGroup('g', [
        makeToken('g/t1', 'pfx-alpha'),
        makeToken('g/t2', 'alpha'), // already exists without prefix
      ]),
    ];
    const result = bulkRemovePrefix(collidingGroups, 'g', new Set(['g/t1']), 'pfx-');
    const g = result.find(gr => gr.id === 'g')!;
    expect(g.tokens.find(t => t.id === 'g/t1')!.path).toBe('alpha-2');
  });

  it('returns groups unchanged when groupId not found', () => {
    const result = bulkRemovePrefix(groups, 'unknown', new Set(['myGroup/t1']), 'pfx-');
    expect(result).toEqual(groups);
  });
});

// ---------------------------------------------------------------------------
// bulkReplacePrefix
// ---------------------------------------------------------------------------

describe('bulkReplacePrefix', () => {
  const groups: TokenGroup[] = [
    makeGroup('colors', [
      makeToken('colors/t1', 'sm-padding', '#fff', 'color'),
      makeToken('colors/t2', 'sm-margin', '#000', 'color'),
      makeToken('colors/t3', 'lg-gap', '#aaa', 'color'),
      makeToken('colors/t4', 'ref-token', '{colors.sm-padding}', 'color'),
    ]),
  ];

  it('renames tokens matching oldPrefix and leaves non-matching tokens unchanged', () => {
    const result = bulkReplacePrefix(groups, 'colors', 'sm-', 'small-');
    const g = result.find(gr => gr.id === 'colors')!;
    expect(g.tokens.find(t => t.id === 'colors/t1')!.path).toBe('small-padding');
    expect(g.tokens.find(t => t.id === 'colors/t2')!.path).toBe('small-margin');
    // lg-gap should be unchanged
    expect(g.tokens.find(t => t.id === 'colors/t3')!.path).toBe('lg-gap');
  });

  it('returns groups unchanged when oldPrefix is empty string', () => {
    const result = bulkReplacePrefix(groups, 'colors', '', 'small-');
    expect(result).toEqual(groups);
  });

  it('returns groups unchanged when no tokens match the prefix', () => {
    const result = bulkReplacePrefix(groups, 'colors', 'xl-', 'extra-large-');
    expect(result).toEqual(groups);
  });

  it('resolves collision when newPrefix+remainder matches existing token path', () => {
    const collidingGroups: TokenGroup[] = [
      makeGroup('spacing', [
        makeToken('spacing/t1', 'sm-base', '4px', 'dimension'),
        makeToken('spacing/t2', 'small-base', '8px', 'dimension'), // would collide
      ]),
    ];
    const result = bulkReplacePrefix(collidingGroups, 'spacing', 'sm-', 'small-');
    const g = result.find(gr => gr.id === 'spacing')!;
    // 'small-base' is taken, so renamed token should get auto-suffix
    expect(g.tokens.find(t => t.id === 'spacing/t1')!.path).toBe('small-base-2');
  });

  it('rewrites alias values referencing renamed paths', () => {
    const result = bulkReplacePrefix(groups, 'colors', 'sm-', 'small-');
    const g = result.find(gr => gr.id === 'colors')!;
    const refToken = g.tokens.find(t => t.id === 'colors/t4')!;
    expect(refToken.value).toBe('{colors.small-padding}');
  });

  it('returns groups unchanged when groupId not found', () => {
    const result = bulkReplacePrefix(groups, 'nonexistent', 'sm-', 'small-');
    expect(result).toEqual(groups);
  });
});
