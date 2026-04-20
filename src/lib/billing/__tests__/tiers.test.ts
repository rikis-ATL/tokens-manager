import { LIMITS, type PlanTier } from '../tiers';

describe('LIMITS config — BILLING-01 single source of truth', () => {
  it('has exactly free, pro, team keys', () => {
    expect(Object.keys(LIMITS).sort()).toEqual(['free', 'pro', 'team']);
  });

  it('free tier caps match D-01 defaults (CONTEXT.md specifics)', () => {
    expect(LIMITS.free.maxCollections).toBe(1);
    expect(LIMITS.free.maxThemesPerCollection).toBe(2);
    expect(LIMITS.free.maxTokensTotal).toBe(500);
    expect(LIMITS.free.maxExportsPerMonth).toBe(10);
    expect(LIMITS.free.rateLimitPerMinute).toBe(60);
  });

  it('pro tier caps are higher than free', () => {
    expect(LIMITS.pro.maxCollections).toBe(20);
    expect(LIMITS.pro.maxThemesPerCollection).toBe(10);
    expect(LIMITS.pro.maxTokensTotal).toBe(5000);
    expect(LIMITS.pro.maxExportsPerMonth).toBe(200);
    expect(LIMITS.pro.rateLimitPerMinute).toBe(120);
  });

  it('team tier uses Infinity for all resource caps; rateLimit is finite (300)', () => {
    const tiers: Array<keyof typeof LIMITS.team> = [
      'maxCollections', 'maxThemesPerCollection', 'maxTokensTotal', 'maxExportsPerMonth',
    ];
    for (const k of tiers) expect(LIMITS.team[k]).toBe(Infinity);
    expect(LIMITS.team.rateLimitPerMinute).toBe(300);
  });

  it('has every TierLimits field on every tier (no partial tiers)', () => {
    const requiredFields: Array<keyof typeof LIMITS.free> = [
      'maxCollections', 'maxThemesPerCollection', 'maxTokensTotal',
      'maxExportsPerMonth', 'rateLimitPerMinute',
    ];
    const tiers: PlanTier[] = ['free', 'pro', 'team'];
    for (const t of tiers) for (const f of requiredFields) {
      expect(typeof LIMITS[t][f]).toBe('number');
    }
  });
});
