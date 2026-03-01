import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Buttons
      'at-button': React.HTMLAttributes<HTMLElement> & React.ClassAttributes<HTMLElement> & React.Attributes & {
        variant?: string;
        disabled?: boolean;
        size?: string;
        label?: string;
        in_progress?: boolean;
        submit?: boolean;
        icon?: string;
        icon_after?: string;
        onAtuiClick?: (event: CustomEvent) => void;
      };
      // Inputs
      'at-input': React.HTMLAttributes<HTMLElement> & {
        value?: string;
        placeholder?: string | number;
        label?: string;
        type?: string;
        disabled?: boolean;
        readonly?: boolean;
        required?: boolean;
        invalid?: boolean;
        error_text?: string;
        hint_text?: string;
        clearable?: boolean;
        onAtuiChange?: (event: CustomEvent<string | number>) => void;
      };
      // Select
      'at-select': React.HTMLAttributes<HTMLElement> & {
        value?: string;
        options?: Array<{ value: string; label: string; disabled?: boolean }>;
        placeholder?: string;
        label?: string;
        disabled?: boolean;
        readonly?: boolean;
        required?: boolean;
        invalid?: boolean;
        error_text?: string;
        hint_text?: string;
        clearable?: boolean;
        autoclose?: boolean;
        onAtuiChange?: (event: CustomEvent<string>) => void;
      };
      // Tabs
      'at-tabs': React.HTMLAttributes<HTMLElement> & {
        tabs?: Array<{ id: string; title: string; disabled?: boolean }>;
        active_tab?: string;
        layout?: string;
        fill?: boolean;
        hide_nav?: boolean;
        onAtuiChange?: (event: CustomEvent<string>) => void;
      };
      'at-tab-trigger': React.HTMLAttributes<HTMLElement> & {
        tab_id?: string;
        tab_title?: string;
        is_active?: boolean;
        layout?: string;
        fill?: boolean;
      };
      'at-tab-content': React.HTMLAttributes<HTMLElement> & {
        tab_id?: string;
        is_active?: boolean;
      };
      // Dialog
      'at-dialog': React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<HTMLElement>;
        backdrop?: boolean;
        close_backdrop?: boolean;
        trigger_id?: string;
        role?: 'dialog' | 'alertdialog';
        onAtuiDialogChange?: (event: CustomEvent) => void;
      };
    }
  }
}
