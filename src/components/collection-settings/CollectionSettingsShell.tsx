'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CollectionSettingsProvider, useCollectionSettings } from './CollectionSettingsContext';

const navLinkClass =
  'block rounded-md px-3 py-2 text-sm font-medium transition-colors border border-transparent';
const navActiveClass = 'bg-muted text-foreground border-border';
const navInactiveClass = 'text-muted-foreground hover:bg-background hover:text-foreground';

function SettingsHeader() {
  const {
    collectionName,
    saveStatus,
    collectionId,
    canManageVersions,
    canPublishNpm,
  } = useCollectionSettings();

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      <h1 className="text-xl font-semibold text-foreground">Settings: {collectionName}</h1>
      {(canManageVersions || canPublishNpm) && (
        <Link
          href={`/collections/${collectionId}/versions`}
          className="text-sm text-primary hover:underline"
        >
          Versions &amp; NPM publish
        </Link>
      )}
      {saveStatus === 'saving' && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          <span className="inline-block w-3 h-3 border-2 border-border border-t-transparent rounded-full animate-spin" />
          Saving...
        </span>
      )}
      {saveStatus === 'saved' && (
        <span className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
          <span className="inline-block w-2 h-2 bg-success rounded-full" />
          Saved
        </span>
      )}
      {saveStatus === 'error' && (
        <span className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
          <span className="inline-block w-2 h-2 bg-destructive rounded-full" />
          Error saving
        </span>
      )}
    </div>
  );
}

function SettingsNav({ collectionId }: { collectionId: string }) {
  const pathname = usePathname();
  const { canPublishNpm, canManageVersions, isAdmin } = useCollectionSettings();

  const base = `/collections/${collectionId}/settings`;
  const items: { href: string; label: string }[] = [
    { href: `${base}/figma`, label: 'Figma' },
    { href: `${base}/github`, label: 'GitHub' },
  ];

  if (canPublishNpm || canManageVersions) {
    items.push({ href: `${base}/npm`, label: 'NPM' });
  }

  if (isAdmin) {
    items.push({ href: `${base}/playground`, label: 'Playground' });
  }

  items.push({ href: `${base}/embed`, label: 'Embed' });

  return (
    <nav className="w-52 shrink-0 border-r border-border pr-4" aria-label="Settings sections">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
        Integrations
      </p>
      <ul className="space-y-0.5">
        {items.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(navLinkClass, active ? navActiveClass : navInactiveClass)}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SettingsMain({ children }: { children: React.ReactNode }) {
  const { loading } = useCollectionSettings();

  if (loading) {
    return (
      <div className="flex-1 min-w-0">
        <SettingsHeader />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 max-w-2xl">
      <SettingsHeader />
      {children}
    </div>
  );
}

function SettingsLayoutInner({
  collectionId,
  children,
}: {
  collectionId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 flex gap-8 items-start">
      <SettingsNav collectionId={collectionId} />
      <SettingsMain>{children}</SettingsMain>
    </div>
  );
}

export function CollectionSettingsShell({
  collectionId,
  children,
}: {
  collectionId: string;
  children: React.ReactNode;
}) {
  return (
    <CollectionSettingsProvider collectionId={collectionId}>
      <SettingsLayoutInner collectionId={collectionId}>{children}</SettingsLayoutInner>
    </CollectionSettingsProvider>
  );
}
