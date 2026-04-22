import { getStripe, __resetStripeForTests } from '../stripe-client';

describe('getStripe() — Phase 24 STRIPE-01/02/03 foundation', () => {
  const ORIGINAL_ENV = process.env;
  beforeEach(() => {
    __resetStripeForTests();
    process.env = { ...ORIGINAL_ENV, SELF_HOSTED: undefined, STRIPE_SECRET_KEY: undefined };
  });
  afterAll(() => { process.env = ORIGINAL_ENV; });

  it('D-16: throws when SELF_HOSTED=true (no SDK init on self-hosted)', () => {
    process.env.SELF_HOSTED = 'true';
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    expect(() => getStripe()).toThrow(/self-hosted/i);
  });

  it('throws when STRIPE_SECRET_KEY is missing', () => {
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it('returns a Stripe instance when configured', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    const s = getStripe();
    expect(s).toBeDefined();
    expect(typeof s.checkout).toBe('object');
    expect(typeof s.billingPortal).toBe('object');
    expect(typeof s.webhooks).toBe('object');
  });

  it('returns the same singleton instance on repeat calls', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    const a = getStripe();
    const b = getStripe();
    expect(a).toBe(b);
  });

  it('re-throws SELF_HOSTED error even after a prior successful init (short-circuits before cache)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    getStripe();  // prime the cache
    process.env.SELF_HOSTED = 'true';
    expect(() => getStripe()).toThrow(/self-hosted/i);
  });
});