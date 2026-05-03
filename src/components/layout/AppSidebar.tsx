'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ColorPalette,
  Settings,
  SettingsAdjust,
  ChevronRight,
  ChevronLeft,
} from '@carbon/icons-react';

const NAV_ITEMS = [
  { href: '/', label: 'Tokens', icon: ColorPalette },
  { href: '/configuration', label: 'Configuration', icon: Settings },
  { href: '/settings', label: 'Settings', icon: SettingsAdjust },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside className={`h-full bg-background border-r border-muted flex flex-col justify-between transition-all duration-200 ${collapsed ? 'w-12' : 'w-[200px]'}`}>


      {/* Nav items */}
      <nav className="flex-1 px-1.5 py-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-md text-menu-item font-medium w-full transition-colors ${
                collapsed ? 'justify-center px-menu-item-x py-menu-item-y' : 'gap-3 px-menu-item-x py-menu-item-y'
              } ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className={`flex items-center border-t border-muted flex-shrink-0 ${collapsed ? 'justify-center py-3' : 'px-4 py-3 justify-between'}`}>
        {!collapsed && (
          <span className="text-foreground font-semibold text-sm tracking-wide truncate">Token Manager</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

    </aside>
  );
}
