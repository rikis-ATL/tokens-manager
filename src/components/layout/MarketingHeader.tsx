'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@carbon/icons-react';
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
    <header className="sticky top-0 z-50 flex min-h-[52px] shrink-0 items-center justify-between border-b border-border bg-background/85 px-5 py-3 text-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-md outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="tokenflow home"
      >
        <Image
          src="/tokenflow-light.svg"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0"
          priority
          unoptimized
        />
        <span className="text-sm font-semibold tracking-wide text-foreground">tokenflow</span>
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
