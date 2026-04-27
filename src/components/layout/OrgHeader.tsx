'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Info } from 'lucide-react';
import { DATABASE_PROVIDERS } from '@/types/database.types';
import { UserMenu } from '@/components/layout/UserMenu';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TokenGeneratorDocs } from '@/components/tokens/TokenGeneratorDocs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsageBadge } from '@/components/billing/UsageBadge';

type ConnectionState = 'connected' | 'local' | 'loading';

interface DbStatus {
  state: ConnectionState;
  label: string;
}

function useDbStatus(enabled: boolean): DbStatus {
  const [status, setStatus] = useState<DbStatus>({ state: 'loading', label: 'Connecting...' });

  useEffect(() => {
    if (!enabled) return;
    fetch('/api/database/config')
      .then((r) => r.json())
      .then((data) => {
        const provider = data.provider ?? 'local-mongodb';
        const source = data.source ?? 'default';

        const isLocalDefault =
          provider === 'local-mongodb' && source === 'default';

        if (isLocalDefault) {
          setStatus({ state: 'local', label: 'Local (default)' });
          return;
        }

        const info = DATABASE_PROVIDERS.find((p) => p.id === provider);
        const name = info?.name ?? provider;
        setStatus({ state: 'connected', label: name });
      })
      .catch(() => {
        setStatus({ state: 'local', label: 'Unknown' });
      });
  }, [enabled]);

  return status;
}

type OrgHeaderProps = {
  /** When set (collection detail shell), replaces "Token Manager" as the primary title. */
  pageTitle?: string;
  /** Collection is playground mode — show badge next to the title. */
  showPlaygroundBadge?: boolean;
};

export function OrgHeader({ pageTitle, showPlaygroundBadge }: OrgHeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isDemoUser = session?.demoMode === true;
  const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
  const db = useDbStatus(isSuperAdmin);
  const isCollectionDetail = pathname.startsWith('/collections/');
  const [guideOpen, setGuideOpen] = useState(false);
  const mainTitle = pageTitle?.trim() || 'Token Manager';

  return (
    <>
      <header className="flex items-center justify-between px-5 py-3 border-b border-muted bg-background text-foreground flex-shrink-0">
        <div className="flex items-center gap-3">
          {isCollectionDetail && (
            <Link
              href="/collections"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={14} />
            </Link>
          )}
          <Link href="/collections" className="text-sm font-semibold text-foreground tracking-wide hover:text-muted-foreground transition-colors">
            {mainTitle}
          </Link>
          {session?.user?.orgName && (
            <>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="text-sm text-muted-foreground">{session.user.orgName}</span>
            </>
          )}
          {showPlaygroundBadge && (
            <Badge className="bg-warning/10 text-warning border-warning shrink-0">
              Playground
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <UsageBadge />
          {isDemoUser ? <DemoModeBadge /> : <DbPill status={db} />}
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => setGuideOpen(true)}
            title="Generator Guide"
          >
            <Info size={16} />
          </Button>
          <UserMenu />
        </div>
      </header>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Token Generator Guide</DialogTitle>
          </DialogHeader>
          <TokenGeneratorDocs />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DbPill({ status }: { status: DbStatus }) {
  const isLoading = status.state === 'loading';
  const isConnected = status.state === 'connected';

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
      isLoading
        ? 'text-muted-foreground border-muted bg-background'
        : isConnected
          ? 'text-success border-success bg-success/10'
          : 'text-warning border-warning bg-warning/10'
    }`}>
      {isLoading ? (
        <span className="w-2 h-2 rounded-full border border-muted border-t-transparent animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-warning'}`} />
      )}
      <span>{status.label}</span>
    </div>
  );
}

function DemoModeBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors text-warning border-warning bg-warning/10">
      <span className="w-2 h-2 rounded-full bg-warning" />
      <span>Demo Mode</span>
    </div>
  );
}

/** Exported for reuse in OrgSidebar badge. */
export { useDbStatus };
export type { DbStatus, ConnectionState };
