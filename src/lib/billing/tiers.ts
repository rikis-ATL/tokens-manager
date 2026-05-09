// src/lib/billing/tiers.ts
// Phase 23 — Single source of truth for all tier caps (BILLING-01, D-01, D-15).
// NO other file in the codebase is allowed to hardcode a limit number.

import type { PlanTier } from '@/lib/db/models/Organization';

export type { PlanTier };

export interface TierLimits {
  maxCollections: number;
  maxThemesPerCollection: number;
  maxTokensTotal: number;       // across all org collections (D-07)
  maxExportsPerMonth: number;
  rateLimitPerMinute: number;   // per user ID (D-11)
}

export const LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    maxCollections: 1,
    maxThemesPerCollection: 0,
    maxTokensTotal: 500,
    maxExportsPerMonth: 10,
    rateLimitPerMinute: 60,
  },
  pro: {
    maxCollections: 10,
    maxThemesPerCollection: 2,
    maxTokensTotal: 1000,
    maxExportsPerMonth: 200,
    rateLimitPerMinute: 120,
  },
  team: {
    maxCollections: Infinity,
    maxThemesPerCollection: Infinity,
    maxTokensTotal: Infinity,
    maxExportsPerMonth: Infinity,
    rateLimitPerMinute: 300,
  },
};

export interface TierFeatures {
  githubExport: boolean;
  figmaExport: boolean;
  npmPublish: boolean;
  versionHistory: boolean;
  aiChat: boolean;
  teamMembers: boolean;
  graphEditor: boolean;
  mathNodes: boolean;
  tokenReferences: boolean;
  multiFormatExport: boolean;
  bulkOperations: boolean;
  colorSwatches: boolean;
}

export const FEATURE_FLAGS: Record<PlanTier | 'selfHosted', TierFeatures> = {
  free: {
    githubExport: false,
    figmaExport: false,
    npmPublish: false,
    versionHistory: true,
    aiChat: false,
    teamMembers: false,
    graphEditor: true,
    mathNodes: true,
    tokenReferences: true,
    multiFormatExport: true,
    bulkOperations: true,
    colorSwatches: true,
  },
  pro: {
    githubExport: true,
    figmaExport: true,
    npmPublish: true,
    versionHistory: true,
    aiChat: true,
    teamMembers: false,
    graphEditor: true,
    mathNodes: true,
    tokenReferences: true,
    multiFormatExport: true,
    bulkOperations: true,
    colorSwatches: true,
  },
  team: {
    githubExport: true,
    figmaExport: true,
    npmPublish: true,
    versionHistory: true,
    aiChat: true,
    teamMembers: true,
    graphEditor: true,
    mathNodes: true,
    tokenReferences: true,
    multiFormatExport: true,
    bulkOperations: true,
    colorSwatches: true,
  },
  selfHosted: {
    githubExport: true,
    figmaExport: true,
    npmPublish: true,
    versionHistory: true,
    aiChat: true,
    teamMembers: true,
    graphEditor: true,
    mathNodes: true,
    tokenReferences: true,
    multiFormatExport: true,
    bulkOperations: true,
    colorSwatches: true,
  },
};
