'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { InProgress } from '@carbon/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextAnimNavigators } from '@/components/ui/motion/text-anim-navigators';
import { AuthMarketingSplitLayout } from '@/components/auth/AuthMarketingSplitLayout';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/collections';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery) setEmail(fromQuery);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    // Guard against both ok:false AND known NextAuth v4 bug where ok:true with error can occur simultaneously
    if (!result?.ok || result?.error) {
      setError(result?.error ?? 'Sign-in failed. Please try again.');
      return;
    }

    router.push(callbackUrl);
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
            Your central token store for all projects.
            <br />
             Edit visually and ship to design and code.
            </p>
          </div>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
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
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-foreground hover:underline">
                Sign up
              </Link>
            </p>
          </div>

      </div>
    </AuthMarketingSplitLayout>
  );
}
