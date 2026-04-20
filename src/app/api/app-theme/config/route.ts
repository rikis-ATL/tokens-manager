import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getAppThemeCollectionId } from '@/lib/appTheme/app-theme-config';

/**
 * GET /api/app-theme/config — whether app theming is configured and the collection id (for client shell).
 */
export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const collectionId = getAppThemeCollectionId();
  return NextResponse.json({
    configured: collectionId !== null,
    collectionId,
  });
}
