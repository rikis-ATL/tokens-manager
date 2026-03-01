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
      let errorMessage = `Figma API error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (response.status === 403 && typeof errorData.message === 'string' && errorData.message.includes('file_variables')) {
          errorMessage = 'The Figma Variables API requires an Enterprise Figma plan. Your current plan does not include access to the Variables REST API.';
        } else {
          errorMessage = `Figma API error: ${errorData.message || response.statusText}`;
        }
      } catch {
        // response was not JSON
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status === 403 ? 403 : 502 }
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
