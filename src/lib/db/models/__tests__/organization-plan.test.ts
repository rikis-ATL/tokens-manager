import mongoose from 'mongoose';
import Organization, { PlanTier } from '../Organization';

describe('Organization model — planTier + usage (Phase 23 D-01, D-06)', () => {
  afterAll(async () => { await mongoose.disconnect().catch(() => {}); });

  it('defaults planTier to "free" on new docs', () => {
    const org = new Organization({ name: 'Acme' });
    expect(org.planTier).toBe('free');
  });

  it('defaults usage.exportsThisMonth to 0 and usage.exportResetAt to a Date', () => {
    const org = new Organization({ name: 'Acme' });
    expect(org.usage?.exportsThisMonth).toBe(0);
    expect(org.usage?.exportResetAt).toBeInstanceOf(Date);
  });

  it('rejects invalid planTier values via validation', () => {
    const org = new Organization({ name: 'Acme', planTier: 'enterprise' as PlanTier });
    const err = org.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors.planTier).toBeDefined();
  });

  it('accepts "pro" and "team" planTier values', () => {
    const pro = new Organization({ name: 'Acme', planTier: 'pro' });
    const team = new Organization({ name: 'Acme', planTier: 'team' });
    expect(pro.validateSync()?.errors?.planTier).toBeUndefined();
    expect(team.validateSync()?.errors?.planTier).toBeUndefined();
  });
});
