import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { TokenUpdater } from '@/utils/tokenUpdater';

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { path: filePath } = await context.params;
    const body = await request.json();
    const { tokenPath, newValue } = body;

    if (!tokenPath || newValue === undefined) {
      return NextResponse.json(
        { error: 'Missing tokenPath or newValue' },
        { status: 400 }
      );
    }

    const filePathStr = filePath.join('/');
    const tokensDir = path.join(process.cwd(), 'tokens');
    const updater = new TokenUpdater(tokensDir);

    const success = await updater.updateToken(filePathStr, tokenPath, newValue);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token updated successfully',
      tokenPath,
      newValue
    });
  } catch (error) {
    console.error('Error updating token:', error);
    return NextResponse.json(
      { error: 'Failed to update token' },
      { status: 500 }
    );
  }
}