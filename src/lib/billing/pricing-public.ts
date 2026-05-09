/**
 * Human-readable pricing rows for marketing (landing). Values come from LIMITS only.
 */
import { LIMITS, FEATURE_FLAGS, type PlanTier } from '@/lib/billing/tiers';

function fmt(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n);
}

export function formatLimitValue(
  key: keyof typeof LIMITS.free,
  tier: PlanTier,
): string {
  const v = LIMITS[tier][key];
  return fmt(v as number);
}

export function getPlanTierLimitsForDisplay(tier: PlanTier) {
  const L = LIMITS[tier];
  return {
    collections: fmt(L.maxCollections),
    themesPerCollection: fmt(L.maxThemesPerCollection),
    tokens: fmt(L.maxTokensTotal),
    exportsPerMonth: fmt(L.maxExportsPerMonth),
    requestsPerMinute: fmt(L.rateLimitPerMinute),
  };
}

export function getPlanFeaturesForDisplay(tier: PlanTier | 'selfHosted') {
  const features = FEATURE_FLAGS[tier];
  return {
    githubExport: features.githubExport ? '✓' : '—',
    figmaExport: features.figmaExport ? '✓' : '—',
    npmPublish: features.npmPublish ? '✓' : '—',
    versionHistory: features.versionHistory ? '✓' : '—',
    aiChat: features.aiChat ? '✓' : '—',
    teamMembers: features.teamMembers ? '✓' : '—',
    graphEditor: features.graphEditor ? '✓' : '—',
    mathNodes: features.mathNodes ? '✓' : '—',
    tokenReferences: features.tokenReferences ? '✓' : '—',
    multiFormatExport: features.multiFormatExport ? '✓' : '—',
    bulkOperations: features.bulkOperations ? '✓' : '—',
    colorSwatches: features.colorSwatches ? '✓' : '—',
  };
}
