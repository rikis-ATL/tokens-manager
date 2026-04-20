// src/components/billing/useUpgradeModal.ts
// Hook-only module — re-exports the hook. Separated so non-React imports do not pull the Provider.
export { useUpgradeModal } from './UpgradeModalProvider';
export type { LimitPayload } from './UpgradeModalProvider';
