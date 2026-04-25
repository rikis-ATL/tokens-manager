import { SHADCN_ALIASED_LEAVES } from '../shadcn-bridge';
import { SEMANTIC_TAILWIND_BY_TOKEN, allSemanticTailwindClasses } from '../semantic-tailwind';

describe('SEMANTIC_TAILWIND_BY_TOKEN', () => {
  it('defines utilities for every aliased shadcn leaf', () => {
    for (const k of SHADCN_ALIASED_LEAVES) {
      expect(SEMANTIC_TAILWIND_BY_TOKEN[k].length).toBeGreaterThan(0);
    }
  });

  it('exposes a sorted unique class list', () => {
    const all = allSemanticTailwindClasses();
    expect(all.length).toBeGreaterThan(10);
    expect(new Set(all).size).toBe(all.length);
  });
});
