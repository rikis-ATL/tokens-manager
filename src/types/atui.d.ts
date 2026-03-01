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
        'data-dialog'?: string;
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
        typeahead?: boolean;
        onAtuiChange?: (event: CustomEvent<string>) => void;
      };
      'at-select-option': React.HTMLAttributes<HTMLElement> & React.ClassAttributes<HTMLElement> & {
        value?: string;
        label?: string;
        disabled?: boolean;
      };
      // Tabs
      'at-tabs': React.HTMLAttributes<HTMLElement> & {
        active_tab?: string;
        layout?: string;
        fill?: boolean;
        hide_nav?: boolean;
        onAtuiTabChange?: (event: CustomEvent<string>) => void;
        onAtuiChange?: (event: CustomEvent<string>) => void;
      };
      'at-tab-trigger': React.HTMLAttributes<HTMLElement> & {
        tab_id?: string;
        tab_title?: string;
        is_active?: boolean;
        layout?: string;
        fill?: boolean;
        slot?: string;
      };
      'at-tab-content': React.HTMLAttributes<HTMLElement> & {
        tab_id?: string;
        is_active?: boolean;
        slot?: string;
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
