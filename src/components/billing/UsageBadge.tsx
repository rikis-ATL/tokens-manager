'use client';

// src/components/billing/UsageBadge.tsx
// Phase 23 D-08 — Compact header badge: "OrgName · tier | tokens/max | exports/max".
// Click → opens UpgradeModal with the current (token or export) payload — prioritises whichever is closer to cap.

import { useEffect, useState } from 'react';
import { useUpgradeModal } from './UpgradeModalProvider';

interface UsagePayload {
  orgName: string;
  plan: 'free' | 'pro' | 'team';
  tokenCount: number;
  tokenMax: number | null;
  exportsThisMonth: number;
  exportsMax: number | null;
}

function fmt(n: number | null): string {
  return n === null ? '∞' : String(n);
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
      <div className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-muted/50">
        Loading usage...
      </div>
    );
  }

  const handleClick = () => {
    // Pick the tighter of (tokens, exports) as the modal context.
    const tokenRatio = usage.tokenMax === null ? 0 : usage.tokenCount / usage.tokenMax;
    const exportRatio = usage.exportsMax === null ? 0 : usage.exportsThisMonth / usage.exportsMax;
    const useExports = exportRatio > tokenRatio;
    openUpgradeModal({
      resource: useExports ? 'exports' : 'tokens',
      current: useExports ? usage.exportsThisMonth : usage.tokenCount,
      max: useExports ? (usage.exportsMax ?? 0) : (usage.tokenMax ?? 0),
      tier: usage.plan,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="usage-badge"
      className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent transition-colors"
    >
      <span className="font-medium text-foreground">{usage.orgName}</span>
      <span className="text-muted-foreground">·</span>
      <span className="capitalize text-muted-foreground">{usage.plan}</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground">{usage.tokenCount}/{fmt(usage.tokenMax)} tokens</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground">{usage.exportsThisMonth}/{fmt(usage.exportsMax)} exports</span>
    </button>
  );
}
