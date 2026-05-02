'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Grid,
  SettingsAdjust,
  ChevronLeft,
  ChevronRight,
  UserMultiple,
  UserAvatar,
} from '@carbon/icons-react';
import { useDbStatus } from './OrgHeader';
import { usePermissions } from '@/context/PermissionsContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function OrgSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const db = useDbStatus();
  const { isAdmin } = usePermissions();

  const isConnected = db.state === 'connected';
  const isLoading = db.state === 'loading';
  const navItems = [
    {
      href: '/collections',
      label: 'Collections',
      icon: Grid,
      badge: null,
    },
    {
      href: '/account',
      label: 'Account',
      icon: UserAvatar,
      badge: null,
    },
    ...(isAdmin ? [
      {
        href: '/settings',
        label: 'Settings',
        icon: SettingsAdjust,
        badge: (
          <span
            title={isLoading ? 'Connecting...' : db.label}
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isLoading
                ? 'bg-muted animate-pulse'
                : isConnected
                  ? 'bg-success'
                  : 'bg-warning'
            }`}
          />
        ),
      },
      { href: '/org/users', label: 'Users', icon: UserMultiple, badge: null },
    ] : []),
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={`h-full bg-background border-r border-muted flex flex-col transition-all duration-200 flex-shrink-0 ${
          collapsed ? 'w-12' : 'w-[180px]'
        }`}
      >
        {/* Nav */}
        <nav className="flex-1 px-1.5 py-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || (href === '/collections' && pathname.startsWith('/collections'));
            const linkEl = (
              <Link
                key={href}
                href={href}
                className={`flex items-center rounded-md text-sm font-medium w-full transition-colors ${
                  collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between gap-2">
                    {label}
                    {badge}
                  </span>
                )}
                {collapsed && badge && (
                  <span className="absolute ml-5 mt-3">{badge}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkEl;
          })}
        </nav>

        {/* Collapse toggle — bottom of sidebar */}
        <div className={`flex items-center border-t border-muted flex-shrink-0 py-2 ${collapsed ? 'justify-center' : 'px-3 justify-end'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
