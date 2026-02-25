# Technology Stack

**Analysis Date:** 2026-02-25

## Languages

**Primary:**
- TypeScript 5.2.2 (main workspace) / 4.9.4 (Angular) / 5.9.3 (Vite) - Used across all applications
- JavaScript - Legacy support and configuration files
- JSX/TSX - React and Stencil component definitions

**Secondary:**
- HTML - Templates in Angular and web apps
- CSS - Styling (Tailwind-based)

## Runtime

**Environment:**
- Node.js (version managed via Yarn, specific version not locked in .nvmrc)

**Package Manager:**
- Yarn (Yarn 3 workspaces)
- Lockfile: Present (via Yarn)

## Frameworks

**Core Web Frameworks:**
- Next.js 13.5.6 - Main framework for root workspace, server-side token management
- Angular 15.2.0 - Primary Angular workspace (`token-manager-angular/`)
- Stencil 4.28.2 - Web components framework (`token-manager-stencil/`)
- Vite 4.0.0 - Build tool for Vite workspace (`token-manager-vite/`)

**UI & Component Libraries:**
- React 18.2.0 - Used with Next.js
- React DOM 18.2.0 - DOM rendering for React
- @alliedtelesis-labs-nz/atui-components-stencil 0.1.174 - Shared Stencil components used in both Stencil and Vite workspaces
- Alpine.js 3.15.8 - Lightweight reactive UI framework (Vite workspace)

**Build & Dev Tools:**
- @angular-devkit/build-angular 15.2.11 - Angular build system
- @angular/cli 15.2.11 - Angular command line interface

**Testing:**
- Jest 29.7.0 - Test runner (Stencil workspace)
- Jasmine 4.5.0 - Assertion library (Angular)
- Karma 6.4.0 - Test runner for Angular
- Karma Chrome Launcher 3.1.0 - Chrome browser for tests
- Karma Jasmine 5.1.0 - Jasmine adapter for Karma
- Karma Jasmine HTML Reporter 2.0.0 - HTML test reporting
- Puppeteer 21.11.0 - Headless browser for E2E testing (Stencil)

## Key Dependencies

**Critical:**
- rxjs 7.8.0 - Reactive programming library (Angular)
- tslib 2.3.0 - TypeScript helper library
- zone.js 0.12.0 - Execution context management (Angular)

**UI & Styling:**
- tailwindcss 3.3.0 (Next.js/Stencil) or 3.4.19 (Angular) or 4.2.0 (Vite) - Utility-first CSS framework
- @tailwindcss/postcss 4.2.0 - PostCSS integration (Vite)
- autoprefixer 10.4.16 (Next.js/Stencil) or 10.4.24 (Angular/Vite) - CSS vendor prefixing
- postcss 8.4.31 (Next.js/Stencil) or 8.5.6 (Angular/Vite) - CSS transformation tool

**Utilities:**
- clsx 2.1.1 - Conditional className builder (Stencil)
- @floating-ui/dom 1.7.5 - Positioning engine for floating elements (Stencil)
- moment 2.30.1 - Date/time manipulation (Stencil)

**Type Definitions:**
- @types/node 18.17.0 - Node.js type definitions
- @types/react 18.2.0 - React type definitions
- @types/react-dom 18.2.0 - React DOM type definitions
- @types/jasmine 4.3.0 - Jasmine type definitions (Angular)
- @types/jest 30.0.0 - Jest type definitions (Stencil)

**Stencil-Specific:**
- @stencil/core 4.28.2 - Stencil compiler
- @stencil/postcss 2.1.0 - PostCSS plugin for Stencil
- @stencil/router 1.0.1 - Simple routing solution
- stencil-router-v2 0.6.0 - Newer router version

**Router/Navigation:**
- @angular/router 15.2.0 - Angular routing module
- stencil-router-v2 0.6.0 - Stencil routing (Stencil workspace)

## Configuration

**Environment:**
- `.env.local` file exists in root and token-manager-stencil (configuration holder, contents not disclosed)
- GitHub Package Registry configured via `.yarnrc.yml` for `@alliedtelesis-labs-nz` scoped packages
- NPM_AUTH_TOKEN required for private package access

**Build:**
- `tsconfig.json` - Root TypeScript configuration with ES2017 target, next plugin
- `token-manager-angular/tsconfig.json` - Angular TypeScript config, ES2022 target, decorators enabled
- `token-manager-stencil/tsconfig.json` - Stencil TypeScript config, ES2017 target
- `next.config.ts` - Next.js configuration with Turbo support
- `tailwind.config.js` - Tailwind CSS configuration at root and in each workspace
- `postcss.config.js` - PostCSS configuration with Tailwind and autoprefixer
- `eslint.config.mjs` - ESLint flat config using next/core-web-vitals and typescript presets
- `token-manager-stencil/stencil.config.ts` - Stencil build configuration with dev server on port 3335
- `token-manager-angular/angular.json` - Angular CLI configuration

**Path Aliases:**
- Root workspace: `@/*` → `./src/*`
- Stencil: Type roots configured for nested node_modules

## Platform Requirements

**Development:**
- Node.js runtime
- Yarn package manager (Yarn 3)
- macOS or Unix-like OS (based on simple-server.js symlink reference)

**Production:**
- Next.js: Node.js runtime with Next.js server (port 3000 by default)
- Angular: Static hosting (compiled to `dist/token-manager-angular/`)
- Stencil: Static hosting (compiled to `www/` directory)
- Vite: Static hosting (compiled to `dist/` directory)
- Simple Server: Node.js with Express (port 3001, optional legacy server)

---

*Stack analysis: 2026-02-25*
