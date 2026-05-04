'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Moon, Sun } from '@carbon/icons-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppTheme } from '@/components/providers/AppThemeProvider';

export function UserMenu() {
  const { data: session, status } = useSession();
  const appTheme = useAppTheme();

  if (status === 'loading') {
    return <div className="w-28 h-8 rounded-md bg-muted animate-pulse" />;
  }

  if (!session?.user) return null;

  const initials =
    session.user.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?';

  const isSharedDemo = session.demoMode === true;

  const handleLeaveDemo = async () => {
    await signOut({ redirect: false });
    window.location.href = '/landing';
  };

  const showAppearanceToggle =
    appTheme?.configured &&
    appTheme.hasDarkPair &&
    appTheme.themeColorMode === null;

  if (isSharedDemo) {
    return (
      <button
        type="button"
        onClick={handleLeaveDemo}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline px-2"
      >
        Leave demo
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
            {initials}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <>
          {showAppearanceToggle && appTheme && (
            <>
              <DropdownMenuItem
                onClick={() => appTheme.setPrefersDark(!appTheme.prefersDark)}
                className="flex items-center gap-2"
              >
                {appTheme.prefersDark ? (
                  <>
                    <Sun size={14} />
                    Switch to light mode
                  </>
                ) : (
                  <>
                    <Moon size={14} />
                    Switch to dark mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <Link href="/settings" passHref legacyBehavior>
            <DropdownMenuItem asChild>
              <a>Settings</a>
            </DropdownMenuItem>
          </Link>
          <Link href="/account" passHref legacyBehavior>
            <DropdownMenuItem asChild>
              <a>Account</a>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}>
            Sign out
          </DropdownMenuItem>
        </>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ButtonLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: 'default' | 'outline';
}) {
  const className =
    variant === 'default'
      ? 'text-xs font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90'
      : 'text-xs font-medium rounded-md px-3 py-1.5 border border-border hover:bg-accent';
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
