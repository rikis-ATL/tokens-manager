'use client';

import { useEffect, useState } from 'react';

type ConfigState = {
  configured: boolean;
  collectionId: string | null;
} | null;

export function AppThemeAdminSection() {
  const [state, setState] = useState<ConfigState>(null);

  useEffect(() => {
    fetch('/api/app-theme/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ConfigState) => setState(data))
      .catch(() => setState({ configured: false, collectionId: null }));
  }, []);

  if (state === null) {
    return <p className="text-sm text-muted-foreground">Loading app theme status…</p>;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        The app shell reads semantic colors from a single designated collection (users do not pick which
        collection). Add a <code className="rounded bg-muted px-1 py-0.5 text-xs">shadcn</code> token group
        whose leaves match the bridge in{' '}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/appTheme/shadcn-bridge.ts</code>.
      </p>
      {state.configured && state.collectionId ? (
        <p className="text-sm text-foreground">
          <span className="font-medium">Active collection id:</span>{' '}
          <span className="font-mono text-xs break-all">{state.collectionId}</span>
        </p>
      ) : (
        <p className="text-sm text-warning">
          Set <code className="rounded bg-muted px-1 py-0.5 text-xs">APP_THEME_COLLECTION_ID</code> in the
          server environment to a MongoDB collection id, then restart the app.
        </p>
      )}
    </div>
  );
}
