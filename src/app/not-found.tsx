import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { GuestNotFoundPage } from '@/components/errors/GuestNotFoundPage';
import { NotFoundView } from '@/components/errors/NotFoundView';

export default async function NotFound() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <GuestNotFoundPage />;
  }

  return (
    <div className="flex min-h-[50vh] flex-1 items-center justify-center">
      <NotFoundView variant="app" />
    </div>
  );
}
