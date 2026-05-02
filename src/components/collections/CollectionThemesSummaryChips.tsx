'use client';

import type { ReactNode } from 'react';
import { Sun, Moon, Layers } from '@carbon/icons-react';
import type { CollectionThemesSummary } from '@/types/collection.types';

export function CollectionThemesSummaryChips({
  summary,
  whenEmpty,
}: {
  summary: CollectionThemesSummary;
  /** Rendered when there are no custom themes (e.g. em dash in tables). Omit on cards to hide. */
  whenEmpty?: ReactNode;
}) {
  const total = summary.colorLight + summary.colorDark + summary.density;
  if (total === 0) {
    return whenEmpty !== undefined ? <>{whenEmpty}</> : null;
  }

  const lightOnlySingleton =
    summary.colorLight === 1 && summary.colorDark === 0 && summary.density === 0;
  const darkOnlySingleton =
    summary.colorDark === 1 && summary.colorLight === 0 && summary.density === 0;
  const densityOnlySingleton =
    summary.density === 1 && summary.colorLight === 0 && summary.colorDark === 0;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {summary.colorLight > 0 &&
        (lightOnlySingleton ? (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-warning/10 text-warning shrink-0"
            title="1 light color theme"
          >
            <Sun size={12} className="shrink-0" />
            Light
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-warning/10 text-warning shrink-0"
            title={`${summary.colorLight} light color theme${summary.colorLight === 1 ? '' : 's'}`}
          >
            <Sun size={12} className="shrink-0" />
            <span className="tabular-nums">{summary.colorLight}</span>
          </span>
        ))}

      {summary.colorDark > 0 &&
        (darkOnlySingleton ? (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground shrink-0"
            title="1 dark color theme"
          >
            <Moon size={12} className="shrink-0" />
            Dark
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-muted text-muted-foreground shrink-0"
            title={`${summary.colorDark} dark color theme${summary.colorDark === 1 ? '' : 's'}`}
          >
            <Moon size={12} className="shrink-0" />
            <span className="tabular-nums">{summary.colorDark}</span>
          </span>
        ))}

      {summary.density > 0 &&
        (densityOnlySingleton ? (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-1 rounded text-[10px] bg-secondary text-secondary-foreground shrink-0"
            title="1 density theme"
          >
            <Layers size={12} className="shrink-0" />
            Density
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-0.5 px-1 py-1 rounded text-[10px] bg-secondary text-secondary-foreground shrink-0"
            title={`${summary.density} density theme${summary.density === 1 ? '' : 's'}`}
          >
            <Layers size={12} className="shrink-0" />
            <span className="tabular-nums">{summary.density}</span>
          </span>
        ))}
    </div>
  );
}
