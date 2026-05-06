'use client';

// src/components/billing/UsageBadge.tsx
// Phase 23 D-08 — Header badge: org, tier, collections, tokens (sum across org), monthly exports.
// Data from GET /api/org/usage (live DB aggregation). Clicks open UpgradeModal for the limit nearest its cap.
// "Exports" = Figma + GitHub export actions / month (not in-app build/preview), see checkAndIncrementExport.

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useUpgradeModal } from './UpgradeModalProvider';

type Plan = 'free' | 'pro' | 'team';

interface UsagePayload {
  orgName: string;
  plan: Plan;
  collectionCount: number;
  collectionMax: number | null;
  tokenCount: number;
  tokenMax: number | null;
  exportsThisMonth: number;
  exportsMax: number | null;
}

function fmt(n: number | null): string {
  return n === null ? '∞' : String(n);
}

function usageRatio(used: number, max: number | null): number {
  if (max === null) return 0;
  if (max <= 0) return 0;
  return used / max;
}

type LimitResource = 'collections' | 'tokens' | 'exports';

/**
 * Picks the limit under highest pressure (for upgrade modal). Team tier: all max null → ratios 0 → tokens.
 */
function pickTightestLimit(usage: UsagePayload): { resource: LimitResource; current: number; max: number } {
  const candidates: Array<{
    resource: LimitResource;
    ratio: number;
    current: number;
    max: number;
  }> = [
    {
      resource: 'collections',
      ratio: usageRatio(usage.collectionCount, usage.collectionMax),
      current: usage.collectionCount,
      max: usage.collectionMax ?? 0,
    },
    {
      resource: 'tokens',
      ratio: usageRatio(usage.tokenCount, usage.tokenMax),
      current: usage.tokenCount,
      max: usage.tokenMax ?? 0,
    },
    {
      resource: 'exports',
      ratio: usageRatio(usage.exportsThisMonth, usage.exportsMax),
      current: usage.exportsThisMonth,
      max: usage.exportsMax ?? 0,
    },
  ];

  const sorted = [...candidates].sort((a, b) => b.ratio - a.ratio);
  const top = sorted[0];
  if (top && top.ratio > 0) {
    return { resource: top.resource, current: top.current, max: top.max };
  }
  // match legacy behaviour when nothing is “full”: prefer tokens
  return {
    resource: 'tokens',
    current: usage.tokenCount,
    max: usage.tokenMax ?? 0,
  };
}

export function UsageBadge() {
  const { openUpgradeModal } = useUpgradeModal();
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/org/usage')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((data: UsagePayload) => { if (!cancelled) setUsage(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="text-xs px-2.5 py-1 rounded-full border border-warning text-warning bg-warning/10">
        Usage unavailable
      </div>
    );
  }
  if (!usage) {
    return (
      <div className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-background">
        Loading usage...
      </div>
    );
  }

  const handleClick = () => {
    const { resource, current, max } = pickTightestLimit(usage);
    openUpgradeModal({ resource, current, max, tier: usage.plan });
  };

  const usageHint =
    'Plan usage: collections, design tokens (sum across all collections), and Figma or GitHub export actions this month (UTC). In-app “Build” / local preview does not count toward the export limit.';

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="usage-badge"
      title={usageHint}
      className="text-left cursor-pointer bg-transparent border-none p-0"
    >
      <Badge className="flex items-center flex-wrap justify-end gap-x-2 gap-y-0.5 text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent transition-colors max-w-[min(100%,42rem)]">
        <span className="font-medium text-foreground shrink-0">{usage.orgName}</span>
        <span className="text-muted-foreground shrink-0">·</span>
        <span className="capitalize text-muted-foreground shrink-0">{usage.plan}</span>
        {/* <span className="text-muted-foreground shrink-0" aria-hidden>|</span> */}
        {/* <span className="text-muted-foreground shrink-0">
          {usage.collectionCount}/{fmt(usage.collectionMax)} collections
        </span>
        <span className="text-muted-foreground shrink-0" aria-hidden>|</span>
        <span className="text-muted-foreground shrink-0">
          {usage.tokenCount}/{fmt(usage.tokenMax)} tokens
        </span>
        <span className="text-muted-foreground shrink-0" aria-hidden>|</span>
        <span className="text-muted-foreground shrink-0">
          {usage.exportsThisMonth}/{fmt(usage.exportsMax)} exports
        </span> */}
      </Badge>
    </button>
  );
}
