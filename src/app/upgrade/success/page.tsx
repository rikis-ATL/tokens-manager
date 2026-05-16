'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextAnimNavigators } from '@/components/ui/motion/text-anim-navigators';
import { MarketingDotMatrix } from '@/components/marketing/MarketingDotMatrix';

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
        } else if (!cancelled) {
          setError(true);
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
    <div
      className="overflow-hidden relative flex flex-col justify-center items-center px-5 min-h-full bg-background"
      data-testid="upgrade-success-page"
    >
      <MarketingDotMatrix />

      <div className="relative z-10 flex flex-col gap-8 max-w-3xl text-center">
        <h1 className="text-6xl font-bold tracking-tight text-foreground text-balance">
          <TextAnimNavigators content="Upgrade successful!" delay={0} highlight="background" />
        </h1>

        {plan && (
          <p className="text-xl text-muted-foreground">
            You are now on the{' '}
            <span className="text-foreground capitalize">{plan}</span> plan.
          </p>
        )}

        {error && (
          <p className="text-xl text-muted-foreground">
            Your upgrade is processing.
            <br />
            <span className="text-foreground">Your new plan will be available shortly.</span>
          </p>
        )}

        {!plan && !error && (
          <p className="text-xl text-muted-foreground">
            Confirming your new plan…
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          Redirecting to your collections in a few seconds…
        </p>
      </div>
    </div>
  );
}
