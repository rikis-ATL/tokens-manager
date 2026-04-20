import { countTokensRecursive, countTokensInCollection } from '../count-tokens';

describe('countTokensRecursive', () => {
  it('returns 0 for null/undefined/non-object', () => {
    expect(countTokensRecursive(null)).toBe(0);
    expect(countTokensRecursive(undefined)).toBe(0);
    expect(countTokensRecursive('x')).toBe(0);
    expect(countTokensRecursive(5)).toBe(0);
  });
  it('returns 0 for empty object', () => {
    expect(countTokensRecursive({})).toBe(0);
  });
  it('returns 1 for a single token with $value', () => {
    expect(countTokensRecursive({ $value: '#fff', $type: 'color' })).toBe(1);
  });
  it('counts nested tokens recursively', () => {
    const obj = {
      g1: { t1: { $value: 'a', $type: 'color' }, t2: { $value: 'b', $type: 'color' } },
      g2: { nested: { t3: { $value: 'c', $type: 'color' } } },
    };
    expect(countTokensRecursive(obj)).toBe(3);
  });
  it('stops recursion at $value level (does not descend into primitives)', () => {
    expect(countTokensRecursive({ $value: { complex: 'object' }, $type: 'x' })).toBe(1);
  });
});

describe('countTokensInCollection', () => {
  it('skips namespace level and counts nested tokens', () => {
    const tokens = {
      token: { color: { primary: { $value: '#fff', $type: 'color' } } },
    };
    expect(countTokensInCollection(tokens)).toBe(1);
  });
  it('returns 0 for empty tokens', () => {
    expect(countTokensInCollection({})).toBe(0);
    expect(countTokensInCollection(null)).toBe(0);
  });
});
