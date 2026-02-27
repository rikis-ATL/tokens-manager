import { NextRequest, NextResponse } from 'next/server';

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
      return NextResponse.json(
        { error: `Figma API error: ${errorText}` },
        { status: 502 }
      );
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
