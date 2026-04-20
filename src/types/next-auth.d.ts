import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    /** True when session is served from DEMO_MODE synthetic demo visitor */
    demoMode?: boolean;
    user: {
      id: string;
      role: string;
      /** Phase 22 — Organization._id (stringified). Empty string if token predates migration. */
      organizationId: string;
      /** True when this user's email matches SUPER_ADMIN_EMAIL. */
      isSuperAdmin: boolean;
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
  }
}
