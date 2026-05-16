import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';

export default async function Home() {
  if (process.env.DEMO_MODE === 'true') {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect('/collections');
    }
    redirect('/landing');
  }
  redirect('/collections');
}
