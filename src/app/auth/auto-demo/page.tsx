import { notFound } from 'next/navigation';
import { isDemoMode } from '@/lib/auth/demo';
import { AutoDemoClient } from './AutoDemoClient';

interface AutoDemoPageProps {
  searchParams: { callbackUrl?: string };
}

export default function AutoDemoPage({ searchParams }: AutoDemoPageProps) {
  if (!isDemoMode()) {
    notFound();
  }

  const callbackUrl = searchParams.callbackUrl ?? '/collections';

  return <AutoDemoClient callbackUrl={callbackUrl} />;
}
