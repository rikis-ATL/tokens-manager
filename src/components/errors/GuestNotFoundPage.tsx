import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { NotFoundView } from '@/components/errors/NotFoundView';

/** Full-page 404 for signed-out visitors (marketing chrome, no org header). */
export function GuestNotFoundPage() {
  return (
    <div
      data-marketing="true"
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <MarketingHeader showBack={false} />
      <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto">
        <NotFoundView variant="guest" />
      </main>
    </div>
  );
}
