import {
  COLOR_SCOPE_TYPES,
  DENSITY_SCOPE_TYPES,
  isColorScopeType,
  isDensityScopeType,
  dominantScopeForTokenTypes,
} from '@/utils/tokenScope';

describe('tokenScope — COLOR_SCOPE_TYPES', () => {
  it('includes color', () => {
    expect(COLOR_SCOPE_TYPES).toContain('color');
  });

  it('includes gradient', () => {
    expect(COLOR_SCOPE_TYPES).toContain('gradient');
  });
});

describe('tokenScope — DENSITY_SCOPE_TYPES', () => {
  it('includes dimension', () => {
    expect(DENSITY_SCOPE_TYPES).toContain('dimension');
  });

  it('includes fontSize', () => {
    expect(DENSITY_SCOPE_TYPES).toContain('fontSize');
  });

  it('includes fontWeight', () => {
    expect(DENSITY_SCOPE_TYPES).toContain('fontWeight');
  });

  it('includes borderRadius', () => {
    expect(DENSITY_SCOPE_TYPES).toContain('borderRadius');
  });

  it('includes borderWidth', () => {
    expect(DENSITY_SCOPE_TYPES).toContain('borderWidth');
  });
});

describe('isColorScopeType', () => {
  it('returns true for color', () => {
    expect(isColorScopeType('color')).toBe(true);
  });

  it('returns true for gradient', () => {
    expect(isColorScopeType('gradient')).toBe(true);
  });

  it('returns false for dimension', () => {
    expect(isColorScopeType('dimension')).toBe(false);
  });
});

describe('isDensityScopeType', () => {
  it('returns true for dimension', () => {
    expect(isDensityScopeType('dimension')).toBe(true);
  });

  it('returns true for fontSize', () => {
    expect(isDensityScopeType('fontSize')).toBe(true);
  });

  it('returns true for fontWeight', () => {
    expect(isDensityScopeType('fontWeight')).toBe(true);
  });

  it('returns true for borderRadius', () => {
    expect(isDensityScopeType('borderRadius')).toBe(true);
  });

  it('returns true for borderWidth', () => {
    expect(isDensityScopeType('borderWidth')).toBe(true);
  });

  it('returns false for color', () => {
    expect(isDensityScopeType('color')).toBe(false);
  });
});

describe('dominantScopeForTokenTypes', () => {
  it('returns color when color types are majority', () => {
    expect(dominantScopeForTokenTypes(['color', 'color', 'dimension'])).toBe('color');
  });

  it('returns density when density types are majority', () => {
    expect(dominantScopeForTokenTypes(['dimension', 'fontSize'])).toBe('density');
  });

  it('returns null when no scoped types', () => {
    expect(dominantScopeForTokenTypes(['string', 'number'])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(dominantScopeForTokenTypes([])).toBeNull();
  });

  it('returns color on tie (color wins tie)', () => {
    expect(dominantScopeForTokenTypes(['color', 'dimension'])).toBe('color');
  });
});
