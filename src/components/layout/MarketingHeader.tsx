'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MarketingHeaderProps = {
  backFallbackHref?: string;
  /** Hide the back control (e.g. on the demo landing entry). */
  showBack?: boolean;
};

export function MarketingHeader({
  backFallbackHref = '/collections',
  showBack = true,
}: MarketingHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(backFallbackHref);
    }
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-muted bg-background text-foreground flex-shrink-0 min-h-[52px]">
      <Link
        href="/"
        className="text-sm font-semibold text-foreground tracking-wide hover:text-muted-foreground transition-colors"
      >
        Design Token Manager
      </Link>
      {showBack ? (
        <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft size={14} />
          Back
        </Button>
      ) : (
        <span className="w-16" aria-hidden />
      )}
    </header>
  );
}
