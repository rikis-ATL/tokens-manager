import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Extended merge that knows about all custom `text-{key}` font-size utilities
 * from tailwind-theme-extend.js. Without this, tailwind-merge can't detect
 * conflicts between e.g. `text-input` and `text-table-cell` and keeps both,
 * letting CSS cascade order decide which wins.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            '2xs',
            'button',
            'input',
            'input-label',
            'menu-item',
            'dropdown-item',
            'card-title',
            'card-subtitle',
            'tabs-trigger',
            'table-header',
            'table-cell',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
