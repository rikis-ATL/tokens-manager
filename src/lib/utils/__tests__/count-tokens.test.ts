import { countTokensInCollection } from '../count-tokens';

describe('countTokensInCollection (TokenService + group tree)', () => {
  it('returns 0 for null / non-object', () => {
    expect(countTokensInCollection(null)).toBe(0);
    expect(countTokensInCollection(undefined)).toBe(0);
  });

  it('counts DTCG tokens under namespace (structure B)', () => {
    const tokens = { token: { color: { primary: { $value: '#fff', $type: 'color' } } } };
    expect(countTokensInCollection(tokens, 'token')).toBe(1);
  });

  it('counts legacy value key (matches TokenService / UI)', () => {
    const tokens = { token: { legacy: { value: '#000', type: 'color' } } };
    expect(countTokensInCollection(tokens, 'token')).toBe(1);
  });

  it('uses collection namespace for structure detection', () => {
    const tokens = { myns: { a: { $value: 8, $type: 'number' } } };
    expect(countTokensInCollection(tokens, 'myns')).toBe(1);
  });

  it('matches billing stress shape: 500 leaves under one namespace', () => {
    const inner: Record<string, { $value: string }> = {};
    for (let i = 0; i < 500; i++) inner[`t${i}`] = { $value: '#fff' };
    const tokens = { token: inner };
    expect(countTokensInCollection(tokens, 'token')).toBe(500);
  });
});
