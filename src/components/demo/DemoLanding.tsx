'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPlanTierLimitsForDisplay, getPlanFeaturesForDisplay } from '@/lib/billing/pricing-public';

export function DemoLanding({ demoUrl }: { demoUrl: string }) {
  const free = getPlanTierLimitsForDisplay('free');
  const pro = getPlanTierLimitsForDisplay('pro');
  const team = getPlanTierLimitsForDisplay('team');

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dot matrix background pattern */}
      <div 
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-16 space-y-16">
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            tokenflow
          </h1>
          <p className="text-xl text-muted-foreground">
            Token generation and management for humans.
          </p>
        </div>

    

        {/* CTA Cards */}
        <div className="grid gap-6 md:grid-cols-2 max-w-6xl mx-auto">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8 flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Create a free org</h2>
            <p className="text-muted-foreground flex-1">
              Register to get your own workspace will all features. 
              Limited to 1 collection with no integrations.
              Upgrade to a paid plan when you need higher limits.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>

          <div className="bg-card rounded-2xl shadow-xl border border-border p-8 flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Try the shared demo</h2>
            <p className="text-muted-foreground flex-1">
              Explore a live playground with sample token collections. No sign-up required.
              Mess around with the playground app theme to see live changes. Or view examples of token collections.
            </p>
            <Button asChild size="lg" className="w-full" >
              <Link href={demoUrl}>Enter demo</Link>
            </Button>
          </div>
        </div>

        {/* Feature Table */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Feature comparison</h2>
            <Button asChild>
              <Link href="/upgrade">Upgrade plan</Link>
            </Button>
          </div>
          <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <FeatureTable />
          </div>
        </div>
   

          {/* About Section */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
            <h2 className="text-xl font-semibold mb-4">Feedback</h2>
            <div className="space-y-4 text-muted-foreground">
              {/* <p>
                This project is built to help manage design tokens for our internal design system.
                I created this to avoid the pains of editing tokens in json format. 
                It is a hosted Style Dictionary build environment with a visual UI, advanced tokens generation and synchronization capabilities.
              </p> */}
              <p>
                If you have any feedback or suggestions, feel free to reach out at{' '}
                <a href="mailto:tokenflow666@gmail.com" className="text-foreground font-medium hover:underline">
                  tokenflow666@gmail.com
                </a>.
              </p>
            </div>
          </div>
        </div>
        </div>
    </div>
  );
}

