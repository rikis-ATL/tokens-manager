// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Demo mode: Simple pass-through, no JWT checking
  if (DEMO_MODE) {
    if (pathname === '/auth/sign-in') {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    // Allow all access in demo mode (auth handled by API routes)
    return NextResponse.next();
  }

  // Normal mode: Use cookies to check authentication
  // NextAuth stores session in next-auth.session-token cookie
  const sessionToken = req.cookies.get('next-auth.session-token') 
    || req.cookies.get('__Secure-next-auth.session-token'); // HTTPS cookie name

  const hasSession = !!sessionToken;

  // Allow access to /auth/* pages without session
  if (pathname.startsWith('/auth/')) {
    // Redirect authenticated users away from sign-in
    if (pathname === '/auth/sign-in' && hasSession) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    return NextResponse.next();
  }

  // Require session for all other pages
  if (!hasSession) {
    const signInUrl = new URL('/auth/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Note: Admin role checking happens in API routes via requireRole()
  // We can't check JWT payload in Edge Runtime without Node.js modules
  // Admin-only pages (/org/users, /settings) will be protected by their data fetching

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api/          (API routes — each write handler guards itself via requireAuth())
     * - _next/static  (Next.js static file serving)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico
     *
     * /auth/* page routes (e.g. /auth/sign-in) are intentionally included so the
     * middleware body can redirect authenticated users away from the sign-in page.
     * /api/auth/* NextAuth callback endpoints are excluded via the api/ exclusion above.
     *
     * Excluding api/ from the matcher is intentional: middleware handles page-level UX
     * redirects only. API routes return 401 JSON from requireAuth() — not HTML redirects
     * (which would break fetch() callers). Separation per CONTEXT.md.
     */
    '/((?!api|embed|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
