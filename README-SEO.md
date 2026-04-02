# Open Source Design Tokens Manager

**Free Alternative to Tokens Studio** — A powerful, self-hosted design token management platform for design systems. Manage design tokens with visual graph-based generation, Figma sync, GitHub integration, and multi-format export.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-13-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)

## Why Choose This Over Tokens Studio?

Tokens Studio (formerly Figma Tokens) charges $10-49/month per user. This open-source alternative gives you:

- **Free & Self-Hosted** — No subscription fees, complete data ownership
- **Visual Token Generation** — Graph-based token creation with React Flow
- **Advanced Theming** — Unlimited themes per collection with isolated token values
- **MongoDB Persistence** — Store and version your entire token library
- **Multi-Format Export** — CSS, SCSS, LESS, JavaScript, TypeScript, JSON
- **Figma & GitHub Sync** — Import/export tokens from design tools and repositories
- **Style Dictionary v5** — Industry-standard token transformation
- **No Vendor Lock-in** — Own your infrastructure and data

## Features

### Design Token Management
- Create, edit, and organize design tokens (colors, typography, spacing, borders, shadows, etc.)
- Visual token grouping with hierarchical structure
- Reference tokens with `{token.path}` syntax
- Math expressions (`{base} * 2`, `rgba({color}, 0.5)`)
- Token validation and type checking

### Visual Graph Editor
- Node-based token generation interface powered by React Flow
- Create tokens from operations (math, color transforms, conditionals)
- Real-time token preview and validation
- Per-theme and per-group graph state persistence

### Theme System
- Unlimited themes per token collection
- Isolated token values per theme (light/dark modes, brand variants, etc.)
- Theme inheritance from collection defaults
- Group-level theme control (enabled/source/disabled)

### Import & Export
- **Figma Integration** — Sync tokens to/from Figma variables and styles
- **GitHub Integration** — Import tokens from repositories
- **Export Formats** — CSS, SCSS, LESS, JavaScript, TypeScript, JSON
- **Style Dictionary** — Transform tokens to any format or platform

### Developer Experience
- Built with Next.js 13 App Router and TypeScript
- shadcn/ui component library (Radix UI + Tailwind CSS)
- MongoDB + Mongoose for persistence
- RESTful API for programmatic access

## Quick Start

### Prerequisites
- Node.js 18+ and Yarn
- MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tokens-manager.git
cd tokens-manager
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017/tokens-manager
# or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tokens-manager
```

4. Start the development server:
```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Steps
- Browse collections at `/collections`
- Create a new token collection
- Add tokens manually or import from Figma/GitHub
- Create themes for light/dark modes or brand variants
- Use the visual graph editor for advanced token generation
- Export tokens to your preferred format

## Use Cases

### Design System Teams
- Manage design tokens for enterprise design systems
- Maintain consistency across products and platforms
- Support multiple brands or themes from a single source

### Frontend Developers
- Generate CSS variables, SCSS mixins, or JavaScript token objects
- Integrate with build pipelines via Style Dictionary
- Automate token updates from Figma designs

### Open Source Projects
- Self-host your token management infrastructure
- Customize and extend functionality for your needs
- No per-user licensing costs

### Tokens Studio Migration
Looking to switch from Tokens Studio? This tool provides:
- Similar JSON token format for easy migration
- Visual token editing and theming capabilities
- Self-hosted infrastructure without monthly fees
- Style Dictionary integration for token transformation

## Tech Stack

- **[Next.js 13](https://nextjs.org/)** — React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** — Type-safe development
- **[MongoDB](https://www.mongodb.com/)** + [Mongoose](https://mongoosejs.com/) — Token persistence
- **[Style Dictionary v5](https://amzn.github.io/style-dictionary/)** — Token build and transformation
- **[shadcn/ui](https://ui.shadcn.com/)** + [Radix UI](https://www.radix-ui.com/) — Component library
- **[React Flow](https://reactflow.dev/)** — Visual graph editor
- **[Tailwind CSS](https://tailwindcss.com/)** — Styling

## Project Structure

```
src/
├── app/
│   ├── collections/[id]/     # Tokens, Themes, Config, Settings
│   └── api/collections/       # Collection + theme CRUD
├── components/
│   ├── tokens/               # TokenGeneratorForm, TokenGroupTree
│   ├── graph/                # GroupStructureGraph, node components
│   └── themes/               # Theme list, group matrix
├── lib/
│   ├── graphEvaluator.ts     # Graph evaluation engine
│   ├── graphStateRemap.ts    # Theme graph state remapping
│   └── db/                   # MongoDB, repository
└── types/                    # theme, graph-state, token types
```

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | AI assistant context — project conventions, data model |
| [documentation/themes-and-graph-data-model.md](./documentation/themes-and-graph-data-model.md) | Themes, tokens, graph state model |
| [documentation/graph-system-summary.md](./documentation/graph-system-summary.md) | Graph nodes, evaluation, persistence |
| [documentation/graph-architecture.md](./documentation/graph-architecture.md) | Token parsing, layout, selection |
| [.planning/PROJECT.md](./.planning/PROJECT.md) | Requirements, milestones, decisions |

## Key Concepts

### Collections
Token sets stored in MongoDB. Each collection has:
- Token groups and definitions
- Figma and GitHub integration settings
- Export configuration for multiple formats
- Independent theme management

### Themes
Per-collection theme variants with:
- Isolated token values (e.g., light/dark mode colors)
- Per-group graph state for visual token generation
- Theme inheritance from collection defaults
- Group-level theme control (enabled/source/disabled)

### Visual Graph Editor
Node-based interface for advanced token generation:
- Math operations (`multiply`, `add`, `subtract`)
- Color transformations (`lighten`, `darken`, `alpha`)
- Conditional logic
- Token references between nodes
- Real-time evaluation and preview

## API

RESTful API for programmatic token management:

### Collections
- `GET /api/collections` — List all collections
- `GET /api/collections/[id]` — Get collection with tokens
- `PUT /api/collections/[id]` — Update collection tokens and graph state
- `POST /api/collections` — Create new collection
- `DELETE /api/collections/[id]` — Delete collection

### Themes
- `GET /api/collections/[id]/themes` — List collection themes
- `POST /api/collections/[id]/themes` — Create new theme
- `PUT /api/collections/[id]/themes/[themeId]` — Update theme
- `PATCH /api/collections/[id]/themes/[themeId]/tokens` — Update theme tokens
- `DELETE /api/collections/[id]/themes/[themeId]` — Delete theme

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow clean code and SOLID principles (see `.planning/codebase/CLEAN-CODE.md`)
- Write TypeScript with strict type checking
- Use separation of concerns — break large functions into focused utilities
- Add tests for new features
- Update documentation for API changes

## License

MIT License — see [LICENSE](./LICENSE) file for details.

## Roadmap

See [.planning/ROADMAP.md](./.planning/ROADMAP.md) for planned features:
- Enhanced read-only token views
- Advanced Figma variable sync
- Token versioning and history
- Collaborative editing
- Custom export templates
- And more...

## Keywords

design tokens, tokens studio alternative, figma tokens, design system, token management, style dictionary, design tokens manager, open source tokens studio, free tokens studio, figma sync, design system tools, css variables generator, design tokens platform, token transformation, theme management, design ops, design tokens workflow
