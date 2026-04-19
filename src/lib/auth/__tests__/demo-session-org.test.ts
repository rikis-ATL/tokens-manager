import { getDemoUserSession } from '../demo-session';

describe('Demo session — organizationId (Phase 22 D-10)', () => {
  const ORIGINAL_ENV = process.env.DEMO_ORG_ID;
  afterEach(() => { process.env.DEMO_ORG_ID = ORIGINAL_ENV; });

  it('uses DEMO_ORG_ID env var when set', async () => {
    process.env.DEMO_ORG_ID = '507f1f77bcf86cd799439099';
    const session = await getDemoUserSession();
    expect(session.user.organizationId).toBe('507f1f77bcf86cd799439099');
  });

  it('falls back to empty string when DEMO_ORG_ID is unset', async () => {
    delete process.env.DEMO_ORG_ID;
    const session = await getDemoUserSession();
    expect(session.user.organizationId).toBe('');
  });

  it('preserves existing demo session fields', async () => {
    const session = await getDemoUserSession();
    expect(session.demoMode).toBe(true);
    expect(session.user.id).toBe('demo-visitor');
    expect(session.user.role).toBe('Demo');
    expect(session.user.email).toBe('demo@visitor.local');
    expect(session.user.name).toBe('Demo Visitor');
  });
});
