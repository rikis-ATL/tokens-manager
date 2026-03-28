'use client';

import { SessionProvider } from 'next-auth/react';
import { PermissionsProvider } from '@/context/PermissionsContext';

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PermissionsProvider>
        {children}
      </PermissionsProvider>
    </SessionProvider>
  );
}
