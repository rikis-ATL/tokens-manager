'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Overlay CTA displayed over the graph panel for Demo-role users.
 * Shows a "Get started free" sign-up button.
 * Only visible when session.user.role === 'Demo' (D-13).
 * No dismiss mechanism for MVP (D-14).
 * Scaffold for future guided onboarding steps.
 */
export function DemoOverlayCTA() {
  const { data: session } = useSession();
  const isDemoUser = session?.user?.role === 'Demo';

  if (!isDemoUser) return null;

  return (
    <div className="absolute top-3 right-3 z-10">
      <Button asChild size="sm">
        <Link href="/auth/signup">Get started free</Link>
      </Button>
    </div>
  );
}
