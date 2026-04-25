'use client';

import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Columns2, GalleryHorizontal } from 'lucide-react';
import { TokenGroupTree } from '@/components/tokens/TokenGroupTree';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const LAYOUT_STORAGE_KEY = 'tokens-workspace-main-layout';

type MainLayoutMode = 'split' | 'tabs';

export interface CollectionTokensWorkspaceProps {
  groupTree: ComponentProps<typeof TokenGroupTree>;
  onCollapseSidebar: () => void;
  graphPanel: ReactNode;
  /** Group path trail (same row as layout actions). */
  breadcrumb: ReactNode;
  /** Token table / generator (below the breadcrumb row). */
  mainContent: ReactNode;
}

function readStoredLayout(): MainLayoutMode {
  if (typeof window === 'undefined') return 'split';
  try {
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (v === 'tabs' || v === 'split') return v;
  } catch {
    /* ignore */
  }
  return 'split';
}

/**
 * Tokens tab layout: group tree sidebar, token form (table), and graph — split or tabbed.
 * Layout controls share one row with the group breadcrumb to save vertical space.
 */
export function CollectionTokensWorkspace({
  groupTree,
  onCollapseSidebar,
  graphPanel,
  breadcrumb,
  mainContent,
}: CollectionTokensWorkspaceProps) {
  const [layoutMode, setLayoutMode] = useState<MainLayoutMode>('split');

  useEffect(() => {
    setLayoutMode(readStoredLayout());
  }, []);

  const persistLayout = useCallback((mode: MainLayoutMode) => {
    setLayoutMode(mode);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const breadcrumbActionsRow = (actions: ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
      <div className="min-w-0 flex-1">{breadcrumb}</div>
      <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden">
      <aside className="border-r border-muted bg-background flex-shrink-0 flex flex-col transition-all duration-200 w-56">
        <div className="flex flex-col h-full" onClick={(e) => e.stopPropagation()}>
          <TokenGroupTree {...groupTree} />
          <div className="mt-auto p-2 border-t border-muted">
            <button
              type="button"
              className="w-full flex items-center justify-center text-muted-foreground hover:text-foreground py-1 text-xs gap-1"
              onClick={onCollapseSidebar}
              title="Collapse sidebar"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 6l-3 2 3 2" />
                <rect x="9" y="3" width="5" height="10" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        {layoutMode === 'split' ? (
          <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0 h-full">
            <ResizablePanel defaultSize={40} minSize={25}>
              <main className="h-full overflow-y-auto p-6 flex flex-col gap-4 bg-background text-foreground">
                {breadcrumbActionsRow(
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    onClick={() => persistLayout('tabs')}
                    title="Tab between table and graph"
                    aria-label="Switch to tabbed layout: Table and Graph tabs"
                  >
                    <GalleryHorizontal className="h-4 w-4" aria-hidden />
                  </Button>,
                )}
                {mainContent}
              </main>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={30} minSize={20}>
              <div className="h-full border-l border-muted bg-background">{graphPanel}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <Tabs
            defaultValue="table"
            className="flex flex-col flex-1 min-h-0 overflow-hidden gap-0"
          >
            <div className="flex-shrink-0 px-6 pt-6 pb-3 border-b border-muted bg-background">
              {breadcrumbActionsRow(
                <>
                  <TabsList className="h-8 p-0.5">
                    <TabsTrigger value="table" className="text-xs px-3 py-1 h-7">
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="graph" className="text-xs px-3 py-1 h-7">
                      Graph
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    onClick={() => persistLayout('split')}
                    title="Split view — table and graph side by side"
                    aria-label="Switch to split view"
                  >
                    <Columns2 className="h-4 w-4" aria-hidden />
                  </Button>
                </>,
              )}
            </div>
            <TabsContent
              value="table"
              forceMount
              className="flex-1 min-h-0 m-0 p-0 overflow-hidden flex flex-col focus-visible:outline-none"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 bg-background text-foreground">{mainContent}</div>
            </TabsContent>
            <TabsContent
              value="graph"
              forceMount
              className="flex-1 min-h-0 m-0 p-0 overflow-hidden focus-visible:outline-none"
            >
              <div className="h-full min-h-0 bg-background">{graphPanel}</div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
