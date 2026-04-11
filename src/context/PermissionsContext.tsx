'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { canPerform, Action } from '@/lib/auth/permissions';
import type { Role } from '@/lib/auth/permissions';

export interface PermissionsContextValue {
  canEdit:   boolean;  // Action.Write on active collection (effective role), or Action.WritePlayground for Demo on playground
  canCreate: boolean;  // Action.CreateCollection (org role)
  isAdmin:   boolean;  // org role === 'Admin'
  canGitHub: boolean;  // Action.PushGithub on active collection (effective role)
  canFigma:  boolean;  // Action.PushFigma on active collection (effective role)
}

const DEFAULT_PERMISSIONS: PermissionsContextValue = {
  canEdit:   false,
  canCreate: false,
  isAdmin:   false,
  canGitHub: false,
  canFigma:  false,
};

const PermissionsContext = createContext<PermissionsContextValue>(DEFAULT_PERMISSIONS);

/** Extract /collections/[id] segment from pathname, or null if not on a collection route */
function extractCollectionId(pathname: string): string | null {
  const match = pathname.match(/^\/collections\/([^/]+)/);
  return match ? match[1] : null;
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [effectiveRole, setEffectiveRole] = useState<Role | null>(null);
  const [isPlayground, setIsPlayground] = useState(false);

  const collectionId = extractCollectionId(pathname);
  const orgRole = (session?.user?.role as Role) ?? null;

  // Fetch collection metadata to check if it's a playground
  useEffect(() => {
    if (!collectionId) {
      setIsPlayground(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/collections/${collectionId}`)
      .then(res => res.ok ? res.json() : null)
      .then((data: { collection: { isPlayground?: boolean } } | null) => {
        if (!cancelled) {
          setIsPlayground(data?.collection?.isPlayground ?? false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsPlayground(false);
      });

    return () => { cancelled = true; };
  }, [collectionId]);

  useEffect(() => {
    // Safe default: deny all while loading
    if (status === 'loading' || !orgRole) {
      setEffectiveRole(null);
      return;
    }

    // Admin bypasses all collection-level checks
    if (orgRole === 'Admin') {
      setEffectiveRole('Admin');
      return;
    }

    // Not on a collection route: use org role for top-level permissions
    if (!collectionId) {
      setEffectiveRole(orgRole);
      return;
    }

    // Fetch effective role for this specific collection
    let cancelled = false;
    fetch(`/api/collections/${collectionId}/permissions/me`)
      .then(res => res.ok ? res.json() : null)
      .then((data: { role: Role } | null) => {
        if (!cancelled) {
          setEffectiveRole(data?.role ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setEffectiveRole(null);
      });

    return () => { cancelled = true; };
  }, [orgRole, collectionId, status]);

  // Determine canEdit based on role and playground status
  const isDemoEnvSession = session?.demoMode === true;

  const canEdit = effectiveRole
    ? effectiveRole === 'Demo'
      ? isDemoEnvSession ||
        (isPlayground && canPerform(effectiveRole, Action.WritePlayground))
      : canPerform(effectiveRole, Action.Write)
    : false;

  const value: PermissionsContextValue = {
    canEdit,
    canCreate: orgRole       ? canPerform(orgRole, Action.CreateCollection)       : false,
    isAdmin:   orgRole === 'Admin',
    canGitHub: effectiveRole ? canPerform(effectiveRole, Action.PushGithub)       : false,
    canFigma:  effectiveRole ? canPerform(effectiveRole, Action.PushFigma)        : false,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  return useContext(PermissionsContext);
}
