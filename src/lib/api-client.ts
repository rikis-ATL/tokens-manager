// src/lib/api-client.ts
// Phase 23 D-05 — Central 402 interceptor. When a capped API route returns 402 with the
// LIMIT_EXCEEDED payload (D-02), invoke the upgrade-modal callback registered by the provider.

export interface LimitExceededPayload {
  code: 'LIMIT_EXCEEDED';
  resource: string;
  current: number;
  max: number;
  tier: string;
}

type UpgradeCallback = (payload: Omit<LimitExceededPayload, 'code'>) => void;

let callback: UpgradeCallback | null = null;

/** Called by UpgradeModalProvider on mount. */
export function setUpgradeModalCallback(cb: UpgradeCallback | null): void {
  callback = cb;
}

/**
 * Thin fetch wrapper. Intercepts 402 LIMIT_EXCEEDED responses and triggers the registered
 * callback so the global UpgradeModal opens. Non-402 responses pass through unchanged.
 *
 * 429 responses are intentionally NOT intercepted (D-03) — per-route code handles those
 * (typically via a sonner toast).
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 402) {
    try {
      const clone = res.clone();
      const body = await clone.json() as Partial<LimitExceededPayload>;
      if (body?.code === 'LIMIT_EXCEEDED' && callback && typeof body.resource === 'string' &&
          typeof body.current === 'number' && typeof body.max === 'number' && typeof body.tier === 'string') {
        callback({
          resource: body.resource,
          current: body.current,
          max: body.max,
          tier: body.tier,
        });
      }
    } catch {
      // Non-JSON 402 — leave to caller
    }
  }
  return res;
}
