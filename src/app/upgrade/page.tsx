'use client';

import { useState } from 'react';
import { type PlanTier } from '@/lib/billing/tiers';
import { getPlanTierLimitsForDisplay } from '@/lib/billing/pricing-public';
import { Button } from '@/components/ui/button';
import { TextAnimNavigators } from '@/components/ui/motion/text-anim-navigators';
import { MarketingDotMatrix } from '@/components/marketing/MarketingDotMatrix';
import { FeatureComparisonTable } from '@/components/marketing/FeatureComparisonTable';

const UPGRADABLE_TIERS = [
  { tier: 'pro' as PlanTier, label: 'Pro', tagline: 'For growing design systems' },
  { tier: 'team' as PlanTier, label: 'Team', tagline: 'Unlimited everything' },
];

export default function UpgradePage() {
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChoose = async (tier: PlanTier) => {
    setLoadingTier(tier);
    setError(null);

    try {
      const priceId =
        tier === 'pro'
          ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID;

      if (!priceId) {
        throw new Error(`Pricing for ${tier} is not configured. Contact support.`);
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Checkout failed');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoadingTier(null);
    }
  };

  return (
    <div className="overflow-hidden relative min-h-full bg-background" data-testid="upgrade-page">
      <MarketingDotMatrix />

      <header className="flex relative z-10 flex-col gap-4 justify-center items-center px-5 w-full min-h-[calc(100vh-15rem)]">
        <div className="flex flex-col gap-8 w-full max-w-3xl">
          <div className="flex flex-col gap-8">
            <h1 className="text-6xl font-bold tracking-tight text-foreground text-balance">
              <TextAnimNavigators
                content="Choose your plan to scale your design tokens."
                delay={0}
                highlight="background"
              />
            </h1>
            <p className="text-xl text-muted-foreground">
              Unlock more collections, themes, tokens, and exports.
              <br />
              <span className="text-foreground">Pick Pro or Team to continue to checkout.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 items-stretch pt-4 sm:grid-cols-2">
            {UPGRADABLE_TIERS.map(({ tier, label, tagline }) => {
              const limits = getPlanTierLimitsForDisplay(tier);
              const isLoading = loadingTier === tier;

              return (
                <div
                  key={tier}
                  data-tier={tier}
                  className="flex relative flex-col gap-4 self-end h-full"
                >
                  <h2 className="font-semibold text-md">{label}: <span className="text-muted-foreground">{tagline}</span></h2>
                  {/* <p className="flex-1 text-sm text-muted-foreground">{tagline}</p> */}
                  <ul className="text-sm space-y-1.5 text-muted-foreground">
                    <li>{limits.collections} collections</li>
                    <li>{limits.themesPerCollection} themes per collection</li>
                    <li>{limits.tokens} total tokens</li>
                    <li>{limits.exportsPerMonth} exports per month</li>
                  </ul>
                  <Button
                    onClick={() => handleChoose(tier)}
                    disabled={loadingTier !== null}
                    data-testid={`choose-${tier}`}
                    className="mt-2 w-full h-11 text-md"
                    variant={tier === 'pro' ? 'default' : 'secondary'}
                  >
                    {isLoading ? 'Redirecting…' : `Choose ${label}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 py-16 mx-auto space-y-16 max-w-6xl">
        <div>
            <h2 className="py-4 text-lg">Feature comparison</h2>
          <div className="overflow-hidden rounded-2xl border shadow-xl bg-card border-border">
            <FeatureComparisonTable />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="upgrade-error"
            className="p-4 rounded-2xl border border-destructive bg-destructive/10 text-destructive"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
