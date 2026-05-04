'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { OrgHeader } from '@/components/layout/OrgHeader';
import { OrgSidebar } from '@/components/layout/OrgSidebar';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { CollectionProvider } from '@/context/CollectionContext';

/** Landing (`/`), `/landing`, and upgrade flows use a minimal chrome (no app sidebar). */
function isMarketingPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/landing' || pathname.startsWith('/upgrade')) return true;
  return false;
}

function isCollectionRoute(pathname: string): boolean {
  // /collections/[id]/... — inside a specific collection
  return /^\/collections\/[^/]/.test(pathname);
}

function isOrgRoute(pathname: string): boolean {
  // Top-level org pages and /org/* pages (e.g. /org/users)
  return pathname === '/collections'
    || pathname === '/settings'
    || pathname === '/account'
    || pathname.startsWith('/org');
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/');
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isMarketingPath(pathname)) {
    return (
      <CollectionProvider>
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <MarketingHeader showBack={pathname !== '/' && pathname !== '/landing'} />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </CollectionProvider>
    );
  }

  return (
    <CollectionProvider>
      {isCollectionRoute(pathname) || isAuthRoute(pathname) ? (
        // Collection pages and auth pages own their full layout
        children
      ) : isOrgRoute(pathname) ? (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <OrgHeader />
          <div className="flex flex-1 overflow-hidden ">
            <OrgSidebar />
            <main className="flex-1 overflow-y-auto bg-background text-foreground">
              {children}
            </main>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
          <AppHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto bg-background text-foreground">
              {children}
            </main>
          </div>
        </div>
      )}
    </CollectionProvider>
  );
}
