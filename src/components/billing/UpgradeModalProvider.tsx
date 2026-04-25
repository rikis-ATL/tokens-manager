'use client';

// src/components/billing/UpgradeModalProvider.tsx
// Phase 23 D-05 — Global UpgradeModal provider. Must wrap the app tree in src/app/layout.tsx
// INSIDE AppThemeProvider so the modal inherits shadcn theme tokens.
// Pitfall 5 — provider must be in the outermost layout; see acceptance_criteria.

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UpgradeModal } from './UpgradeModal';
import { setUpgradeModalCallback } from '@/lib/api-client';
import { usePermissions } from '@/context/PermissionsContext';

export interface LimitPayload {
  resource: string;
  current: number;
  max: number;
  tier: string;
}

interface UpgradeModalContextValue {
  openUpgradeModal: (payload: LimitPayload) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useSession();
  const { isAdmin } = usePermissions();
  const [payload, setPayload] = useState<LimitPayload | null>(null);

  const openUpgradeModal = useCallback((p: LimitPayload) => {
    // Guard against session hydration race: if the session hasn't resolved yet,
    // isAdmin is always false. Show the modal as a safe fallback rather than
    // potentially redirecting a non-admin to /account.
    if (status !== 'loading' && isAdmin) {
      router.push('/account');
      return;
    }
    setPayload(p);
  }, [isAdmin, router, status]);

  // Register the apiFetch callback on mount so 402 responses auto-open the modal.
  useEffect(() => {
    setUpgradeModalCallback(openUpgradeModal);
    return () => setUpgradeModalCallback(null);
  }, [openUpgradeModal]);

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal }}>
      {children}
      {payload && (
        <UpgradeModal
          payload={payload}
          onClose={() => setPayload(null)}
        />
      )}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal(): UpgradeModalContextValue {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  return ctx;
}
