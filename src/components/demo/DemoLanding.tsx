'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPlanTierLimitsForDisplay } from '@/lib/billing/pricing-public';
import { showSuccessToast, showErrorToast } from '@/utils/toast.utils';
import { Copy, Checkmark, InProgress } from '@carbon/icons-react';

type Creds = { email: string; password: string };

export function DemoLanding() {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/demo/credentials')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Creds | null) => {
        if (!cancelled && data) setCreds(data);
      })
      .catch(() => {
        if (!cancelled) setCreds(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const free = getPlanTierLimitsForDisplay('free');
  const pro = getPlanTierLimitsForDisplay('pro');
  const team = getPlanTierLimitsForDisplay('team');

  const signInWithDemo = creds
    ? `/auth/sign-in?email=${encodeURIComponent(creds.email)}`
    : '/auth/sign-in';

  const copy = async (field: 'email' | 'password', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showSuccessToast('Copied');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showErrorToast('Could not copy');
    }
  };

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
          <p className="text-sm text-muted-foreground">
            Use the read-only public credentials for the shared demo org. Do not put private data here — anyone can
            sign in. Rotate the password in your environment for your deploy.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <InProgress size={16} className="animate-spin shrink-0" />
              Loading demo sign-in…
            </div>
          ) : creds ? (
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-xs break-all bg-muted px-2 py-1.5 rounded">{creds.email}</code>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copy('email', creds.email)}
                    aria-label="Copy email"
                  >
                    {copiedField === 'email' ? <Checkmark size={16} className="shrink-0" /> : <Copy size={16} className="shrink-0" />}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Password</p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-xs break-all bg-muted px-2 py-1.5 rounded">{creds.password}</code>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copy('password', creds.password)}
                    aria-label="Copy password"
                  >
                    {copiedField === 'password' ? <Checkmark size={16} className="shrink-0" /> : <Copy size={16} className="shrink-0" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-destructive">Demo sign-in is not configured (set DEMO_ADMIN_* in the server environment).</p>
          )}
          <Button asChild variant="secondary" disabled={!creds}>
            <Link href={signInWithDemo}>Open sign in</Link>
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
