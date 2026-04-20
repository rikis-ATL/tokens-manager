// Required env vars:
//   NEXTAUTH_SECRET — JWT signing secret (generate: openssl rand -base64 32)
//   NEXTAUTH_URL    — App base URL (e.g. http://localhost:3000)
//   SUPER_ADMIN_EMAIL — Email address that always receives Admin role in JWT

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/db/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        if (!user) throw new Error('No account found with that email');
        if (user.status === 'disabled') throw new Error('Incorrect password'); // generic — same as wrong pw, don't reveal status
        // Note: 'invited' status users who have set a password CAN sign in (they are not yet 'active' until Phase 20 sets status)
        // Only 'disabled' is explicitly blocked
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) throw new Error('Incorrect password');
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.displayName,
          role: user.role,
          // Phase 22 D-09 — organizationId flows into the JWT. Empty string fallback for any legacy doc
          // somehow lacking it (shouldn't happen after Plan 04 migration, but defence-in-depth).
          organizationId: user.organizationId ? user.organizationId.toString() : '',
        } as unknown as { id: string; email: string; name: string; role: string; organizationId: string };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in: set all fields and seed roleLastFetched
      if (user) {
        const u = user as unknown as { id: string; role: string; name: string };
        token.id   = u.id;
        token.role = u.role;
        token.name = u.name;
        token.roleLastFetched = Date.now();
        // Phase 22 D-09 — copy org claim on initial sign-in. Not re-fetched on role-TTL refresh
        // because single-org-per-user means it does not change (see RESEARCH.md Open Question 2).
        token.organizationId = (user as unknown as { organizationId?: string }).organizationId ?? '';
      }

      // SUPER_ADMIN_EMAIL short-circuit — apply first, return early to skip DB re-fetch
      // Checks token.email (always present) per AUTH-06 decision in STATE.md
      if (token.email === process.env.SUPER_ADMIN_EMAIL) {
        token.role = 'Admin';
        token.isSuperAdmin = true;
        token.roleLastFetched = Date.now(); // keep timestamp fresh, no DB hit needed
        return token;
      }
      token.isSuperAdmin = false;

      // Role re-fetch when stale (> 60 seconds)
      // token.id is absent in very old pre-v1.5 sessions — skip re-fetch safely
      if (!token.id) return token;

      const ROLE_TTL_MS = 60 * 1000;
      const lastFetched = (token.roleLastFetched ?? 0) as number;
      if (Date.now() - lastFetched > ROLE_TTL_MS) {
        await dbConnect();
        const dbUser = await User.findById(token.id as string)
          .select('role status')
          .lean() as { role: string; status: string } | null;

        if (!dbUser || dbUser.status === 'disabled') {
          // User deleted or removed — invalidate session by returning empty token
          // next-auth v4: returning {} forces re-sign-in on the client
          return {} as typeof token;
        }

        token.role = dbUser.role;
        token.roleLastFetched = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string;
        session.user.role = token.role as string;
        // Phase 22 D-09 — expose org claim on the client-side session.user.
        session.user.organizationId = (token.organizationId as string | undefined) ?? '';
        session.user.isSuperAdmin = (token.isSuperAdmin as boolean | undefined) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/sign-in',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
