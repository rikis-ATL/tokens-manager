import * as React from 'react';

import { cn } from '@/lib/utils';

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Wraps adjacent buttons so spacing and chrome track `--button-group-*`
 * (defaults follow `--button-padding-y`; radius matches `--button-border-radius`).
 */
const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn(
        'inline-flex items-center rounded-button border border-button-border bg-background p-button-group-padding gap-button-group-gap',
        className
      )}
      {...props}
    />
  )
);
ButtonGroup.displayName = 'ButtonGroup';

export { ButtonGroup };
