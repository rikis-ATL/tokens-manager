import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token parameter required' }, { status: 400 });
  }
  try {
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': token },
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Invalid Figma token' }, { status: 401 });
    }
    const data = await response.json();
    return NextResponse.json({ ok: true, email: data.email });
  } catch {
    return NextResponse.json({ error: 'Failed to reach Figma API' }, { status: 500 });
  }
}
