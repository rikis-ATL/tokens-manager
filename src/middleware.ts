// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

const DEMO_PUBLIC_PATH_PREFIXES = [
  '/auth',
  '/upgrade',
  '/landing',
] as const;

// Hero path: the playground collection tokens page in DEMO_MODE
const PLAYGROUND_ID = process.env.PLAYGROUND_COLLECTION_ID;

function isHeroPath(pathname: string): boolean {
  if (!PLAYGROUND_ID) return false;
  return pathname === `/collections/${PLAYGROUND_ID}/tokens`;
}

function isDemoPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  for (const p of DEMO_PUBLIC_PATH_PREFIXES) {
    if (pathname === p || pathname.startsWith(`${p}/`)) {
      return true;
    }
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const sessionToken =
    req.cookies.get('next-auth.session-token') ??
    req.cookies.get('__Secure-next-auth.session-token');
  const hasSession = Boolean(sessionToken);

  if (DEMO_MODE) {
    // Hero path: redirect unauthenticated visitors to auto-sign-in (per D-07, D-08)
    if (isHeroPath(pathname) && !hasSession) {
      const autoDemoUrl = new URL('/auth/auto-demo', req.url);
      autoDemoUrl.searchParams.set(
        'callbackUrl',
        `/collections/${PLAYGROUND_ID}/tokens?graph=full`
      );
      return NextResponse.redirect(autoDemoUrl);
    }
    if (isDemoPublicPath(pathname)) {
      if (pathname === '/auth/sign-in' && hasSession) {
        return NextResponse.redirect(new URL('/collections', req.url));
      }
      return NextResponse.next();
    }
    if (!hasSession) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/auth/')) {
    if (pathname === '/auth/sign-in' && hasSession) {
      return NextResponse.redirect(new URL('/collections', req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const signInUrl = new URL('/auth/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|embed|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
