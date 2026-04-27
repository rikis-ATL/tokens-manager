import { redirect } from 'next/navigation';
import { DemoLanding } from '@/components/demo/DemoLanding';

export default function Home() {
  if (process.env.DEMO_MODE === 'true') {
    return <DemoLanding />;
  }
  redirect('/collections');
}
