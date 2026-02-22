import { Config } from '@stencil/core';
// import { postcss } from '@stencil/postcss';
// import autoprefixer from 'autoprefixer';
// import tailwindcss from 'tailwindcss';

// https://stenciljs.com/docs/config

export const config: Config = {
  namespace: 'token-manager',
  globalStyle: 'src/global/app.css',
  globalScript: 'src/global/app.ts',
  taskQueue: 'congestionAsync',
  maxConcurrentWorkers: 2, // Limit concurrent workers to reduce memory usage
  devServer: {
    reloadStrategy: 'pageReload',
    port: 3335
  },
  // plugins: [
  //   postcss({
  //     plugins: [
  //       tailwindcss(),
  //       autoprefixer()
  //     ],
  //     injectGlobalPaths: [
  //       'src/global/tailwind-base.css'
  //     ]
  //   })
  // ],
  outputTargets: [
    {
      type: 'www',
      serviceWorker: null,
      copy: []
    },
  ],
  sourceMap: false,
  minifyJs: false,
  buildEs5: false,
  enableCache: false,
  autoprefixCss: false,
  validateTypes: false,
  extras: {
    enableImportInjection: false,
    appendChildSlotFix: false,
    cloneNodeFix: false,
    slotChildNodesFix: false
  },
  bundles: [] // Disable all bundling/lazy loading
};
