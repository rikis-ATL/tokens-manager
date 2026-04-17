import { substituteTokenReferencesInString } from '@/lib/substituteTokenReferencesInString';

describe('substituteTokenReferencesInString', () => {
  it('returns input unchanged when resolve is omitted', () => {
    expect(substituteTokenReferencesInString('calc(var(--a) + {b})')).toBe('calc(var(--a) + {b})');
  });

  it('substitutes token refs with resolved strings', () => {
    const resolve = (ref: string) => (ref === '{spacing.sm}' ? '8px' : ref);
    expect(substituteTokenReferencesInString('calc(var(--x) + {spacing.sm})', resolve)).toBe(
      'calc(var(--x) + 8px)',
    );
  });

  it('uses dash-to-dot fallback when brace ref with dashes is not found', () => {
    const resolve = (ref: string) => {
      if (ref === '{spacing.sm}') return '8px';
      return ref;
    };
    expect(substituteTokenReferencesInString('a {spacing-sm} b', resolve)).toBe('a 8px b');
  });

  it('replaces multiple refs in order', () => {
    const resolve = (ref: string) => (ref === '{a}' ? '1' : ref === '{b}' ? '2' : ref);
    expect(substituteTokenReferencesInString('{a}+{b}', resolve)).toBe('1+2');
  });
});
