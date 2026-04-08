/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Same packages Next already externalizes by default — explicit for clarity and
    // stable resolution with mongoose/mongodb in App Router API routes.
    serverComponentsExternalPackages: [
      'mongoose',
      'mongodb',
      'resend',
      // socket.io → engine.io → ws; optional native deps (bufferutil) break webpack if bundled
      'socket.io',
      'engine.io',
      'ws',
    ],
  },
  transpilePackages: [
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-menu',
    '@radix-ui/react-roving-focus',
    '@radix-ui/react-collection',
  ],
  /**
   * Next 13 dev splits `node_modules` into per-package server chunks for faster HMR.
   * Under parallel API compilations (e.g. theme switching), webpack-runtime and route
   * bundles can desync → `TypeError: __webpack_require__.C is not a function`.
   * Single server bundle in dev avoids that; production build is unchanged.
   */
  webpack: (config, { dev, isServer }) => {
    // ws optional peer deps — webpack resolves them statically; stub so build succeeds without native addons
    config.resolve.alias = {
      ...config.resolve.alias,
      bufferutil: false,
      'utf-8-validate': false,
    };
    if (dev && isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;