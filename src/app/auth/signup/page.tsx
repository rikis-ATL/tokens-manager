'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { InProgress } from '@carbon/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextAnimNavigators } from '@/components/ui/motion/text-anim-navigators';
import { AuthMarketingSplitLayout } from '@/components/auth/AuthMarketingSplitLayout';

export default function SignupPage() {
  const router = useRouter();

  const [orgName, setOrgName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgName, displayName, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? 'Signup failed. Please try again.');
      setLoading(false);
      return;
    }

    // Auto sign-in using the credentials just registered
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (!result?.ok || result?.error) {
      setError('Account created but auto sign-in failed. Please sign in manually.');
      router.push('/auth/sign-in');
      return;
    }

    router.push('/');
  };

  return (
    <AuthMarketingSplitLayout>
      <div className="flex flex-col gap-8 p-10">
        <div className="flex flex-col gap-4 items-start text-left">
          <Link
            href="/"
            className="inline-flex gap-2 justify-center items-center mb-3 rounded-md transition-opacity outline-none ring-offset-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="tokenflow home"
          >
            <Image
              src="/tokenflow-light.svg"
              alt=""
              width={28}
              height={28}
              className="w-7 h-7 shrink-0"
              priority
              unoptimized
            />
            <span className="text-2xl font-bold text-foreground">tokenflow</span>
          </Link>

          <div className="flex flex-col col-span-4 gap-8 min-h-48">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
              <TextAnimNavigators
                content="The visual editor and library for design tokens at scale."
                delay={0}
                highlight="background"
              />
            </h1>
            <p className="text-xl text-muted-foreground">
            Your central token library for design and code.
            <br />
            Edit visually, sync and deploy.
            <br/>
             <span className='text-foreground'>
             Create your organization to get started
             </span>
            </p>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="orgName" className="text-sm font-medium text-foreground">
                Organization name
              </label>
              <Input
                id="orgName"
                type="text"
                autoComplete="organization"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                Your name
              </label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="h-11"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg border bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="mt-2 w-full h-11 text-md">
              {loading ? (
                <>
                  <InProgress size={16} className="mr-2 animate-spin shrink-0" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthMarketingSplitLayout>
  );
}
