import { isSharedDemoAdminEmail, getDemoAdminEmail } from '../demo';

describe('demo admin helpers', () => {
  const origDemo = process.env.DEMO_MODE;
  const origEmail = process.env.DEMO_ADMIN_EMAIL;

  afterEach(() => {
    process.env.DEMO_MODE = origDemo;
    process.env.DEMO_ADMIN_EMAIL = origEmail;
  });

  it('isSharedDemoAdminEmail is false when DEMO_MODE is off', () => {
    process.env.DEMO_MODE = 'false';
    process.env.DEMO_ADMIN_EMAIL = 'a@a.com';
    expect(isSharedDemoAdminEmail('a@a.com')).toBe(false);
  });

  it('isSharedDemoAdminEmail matches DEMO_ADMIN_EMAIL case-insensitively when demo on', () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_ADMIN_EMAIL = ' Public@DEMO.LOCAL ';
    expect(isSharedDemoAdminEmail('public@demo.local')).toBe(true);
    expect(getDemoAdminEmail()).toBe('public@demo.local');
  });

  it('isSharedDemoAdminEmail is false for other addresses', () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_ADMIN_EMAIL = 'demo@x.com';
    expect(isSharedDemoAdminEmail('other@x.com')).toBe(false);
  });
});
