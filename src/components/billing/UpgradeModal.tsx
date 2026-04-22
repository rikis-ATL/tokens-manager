'use client';

// src/components/billing/UpgradeModal.tsx
// Phase 23 D-04 — Full tier comparison UI. "Upgrade to Pro" CTA present but disabled until Phase 24.

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LIMITS, type PlanTier } from '@/lib/billing/tiers';
import type { LimitPayload } from './UpgradeModalProvider';

const TIER_ORDER: PlanTier[] = ['free', 'pro', 'team'];

function fmtLimit(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n);
}

export function UpgradeModal({ payload, onClose }: { payload: LimitPayload; onClose: () => void }) {
  const router = useRouter();
  const currentTier = (payload.tier as PlanTier) ?? 'free';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="upgrade-modal">
        <DialogHeader>
          <DialogTitle>You've hit your {payload.resource} limit</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">
          Your <strong>{currentTier}</strong> plan allows {payload.max} {payload.resource}. You're currently using {payload.current}. Upgrade to continue.
        </div>

        <div className="grid grid-cols-3 gap-3" role="table">
          {TIER_ORDER.map((tier) => {
            const isCurrent = tier === currentTier;
            return (
              <div
                key={tier}
                data-tier={tier}
                data-current={isCurrent ? 'true' : 'false'}
                className={`rounded-md border p-3 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border'}`}
                role="cell"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold capitalize">{tier}</h3>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>{fmtLimit(LIMITS[tier].maxCollections)} collections</li>
                  <li>{fmtLimit(LIMITS[tier].maxThemesPerCollection)} themes / collection</li>
                  <li>{fmtLimit(LIMITS[tier].maxTokensTotal)} tokens</li>
                  <li>{fmtLimit(LIMITS[tier].maxExportsPerMonth)} exports / month</li>
                  <li>{LIMITS[tier].rateLimitPerMinute} req / min</li>
                </ul>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={() => { onClose(); router.push('/upgrade'); }}
            data-testid="upgrade-cta"
          >
            View Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
