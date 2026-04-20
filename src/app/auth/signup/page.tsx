'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-background">
      <div className="w-full max-w-sm bg-card dark:bg-card rounded-xl shadow-md p-8">
        <h1 className="text-xl font-semibold text-center text-foreground dark:text-foreground mb-1">
          Create your organization
        </h1>
        <p className="text-sm text-center text-muted-foreground dark:text-muted-foreground mb-6">
          Sign up to get started with Token Manager.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="orgName" className="text-sm font-medium text-foreground dark:text-muted-foreground">
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
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground dark:text-muted-foreground">
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
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground dark:text-muted-foreground">
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
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground dark:text-muted-foreground">
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
            />
          </div>

          {error && (
            <p className="text-sm text-destructive dark:text-destructive mt-1">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground dark:text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-foreground dark:text-foreground underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
