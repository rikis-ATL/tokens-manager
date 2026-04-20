import React from 'react';
import { ToastMessage } from '../../types';

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className={`min-w-[320px] max-w-md w-full bg-card shadow-lg rounded-lg pointer-events-auto ring-1 ring-1 ring-border ${
        toast.type === 'success' ? 'border-l-4 border-success' :
        toast.type === 'error' ? 'border-l-4 border-destructive' :
        'border-l-4 border-primary'
      }`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-5 h-5 text-success">✓</div>
              ) : toast.type === 'error' ? (
                <div className="w-5 h-5 text-destructive">✕</div>
              ) : (
                <div className="w-5 h-5 text-info">ℹ</div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground break-words">
                {toast.message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-card rounded-md inline-flex text-muted-foreground hover:text-muted-foreground focus:outline-none"
                onClick={onClose}
              >
                <span className="text-sm">✕</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}