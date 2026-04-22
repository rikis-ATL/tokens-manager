'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type PlanTier = 'free' | 'pro' | 'team';

const REDIRECT_MS = 3000;

export default function UpgradeSuccessPage() {
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const fetchPlan = async () => {
      try {
        const response = await fetch('/api/org/usage');
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setPlan(data.plan);
          }
        } else {
          if (!cancelled) {
            setError(true);
          }
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    };

    fetchPlan();

    const timeout = setTimeout(() => {
      router.push('/collections');
    }, REDIRECT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center" data-testid="upgrade-success-page">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Upgrade successful!</h1>

      {plan && (
        <p className="text-lg mb-6">
          You are now on the <strong className="capitalize">{plan}</strong> plan.
        </p>
      )}

      {error && (
        <p className="text-lg mb-6">
          Your upgrade is processing. Your new plan will be available shortly.
        </p>
      )}

      {!plan && !error && (
        <p className="text-lg mb-6">
          Confirming your new plan…
        </p>
      )}

      <p className="text-muted-foreground">
        Redirecting to your collections in a few seconds…
      </p>
    </div>
  );
}