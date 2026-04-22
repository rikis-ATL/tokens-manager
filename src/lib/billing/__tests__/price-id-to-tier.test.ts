import { priceIdToTier } from '../price-id-to-tier';

describe('priceIdToTier — Phase 24 D-12', () => {
  const ORIGINAL_ENV = process.env;
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      STRIPE_PRO_PRICE_ID: 'price_pro_test',
      STRIPE_TEAM_PRICE_ID: 'price_team_test',
    };
  });
  afterAll(() => { process.env = ORIGINAL_ENV; });

  it("maps STRIPE_PRO_PRICE_ID → 'pro'", () => {
    expect(priceIdToTier('price_pro_test')).toBe('pro');
  });

  it('trims incoming priceId (e.g. dotenv spacing before # comments)', () => {
    expect(priceIdToTier('  price_pro_test  ')).toBe('pro');
  });

  it("maps STRIPE_TEAM_PRICE_ID → 'team'", () => {
    expect(priceIdToTier('price_team_test')).toBe('team');
  });

  it('unknown price ID returns null', () => {
    expect(priceIdToTier('price_unknown')).toBeNull();
  });

  it('empty string returns null (defensive, no throw)', () => {
    expect(priceIdToTier('')).toBeNull();
  });

  it('returns null when env vars are unset', () => {
    delete process.env.STRIPE_PRO_PRICE_ID;
    delete process.env.STRIPE_TEAM_PRICE_ID;
    expect(priceIdToTier('price_anything')).toBeNull();
  });

  it('reads env on each call (hot-reload safety)', () => {
    expect(priceIdToTier('price_pro_test')).toBe('pro');
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro_rotated';
    expect(priceIdToTier('price_pro_test')).toBeNull();
    expect(priceIdToTier('price_pro_rotated')).toBe('pro');
  });
});