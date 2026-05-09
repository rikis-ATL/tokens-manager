'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ConfigState = {
  configured: boolean;
  collectionId: string | null;
} | null;

export function AppThemeAdminSection() {
  const [state, setState] = useState<ConfigState>(null);

  useEffect(() => {
    fetch('/api/app-theme/config', { cache: 'no-store' })
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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Active collection</p>
              <span className="font-mono text-xs break-all text-foreground">{state.collectionId}</span>
            </div>
            <Link
              href={`/collections/${state.collectionId}/tokens`}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Edit collection →
            </Link>
          </div>

          <div className="rounded border border-muted bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">To change the default theme demo users see:</span>{' '}
              open the collection, make sure <span className="font-medium">Playground mode is off</span> (Settings → Playground),
              edit your tokens, and save. Changes persist to the database and apply immediately to all users.
            </p>
            <p>
              While editing, the app shell previews your unsaved changes in real time.
              Disabling playground mode is required for edits to persist beyond your browser session.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-warning">
          Set <code className="rounded bg-muted px-1 py-0.5 text-xs">APP_THEME_COLLECTION_ID</code> in the
          server environment to a MongoDB collection id, then restart the app.
        </p>
      )}
    </div>
  );
}
