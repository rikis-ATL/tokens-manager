import NextAuth from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/nextauth.config';
import { isDemoMode } from '@/lib/auth/demo';
import { getDemoUserSession } from '@/lib/auth/demo-session';

const handler = NextAuth(authOptions);

// Intercept GET requests in demo mode to return demo session
export async function GET(req: NextRequest, context: { params: { nextauth: string[] } }) {
  if (isDemoMode()) {
    const params = context.params.nextauth;
    
    // Only intercept the session endpoint
    if (params && params.length === 1 && params[0] === 'session') {
      try {
        const demoSession = await getDemoUserSession();
        return NextResponse.json(demoSession);
      } catch (error) {
        console.error('[NextAuth Demo] Failed to get demo session:', error);
        // Fall through to normal NextAuth handler
      }
    }
  }
  
  return handler(req, context);
}

export { handler as POST };
