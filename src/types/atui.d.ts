import React from 'react';
import '@alliedtelesis-labs-nz/atui-components-stencil/dist/types/components';

// The package's components.d.ts already declares all at-* JSX intrinsic elements
// via its own JSX.IntrinsicElements merge. This file adds React-specific extras
// that Stencil's types don't include (ref, key, React event handlers, etc).

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Stencil types don't include React's ref/key — patch the ones we use
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
      };
      'at-select': React.HTMLAttributes<HTMLElement> & React.ClassAttributes<HTMLElement> & {
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
      'at-tabs': React.HTMLAttributes<HTMLElement> & React.ClassAttributes<HTMLElement> & {
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
      'at-dialog': React.HTMLAttributes<HTMLElement> & React.ClassAttributes<HTMLElement> & {
        backdrop?: boolean;
        close_backdrop?: boolean;
        trigger_id?: string;
        role?: 'dialog' | 'alertdialog';
        onAtuiDialogChange?: (event: CustomEvent) => void;
      };
      'at-input': React.HTMLAttributes<HTMLElement> & React.ClassAttributes<HTMLElement> & {
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
      'at-header': React.HTMLAttributes<HTMLElement> & {
        header_title?: string;
        icon?: string;
        border?: boolean;
        padding?: boolean;
        size?: string;
      };
    }
  }
}
