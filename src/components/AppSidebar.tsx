'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Palette, Settings2, SlidersHorizontal } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Tokens', icon: Palette },
  { href: '/configuration', label: 'Configuration', icon: Settings2 },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* App name */}
      <div className="px-4 py-4">
        <span className="text-gray-900 font-semibold text-sm tracking-wide">ATUI Tokens</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
