import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    /** True when on a demo deploy and the user is the shared demo admin (DEMO_ADMIN_EMAIL). */
    demoMode?: boolean;
    user: {
      id: string;
      role: string;
      /** Phase 22 — Organization._id (stringified). Empty string if token predates migration. */
      organizationId: string;
      /** True when this user's email matches SUPER_ADMIN_EMAIL. */
      isSuperAdmin: boolean;
      /** Display name of the user's organisation. Empty string for legacy/pre-22 sessions. */
      orgName: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    roleLastFetched?: number;
    /** Phase 22 — Organization._id (stringified). Undefined on tokens minted before Phase 22 deploy. */
    organizationId?: string;
    isSuperAdmin?: boolean;
    orgName?: string;
    /** True when DEMO_MODE and the signed-in user is the shared demo admin (DEMO_ADMIN_EMAIL). */
    demoMode?: boolean;
  }
}
