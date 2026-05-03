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
          setError('Demo is not configured. Please contact the site administrator.');
          return;
        }
        const { email, password } = await res.json() as { email: string; password: string };
        await signIn('credentials', {
          email,
          password,
          redirect: true,
          callbackUrl,
        });
      } catch {
        setError('Sign-in failed. Please try refreshing the page.');
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
