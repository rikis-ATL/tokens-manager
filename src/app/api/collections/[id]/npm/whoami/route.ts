import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db/get-repository';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';
import { isMongoDbProvider } from '@/lib/versioning/is-mongo-provider';
import { decrypt } from '@/lib/ai/encryption';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';

/**
 * Test registry authentication (npm whoami equivalent).
 * Body: { npmToken?: string } — if omitted, uses stored encrypted token.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireRole(Action.PublishNpm, params.id);
  if (authResult instanceof NextResponse) return authResult;

  if (!isMongoDbProvider()) {
    return NextResponse.json(
      { error: 'NPM settings require MongoDB' },
      { status: 501 }
    );
  }

  try {
    const body = (await request.json()) as { npmToken?: string | null };
    const repo = await getRepository();
    const col = await repo.findById(params.id);
    if (!col) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    let token: string;
    if (body.npmToken && body.npmToken.trim()) {
      token = body.npmToken.trim();
    } else if (col.npmTokenEncrypted && col.npmTokenIv) {
      token = decrypt(col.npmTokenEncrypted, col.npmTokenIv);
    } else {
      return NextResponse.json(
        { error: 'Provide npmToken in the request body or save a token in settings' },
        { status: 400 }
      );
    }

    const registryUrl = (col.npmRegistryUrl?.trim() || DEFAULT_REGISTRY).replace(/\/?$/, '');
    const url = `${registryUrl}/-/whoami`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    let json: { username?: string } = {};
    try {
      json = JSON.parse(text) as { username?: string };
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          error: (json.username ?? text) || res.statusText,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      username: json.username ?? text,
      registryUrl,
    });
  } catch (e) {
    console.error('[POST /api/collections/[id]/npm/whoami]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to verify registry' },
      { status: 500 }
    );
  }
}
