import { defineCustomElements } from '@alliedtelesis-labs-nz/atui-components-stencil/dist/esm/loader.js';

export default async () => {
  /**
   * Initialize ATUI components
   */
  await defineCustomElements();
};
