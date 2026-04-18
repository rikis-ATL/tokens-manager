import { evaluateExpression } from '@/lib/mathExpression';

describe('evaluateExpression', () => {
  describe('basic arithmetic', () => {
    it('multiplies with variable a', () => {
      expect(evaluateExpression('a * 2', { a: 3 })).toBe(6);
    });

    it('chains addition and subtraction with variable a', () => {
      expect(evaluateExpression('a + 3 - 1', { a: 2 })).toBe(4);
    });

    it('respects operator precedence (mul before add)', () => {
      expect(evaluateExpression('2 + 3 * 4')).toBe(14);
    });

    it('evaluates decimal literals', () => {
      expect(evaluateExpression('.5 + 1.5')).toBe(2);
    });
  });

  describe('unary operators', () => {
    it('applies unary minus to variable a', () => {
      expect(evaluateExpression('-a', { a: 5 })).toBe(-5);
    });

    it('applies double unary minus (negation of negation)', () => {
      expect(evaluateExpression('- -2')).toBe(2);
    });

    it('applies unary plus to variable a', () => {
      expect(evaluateExpression('+a', { a: 7 })).toBe(7);
    });
  });

  describe('parentheses', () => {
    it('overrides precedence with parentheses', () => {
      expect(evaluateExpression('(a + 1) * 2', { a: 3 })).toBe(8);
    });
  });

  describe('variable a binding', () => {
    it('returns the bound value of a', () => {
      expect(evaluateExpression('a', { a: 7 })).toBe(7);
    });

    it('returns null when variable a is not bound', () => {
      expect(evaluateExpression('a')).toBeNull();
    });
  });

  describe('variable b binding', () => {
    it('evaluates a + b with both bound', () => {
      expect(evaluateExpression('a + b', { a: 3, b: 4 })).toBe(7);
    });

    it('returns null when b is not bound but referenced', () => {
      expect(evaluateExpression('a + b', { a: 1 })).toBeNull();
    });
  });

  describe('token reference substitution', () => {
    it('substitutes and evaluates resolved refs', () => {
      const resolve = (ref: string) => (ref === '{spacing.base}' ? '16px' : '');
      expect(
        evaluateExpression('a + {spacing.base}', {
          a: 4,
          resolveTokenReference: resolve,
        }),
      ).toBe(20);
    });

    it('substitutes hyphenated token paths when resolver returns the value', () => {
      const resolve = (ref: string) => (ref === '{spacing.token-num}' ? '8' : '');
      expect(
        evaluateExpression('a + {spacing.token-num}', { a: 2, resolveTokenReference: resolve }),
      ).toBe(10);
    });

    it('returns null when token reference resolves to non-numeric value', () => {
      const resolve = (_ref: string) => 'not-a-number';
      expect(
        evaluateExpression('{color.brand}', { resolveTokenReference: resolve }),
      ).toBeNull();
    });

    it('returns null when token reference resolves to empty string', () => {
      const resolve = (_ref: string) => '';
      expect(
        evaluateExpression('{spacing.base}', { resolveTokenReference: resolve }),
      ).toBeNull();
    });

    it('returns null when no resolver is provided for token reference', () => {
      expect(evaluateExpression('{x.y}')).toBeNull();
    });
  });

  describe('unit suffix stripping', () => {
    it('strips px unit suffix from literal', () => {
      expect(evaluateExpression('16px * 2')).toBe(32);
    });

    it('strips rem unit suffix from literals', () => {
      expect(evaluateExpression('1.5rem + 0.5rem')).toBe(2);
    });
  });

  describe('calc() wrapper stripping', () => {
    it('strips lowercase calc() wrapper', () => {
      expect(evaluateExpression('calc(a * 2)', { a: 3 })).toBe(6);
    });

    it('strips uppercase CALC() wrapper', () => {
      expect(evaluateExpression('CALC(2 + 2)')).toBe(4);
    });

    it('strips mixed-case Calc() wrapper', () => {
      expect(evaluateExpression('Calc(3 * 3)')).toBe(9);
    });
  });

  describe('error handling (returns null)', () => {
    it('returns null for division by zero', () => {
      expect(evaluateExpression('4 / 0')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(evaluateExpression('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(evaluateExpression('   ')).toBeNull();
    });

    it('returns null for garbage input with unsupported operator', () => {
      expect(evaluateExpression('a ** b')).toBeNull();
    });

    it('returns null for completely invalid input', () => {
      expect(evaluateExpression('!@#$')).toBeNull();
    });
  });
});
