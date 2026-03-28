import { toast } from 'sonner';

/**
 * Status dot icon rendered before the toast title.
 * Returns a small colored circle as JSX-compatible element string.
 * Sonner accepts ReactNode for `icon` — we pass a pre-styled span via createElement.
 */
import React from 'react';

const StatusDot = ({ color }: { color: string }) =>
  React.createElement('span', {
    style: {
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: color,
      flexShrink: 0,
      marginTop: 2,
    },
  });

/**
 * Show a success toast at bottom-right with a green status dot.
 */
export const showSuccessToast = (message: string, description?: string): void => {
  toast.success(message, {
    description,
    icon: React.createElement(StatusDot, { color: '#22c55e' }),
  });
};

/**
 * Show an error toast at bottom-right with a red status dot.
 */
export const showErrorToast = (message: string, description?: string): void => {
  toast.error(message, {
    description,
    icon: React.createElement(StatusDot, { color: '#ef4444' }),
  });
};

/**
 * Show an info toast at bottom-right with a blue status dot.
 */
export const showInfoToast = (message: string, description?: string): void => {
  toast.info(message, {
    description,
    icon: React.createElement(StatusDot, { color: '#3b82f6' }),
  });
};
