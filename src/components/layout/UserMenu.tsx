'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
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

  // Loading skeleton — prevents layout shift while session hydrates
  if (status === 'loading') {
    return <div className="w-28 h-8 rounded-md bg-muted animate-pulse" />;
  }

  // No session — render nothing (Phase 18 will redirect unauthenticated users before they see this)
  if (!session?.user) return null;

  const initials =
    session.user.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?';

  const isDemoUser = session.user.role === 'Demo';

  const handleExitDemo = () => {
    // Reload page to clear demo session
    window.location.href = '/collections';
  };

  const showAppearanceToggle =
    appTheme?.configured &&
    appTheme.hasDarkPair &&
    appTheme.themeColorMode === null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
            {initials}
          </span>
          {/* <span className="text-sm text-foreground max-w-[120px] truncate">
            {session.user.name}
          </span> */}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isDemoUser ? (
          <DropdownMenuItem onClick={handleExitDemo}>
            Exit Demo
          </DropdownMenuItem>
        ) : (
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/sign-in' })}>
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
