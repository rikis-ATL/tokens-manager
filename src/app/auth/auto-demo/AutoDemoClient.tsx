'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

interface AutoDemoClientProps {
  callbackUrl: string;
}

export function AutoDemoClient({ callbackUrl }: AutoDemoClientProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function autoSignIn() {
      try {
        const res = await fetch('/api/demo/credentials');
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setError(
            body.error ??
              'Demo is not configured on this deployment (check DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD).',
          );
          return;
        }
        const { email, password } = await res.json() as { email: string; password: string };
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
          callbackUrl,
        });
        if (result?.error) {
          setError(
            'Demo sign-in failed. Ensure the demo user exists in the database with a password matching DEMO_ADMIN_PASSWORD, then try again.',
          );
          return;
        }
        window.location.href = callbackUrl;
      } catch {
        setError(
          'Could not reach the server. On first load, wait a moment and refresh — cold starts can interrupt sign-in.',
        );
      }
    }
    void autoSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — callbackUrl is stable for the component lifetime

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Loading demo...</p>
      </div>
    </div>
  );
}
