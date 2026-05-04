import { redirect } from 'next/navigation';

export default function Home() {
  if (process.env.DEMO_MODE === 'true') {
    const playgroundId = process.env.PLAYGROUND_COLLECTION_ID;
    const callbackUrl = playgroundId
      ? `/collections/${playgroundId}/tokens?graph=full`
      : '/collections';
    redirect(`/auth/auto-demo?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  redirect('/collections');
}
