'use client'

import { useState } from 'react';
import { LIMITS, type PlanTier } from '@/lib/billing/tiers';
import { Button } from '@/components/ui/button';

const fmt = (n: number): string => (n === Infinity ? 'Unlimited' : String(n));

const UPGRADABLE_TIERS = [
  { tier: 'pro' as PlanTier, label: 'Pro', tagline: 'For growing design systems' },
  { tier: 'team' as PlanTier, label: 'Team', tagline: 'Unlimited everything' }
];

export default function UpgradePage() {
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChoose = async (tier: PlanTier) => {
    setLoadingTier(tier);
    setError(null);

    try {
      const priceId = tier === 'pro'
        ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID;

      if (!priceId) {
        throw new Error(`Pricing for ${tier} is not configured. Contact support.`);
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
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
    <div className="mx-auto max-w-3xl px-6 py-10" data-testid="upgrade-page">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Choose your plan</h1>
        <p className="text-lg text-muted-foreground">
          Upgrade to unlock more collections, themes, tokens, and exports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {UPGRADABLE_TIERS.map(({ tier, label, tagline }) => {
          const limits = LIMITS[tier];
          const isLoading = loadingTier === tier;

          return (
            <div
              key={tier}
              data-tier={tier}
              className="border rounded-lg p-6 space-y-4"
            >
              <div>
                <h2 className="text-xl font-semibold capitalize">{label}</h2>
                <p className="text-sm text-muted-foreground">{tagline}</p>
              </div>

              <ul className="space-y-2 text-sm">
                <li>• {fmt(limits.maxCollections)} collections</li>
                <li>• {fmt(limits.maxThemesPerCollection)} themes per collection</li>
                <li>• {fmt(limits.maxTokensTotal)} total tokens</li>
                <li>• {fmt(limits.maxExportsPerMonth)} exports per month</li>
                <li>• {fmt(limits.rateLimitPerMinute)} requests per minute</li>
              </ul>

              <Button
                onClick={() => handleChoose(tier)}
                disabled={loadingTier !== null}
                data-testid={`choose-${tier}`}
                className="w-full"
              >
                {isLoading ? 'Redirecting…' : `Choose ${label}`}
              </Button>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          data-testid="upgrade-error"
          className="mt-6 p-4 border border-destructive bg-destructive/10 text-destructive rounded"
        >
          {error}
        </div>
      )}
    </div>
  );
}