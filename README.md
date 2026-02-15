# Design Token Manager

A web-based GUI for managing design tokens using the Style Dictionary framework. Provides visual token editing, validation, and build automation with support for both greenfield and brownfield workflows.

## ✨ Features

- **Visual Token Management**: View and edit tokens in HTML tables with color swatches
- **Style Dictionary Integration**: Build tokens to CSS, SCSS, JS, and JSON using SD API
- **Token Validation**: W3C Design Tokens specification compliance checking
- **Token References**: Support for referencing existing tokens (e.g., `{color.primary}`)
- **GitHub Integration**: Import/export tokens from/to GitHub repositories
- **Real-time Updates**: Auto-save with backup creation
- **Greenfield & Brownfield**: Works with new projects or existing Style Dictionary repos

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build tokens with Style Dictionary
# (or use the "Build Tokens" button in the UI)
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: Comprehensive setup and usage guide
- **[TOKEN_MANAGER_README.md](./TOKEN_MANAGER_README.md)**: Original project documentation
- **[Style Dictionary Docs](https://styledictionary.com/)**: Official Style Dictionary documentation

## 🎯 Use Cases

### Greenfield Setup
Start from scratch and generate tokens through the GUI:
1. Navigate to `/generate`
2. Create tokens with visual forms
3. Organize into groups and hierarchies
4. Build with Style Dictionary

### Brownfield Setup
Integrate with existing Style Dictionary projects:
1. Symlink your tokens directory: `ln -s /path/to/tokens tokens`
2. Customize `config.js` for your build requirements
3. Use the GUI to view and edit existing tokens
4. Build outputs remain compatible with your pipeline

## 🔧 Requirements

- **Use the SD API** to provide a GUI layer for the token generation and build process ✅
- **Provide visual validation and error reporting** ✅
- **Don't make complicated formatters** - rely on SD API to do this ✅
- **Define token sets/groups** ✅
- **Set a global namespace** (SD prefix) ✅
- **Define tokens that reference existing tokens** ✅

## 🏗️ Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Token viewer
│   │   ├── generate/page.tsx     # Token generator
│   │   └── api/
│   │       ├── tokens/           # Token CRUD operations
│   │       ├── build/            # Style Dictionary build
│   │       └── ...
│   ├── components/
│   │   ├── TokenTable.tsx        # Token display and editing
│   │   └── TokenGeneratorFormNew.tsx  # Token creation form
│   └── utils/
│       ├── tokenUpdater.ts       # Token file operations
│       └── tokenValidator.ts     # W3C token validation
├── tokens/                       # Your token files (gitignored)
├── build/                        # Style Dictionary output (gitignored)
└── config.js                     # Style Dictionary configuration
```

## 📝 API Endpoints

- `GET /api/tokens` - Retrieve all tokens
- `PUT /api/tokens/[...path]` - Update a token
- `POST /api/build` - Build tokens with Style Dictionary
- `POST /api/tokens/validate` - Validate token(s)
- `GET /api/build` - Get build status

## 🧪 Technology Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Token Engine**: Style Dictionary v5.x
- **Validation**: Custom W3C token validator

## 📦 Dependencies

Main dependencies:
- `next@13.5.6`
- `react@18.2.0`
- `style-dictionary@5.3.0`
- `typescript@5.2.2`
- `tailwindcss@3.3.0`

## 🔒 Security Note

This project includes validation to ensure tokens comply with the W3C Design Tokens specification. Always review generated tokens before deploying to production.

## 📄 License

This project is for internal use. See repository owner for licensing details.

## 🤝 Contributing

This is a work-in-progress demo. Follow clean coding best practices:
- Write semantic, self-documenting code
- Add TypeScript types for all functions
- Validate user inputs
- Test changes before committing
