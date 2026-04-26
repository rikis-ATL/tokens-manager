'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  FileOutput,
  GitBranch,
  Layers,
  Palette,
  SlidersHorizontal,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CollectionSidebarProps {
  collectionId: string;
  collectionName: string;
}

export function CollectionSidebar({ collectionId, collectionName: _collectionName }: CollectionSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  const navItems = [
    { href: `/collections/${collectionId}/tokens`, label: 'Tokens', icon: Palette },
    { href: `/collections/${collectionId}/themes`, label: 'Themes', icon: Layers },
    { href: `/collections/${collectionId}/output`, label: 'Output', icon: FileOutput },
    { href: `/collections/${collectionId}/versions`, label: 'Versions', icon: GitBranch },
    { href: `/collections/${collectionId}/settings`, label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside className={`h-full bg-background border-r border-muted flex flex-col transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-12' : 'w-[200px]'}`}>

        {/* Nav items */}
        <nav className="flex-1 px-1.5 py-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            const linkEl = (
              <Link
                key={href}
                href={href}
                className={`flex items-center rounded-md text-sm font-medium w-full transition-colors ${
                  collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && label}
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

        {/* Collapse toggle */}
        <div className={`flex items-center border-t border-muted flex-shrink-0 py-2 ${collapsed ? 'justify-center' : 'px-3 justify-end'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(c => !c)}
                className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors flex-shrink-0"
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
