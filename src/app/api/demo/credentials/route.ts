import { NextResponse } from 'next/server';
import { isDemoMode, getDemoAdminEmail } from '@/lib/auth/demo';

/**
 * Returns shared demo sign-in values for the landing page (DEMO_MODE only).
 * The Mongo user for this org must be seeded with the same email/password.
 */
export async function GET() {
  if (!isDemoMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const email = getDemoAdminEmail() || null;
  const password = (process.env.DEMO_ADMIN_PASSWORD ?? '').trim() || null;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Demo credentials are not configured' },
      { status: 503 },
    );
  }

  return NextResponse.json({ email, password });
}
