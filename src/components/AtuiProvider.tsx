'use client';
import React, { useEffect } from 'react';
import '../../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css';

export function AtuiProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    import('@alliedtelesis-labs-nz/atui-components-stencil/loader').then(({ defineCustomElements }) => {
      defineCustomElements(window);
    });
  }, []);
  return <>{children}</>;
}
