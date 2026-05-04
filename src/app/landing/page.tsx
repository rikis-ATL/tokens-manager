import { notFound } from 'next/navigation';
import { DemoLanding } from '@/components/demo/DemoLanding';

export default function LandingPage() {
  if (process.env.DEMO_MODE !== 'true') {
    notFound();
  }

  const playgroundId = process.env.PLAYGROUND_COLLECTION_ID;
  const demoUrl = playgroundId
    ? `/auth/auto-demo?callbackUrl=${encodeURIComponent(`/collections/${playgroundId}/tokens`)}`
    : '/auth/auto-demo';

  return <DemoLanding demoUrl={demoUrl} />;
}
