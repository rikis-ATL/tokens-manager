'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPlanTierLimitsForDisplay } from '@/lib/billing/pricing-public';

export function DemoLanding({ demoUrl }: { demoUrl: string }) {
  const free = getPlanTierLimitsForDisplay('free');
  const pro = getPlanTierLimitsForDisplay('pro');
  const team = getPlanTierLimitsForDisplay('team');

  return (
    <div className="max-w-4xl mx-auto px-5 py-10 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Design token manager</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Explore the product on a shared demo, or create your own free organization. You can upgrade anytime.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Create a free org</h2>
          <p className="text-sm text-muted-foreground flex-1">
            Sign in or register to get your own workspace. Upgrade to Pro or Team when you need higher limits.
          </p>
          <Button asChild>
            <Link href="/auth/signup">Get started</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Try the shared demo</h2>
          <p className="text-sm text-muted-foreground flex-1">
            Explore a live playground with sample token collections. No sign-up required.
          </p>
          <Button asChild variant="secondary">
            <Link href={demoUrl}>Enter demo</Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2 text-center">Pricing overview</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Limits are enforced in product — these numbers are the source of truth from billing config.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlanCard
            name="Free"
            badge="Current"
            rows={[
              ['Collections', free.collections],
              ['Themes / collection', free.themesPerCollection],
              ['Tokens (org total)', free.tokens],
              ['Exports / month', free.exportsPerMonth],
              ['Requests / minute', free.requestsPerMinute],
            ]}
          />
          <PlanCard
            name="Pro"
            rows={[
              ['Collections', pro.collections],
              ['Themes / collection', pro.themesPerCollection],
              ['Tokens (org total)', pro.tokens],
              ['Exports / month', pro.exportsPerMonth],
              ['Requests / minute', pro.requestsPerMinute],
            ]}
            cta={<Button asChild variant="outline" size="sm" className="w-full mt-2"><Link href="/upgrade">Upgrade</Link></Button>}
          />
          <PlanCard
            name="Team"
            rows={[
              ['Collections', team.collections],
              ['Themes / collection', team.themesPerCollection],
              ['Tokens (org total)', team.tokens],
              ['Exports / month', team.exportsPerMonth],
              ['Requests / minute', team.requestsPerMinute],
            ]}
            cta={<Button asChild variant="outline" size="sm" className="w-full mt-2"><Link href="/upgrade">Upgrade</Link></Button>}
          />
          <div className="rounded-lg border border-dashed border-border p-4 flex flex-col">
            <h3 className="font-semibold mb-1">Self-hosted</h3>
            <p className="text-xs text-muted-foreground mb-3 flex-1">One-time payment. Repository access, your own MongoDB, full control of your data.</p>
            <Button asChild variant="secondary" size="sm">
              <a
                href={
                  process.env.NEXT_PUBLIC_DEMO_CONTACT_HREF ??
                  'mailto:hello@example.com?subject=Self-hosted%20inquiry'
                }
              >
                Contact us
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  badge,
  rows,
  cta,
}: {
  name: string;
  badge?: string;
  rows: [string, string][];
  cta?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold">{name}</h3>
        {badge ? <span className="text-xs bg-muted px-2 py-0.5 rounded">{badge}</span> : null}
      </div>
      <ul className="text-sm space-y-1.5 text-muted-foreground">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between gap-2">
            <span>{k}</span>
            <span className="text-foreground font-medium tabular-nums">{v}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}
