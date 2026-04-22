import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getAppThemeCollectionId } from '@/lib/appTheme/app-theme-config';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
};

/**
 * GET /api/app-theme/config — whether app theming is configured and the collection id (for client shell).
 */
export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const collectionId = getAppThemeCollectionId();
  return NextResponse.json(
    {
      configured: collectionId !== null,
      collectionId,
    },
    { headers: NO_STORE_HEADERS }
  );
}
