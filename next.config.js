/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: [
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-menu',
    '@radix-ui/react-roving-focus',
    '@radix-ui/react-collection',
  ],
}

module.exports = nextConfig