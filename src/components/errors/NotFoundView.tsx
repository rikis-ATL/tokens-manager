import Link from 'next/link';
import { Button } from '@/components/ui/button';

type NotFoundViewProps = {
  variant: 'app' | 'guest';
};

export function NotFoundView({ variant }: NotFoundViewProps) {
  const isGuest = variant === 'guest';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <p className="text-8xl font-bold tabular-nums tracking-tight text-foreground/90">
        404
      </p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          {isGuest
            ? 'This page does not exist or you may need to sign in to access it.'
            : 'The page you are looking for does not exist or may have been moved.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isGuest ? (
          <>
            <Button asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link href="/collections">Go to collections</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
