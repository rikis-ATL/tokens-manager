'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type PlanTier = 'free' | 'pro' | 'team';

export default function AccountPage() {
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/org/usage');
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setPlan(data.plan);
            setOrgName(data.orgName);
          }
        } else {
          if (!cancelled) {
            setError('Unable to load billing info');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load billing info');
        }
      }
    };

    fetchUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST'
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Portal failed');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10" data-testid="account-page">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Account</h1>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Billing</h2>

        {plan === null && !error && (
          <p className="text-muted-foreground">Loading billing info…</p>
        )}

        {plan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Current plan</span>
              <Badge data-testid="account-plan-badge" className="capitalize">
                {plan}
              </Badge>
            </div>

            {orgName && (
              <div className="flex items-center justify-between">
                <span>Organization</span>
                <span>{orgName}</span>
              </div>
            )}

            <div className="pt-4">
              {(plan === 'pro' || plan === 'team') && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  data-testid="manage-subscription-cta"
                >
                  {loadingPortal ? 'Opening…' : 'Manage subscription'}
                </Button>
              )}

              {plan === 'free' && (
                <Link href="/upgrade">
                  <Button data-testid="account-upgrade-cta">
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            data-testid="account-error"
            className="p-4 border border-destructive bg-destructive/10 text-destructive rounded"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}