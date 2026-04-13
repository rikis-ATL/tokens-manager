import { NextRequest, NextResponse } from 'next/server';

function figmaVariablesFailurePayload(
  status: number,
  rawBody: string
): { error: string; hint: string; figmaStatus: number } {
  if (status === 401) {
    return {
      error: 'Figma rejected the token (401).',
      hint: 'Regenerate your personal access token and paste it again — the file ID is not the cause of 401.',
      figmaStatus: status,
    };
  }
  if (status === 403) {
    return {
      error: 'Figma returned forbidden (403).',
      hint: 'The token may be missing scopes, or your plan/seat cannot use the Variables API on this file.',
      figmaStatus: status,
    };
  }
  if (status === 404) {
    return {
      error: 'Figma could not find this file or variables (404).',
      hint:
        'A wrong or outdated file key, a deleted file, or no access to the file usually shows as 404 — not a bad token. If /api/figma/test succeeds, your token is fine: recopy the key from the file URL (the segment after /design/ or /file/).',
      figmaStatus: status,
    };
  }
  return {
    error: `Figma Variables API error (${status}).`,
    hint: rawBody.length > 300 ? `${rawBody.slice(0, 300)}…` : rawBody,
    figmaStatus: status,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const fileKey = request.nextUrl.searchParams.get('fileKey');

  if (!token || !fileKey) {
    return NextResponse.json({ error: 'token and fileKey parameters required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/variables/local`,
      {
        headers: { 'X-Figma-Token': token },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const payload = figmaVariablesFailurePayload(response.status, errorText);
      return NextResponse.json(payload, { status: 502 });
    }

    const data = await response.json();
    const collectionsObj = data.meta?.variableCollections || {};
    const collections = Object.values(collectionsObj).map((c: unknown) => {
      const col = c as { id: string; name: string; modes?: { modeId: string; name: string }[] };
      return {
        id: col.id,
        name: col.name,
        modes: col.modes || [],
      };
    });

    return NextResponse.json({ collections });
  } catch {
    return NextResponse.json({ error: 'Failed to reach Figma API' }, { status: 500 });
  }
}
