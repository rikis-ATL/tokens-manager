'use client';

import { usePathname } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { CollectionProvider } from '@/context/CollectionContext';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCollectionsGrid = pathname.startsWith('/collections');

  return (
    <CollectionProvider>
      {isCollectionsGrid ? (
        children
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
          <AppHeader />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </CollectionProvider>
  );
}
