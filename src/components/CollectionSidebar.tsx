'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, Palette, Settings2, SlidersHorizontal } from 'lucide-react';

interface CollectionSidebarProps {
  collectionId: string;
  collectionName: string;
}

export function CollectionSidebar({ collectionId, collectionName }: CollectionSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: `/collections/${collectionId}/tokens`, label: 'Tokens', icon: Palette },
    { href: `/collections/${collectionId}/config`, label: 'Config', icon: Settings2 },
    { href: `/collections/${collectionId}/settings`, label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <aside className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Top section */}
      <div className="px-4 py-4">
        {/* App name / logo — navigates to /collections */}
        <Link href="/collections" className="block mb-2">
          <span className="text-gray-900 font-semibold text-sm tracking-wide">ATUI Tokens</span>
        </Link>

        {/* Collections back link */}
        <Link
          href="/collections"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3"
        >
          <ChevronLeft size={14} />
          Collections
        </Link>

        {/* Collection name label */}
        <span className="text-gray-900 font-semibold text-sm truncate block">
          {collectionName}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
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