function FeatureTable() {
  const freeLimits = getPlanTierLimitsForDisplay('free');
  const proLimits = getPlanTierLimitsForDisplay('pro');
  const teamLimits = getPlanTierLimitsForDisplay('team');
  const freeFeatures = getPlanFeaturesForDisplay('free');
  const proFeatures = getPlanFeaturesForDisplay('pro');
  const teamFeatures = getPlanFeaturesForDisplay('team');
  const selfHostedFeatures = getPlanFeaturesForDisplay('selfHosted');

  const rows: Array<{ label: string; free: string; pro: string; team: string; selfHosted: string; isHeader?: boolean }> = [
    { label: 'Limits', free: '', pro: '', team: '', selfHosted: '', isHeader: true },
    { label: 'Collections', free: freeLimits.collections, pro: proLimits.collections, team: teamLimits.collections, selfHosted: 'Unlimited' },
    { label: 'Themes / collection', free: freeLimits.themesPerCollection, pro: proLimits.themesPerCollection, team: teamLimits.themesPerCollection, selfHosted: 'Unlimited' },
    { label: 'Tokens (org total)', free: freeLimits.tokens, pro: proLimits.tokens, team: teamLimits.tokens, selfHosted: 'Unlimited' },
    { label: 'Exports / month', free: freeLimits.exportsPerMonth, pro: proLimits.exportsPerMonth, team: teamLimits.exportsPerMonth, selfHosted: 'Unlimited' },
    
    { label: 'Core Features', free: '', pro: '', team: '', selfHosted: '', isHeader: true },
    { label: 'Graph-based token generation', free: freeFeatures.graphEditor, pro: proFeatures.graphEditor, team: teamFeatures.graphEditor, selfHosted: selfHostedFeatures.graphEditor },
    { label: 'Math nodes & expressions', free: freeFeatures.mathNodes, pro: proFeatures.mathNodes, team: teamFeatures.mathNodes, selfHosted: selfHostedFeatures.mathNodes },
    { label: 'Token references', free: freeFeatures.tokenReferences, pro: proFeatures.tokenReferences, team: teamFeatures.tokenReferences, selfHosted: selfHostedFeatures.tokenReferences },
    { label: 'Multi-format export', free: freeFeatures.multiFormatExport, pro: proFeatures.multiFormatExport, team: teamFeatures.multiFormatExport, selfHosted: selfHostedFeatures.multiFormatExport },
    { label: 'Bulk token operations', free: freeFeatures.bulkOperations, pro: proFeatures.bulkOperations, team: teamFeatures.bulkOperations, selfHosted: selfHostedFeatures.bulkOperations },
    { label: 'Visual color swatches', free: freeFeatures.colorSwatches, pro: proFeatures.colorSwatches, team: teamFeatures.colorSwatches, selfHosted: selfHostedFeatures.colorSwatches },
    
    { label: 'Integrations', free: '', pro: '', team: '', selfHosted: '', isHeader: true },
    { label: 'GitHub import/export', free: freeFeatures.githubExport, pro: proFeatures.githubExport, team: teamFeatures.githubExport, selfHosted: selfHostedFeatures.githubExport },
    { label: 'Figma import/export', free: freeFeatures.figmaExport, pro: proFeatures.figmaExport, team: teamFeatures.figmaExport, selfHosted: selfHostedFeatures.figmaExport },
    { label: 'NPM publish', free: freeFeatures.npmPublish, pro: proFeatures.npmPublish, team: teamFeatures.npmPublish, selfHosted: selfHostedFeatures.npmPublish },
    
    { label: 'Platform', free: '', pro: '', team: '', selfHosted: '', isHeader: true },
    { label: 'Version history', free: freeFeatures.versionHistory, pro: proFeatures.versionHistory, team: teamFeatures.versionHistory, selfHosted: selfHostedFeatures.versionHistory },
    { label: 'AI chat assistant', free: freeFeatures.aiChat, pro: proFeatures.aiChat, team: teamFeatures.aiChat, selfHosted: selfHostedFeatures.aiChat },
    { label: 'Team collaboration', free: freeFeatures.teamMembers, pro: proFeatures.teamMembers, team: teamFeatures.teamMembers, selfHosted: selfHostedFeatures.teamMembers },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-4 px-6 font-semibold text-sm">Feature</th>
            <th className="text-center py-4 px-6 font-semibold text-sm bg-primary/10 border-l-2 border-r-2 border-primary/20">
              <div className="flex items-center justify-center gap-2">
                Free
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">Current</span>
              </div>
            </th>
            <th className="text-center py-4 px-6 font-semibold text-sm">Pro</th>
            <th className="text-center py-4 px-6 font-semibold text-sm">Team</th>
            <th className="text-center py-4 px-6 font-semibold text-sm">Self-hosted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.isHeader) {
              return (
                <tr key={idx} className="border-t border-border">
                  <td className="py-3 px-6 font-semibold text-sm bg-muted/20">{row.label}</td>
                  <td className="py-3 px-6 font-semibold text-sm bg-muted/20 border-l-2 border-r-2 border-primary/20"></td>
                  <td className="py-3 px-6 font-semibold text-sm bg-muted/20"></td>
                  <td className="py-3 px-6 font-semibold text-sm bg-muted/20"></td>
                  <td className="py-3 px-6 font-semibold text-sm bg-muted/20"></td>
                </tr>
              );
            }
            return (
              <tr key={idx} className="border-t border-border hover:bg-muted/10">
                <td className="py-3 px-6 text-sm">{row.label}</td>
                <td className="py-3 px-6 text-sm text-center tabular-nums bg-primary/5 border-l-2 border-r-2 border-primary/20">
                  <span className={row.free === '—' ? 'text-muted-foreground' : row.free === '✓' ? 'text-green-600' : ''}>{row.free}</span>
                </td>
                <td className="py-3 px-6 text-sm text-center tabular-nums">
                  <span className={row.pro === '—' ? 'text-muted-foreground' : row.pro === '✓' ? 'text-green-600' : ''}>{row.pro}</span>
                </td>
                <td className="py-3 px-6 text-sm text-center tabular-nums">
                  <span className={row.team === '—' ? 'text-muted-foreground' : row.team === '✓' ? 'text-green-600' : ''}>{row.team}</span>
                </td>
                <td className="py-3 px-6 text-sm text-center tabular-nums">
                  <span className={row.selfHosted === '—' ? 'text-muted-foreground' : row.selfHosted === '✓' ? 'text-green-600' : ''}>{row.selfHosted}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
