# Token Manager - Vite Edition ⚡

A lightning-fast development version of the Token Manager using Vite + Web Components.

## 🚀 Key Benefits

- **⚡ Lightning Fast**: 335ms startup (vs 35+ seconds for Stencil)
- **🔥 Instant HMR**: Hot Module Replacement for immediate updates
- **🎯 Native Web Components**: Direct ATUI component usage
- **♻️ Code Reuse**: All existing services, types, and utilities
- **🎨 Tailwind CSS**: Fully integrated with component styling

## 🏃‍♂️ Quick Start

```bash
# Start development server
yarn dev

# Or from workspace root
yarn dev:vite
```

Visit: http://localhost:5173/

## 📁 Project Structure

```
src/
├── services/           # Copied from token-manager-stencil
│   ├── github.service.ts
│   ├── token.service.ts
│   ├── figma.service.ts
│   └── file.service.ts
├── types/              # Copied from token-manager-stencil
│   └── token.types.ts
├── utils/              # Copied from token-manager-stencil
│   └── token.utils.ts
├── token-manager.ts    # Main Web Components UI
├── main.ts            # Entry point
└── style.css          # Global styles + ATUI + Tailwind
```

## 🎯 Features

### ✅ Working Features
- **ATUI Web Components**: Buttons, inputs, cards, selects, badges, messages
- **Tailwind CSS**: Full integration with component styling
- **Service Integration**: Real GitHub, Token, and Figma services
- **Token Management**: Create, import, export functionality
- **Hot Reload**: Instant updates during development

### 🔧 Services Available
- `GitHubService`: Import/export tokens from GitHub repositories
- `TokenService`: Core token management and processing
- `FigmaService`: Export tokens to Figma design files
- `FileService`: File system operations and token file handling

## 🛠️ Development

### Adding New Components
```typescript
// Import ATUI component
import '@alliedtelesis-labs-nz/atui-components-stencil/at-new-component'

// Use in HTML template
<at-new-component prop="value">Content</at-new-component>
```

### Using Services
```typescript
import { TokenService } from './services/token.service'

const tokenService = new TokenService()
const tokens = await tokenService.generateTokens()
```

### Styling with Tailwind
```html
<div class="bg-white p-4 rounded-lg shadow-md">
  <at-button class="w-full">Full Width Button</at-button>
</div>
```

## 🔄 Comparison

| Feature | Vite Edition | Stencil Edition |
|---------|-------------|-----------------|
| Startup Time | **335ms** ⚡ | 35+ seconds 🐢 |
| Hot Reload | **Instant** | Slow rebuild |
| Build Step | **None** | Required |
| Development | **Web Components** | Stencil compilation |
| Code Sharing | ✅ Same services | ✅ Original code |

## 🌟 Use Cases

- **Rapid Prototyping**: Instant feedback loop
- **Feature Development**: Fast iteration on new features
- **Service Testing**: Quick testing of GitHub/Figma integrations
- **UI Experimentation**: Try different ATUI component combinations
- **Performance Testing**: Test with real services without build overhead

The Vite edition provides the same functionality as the Stencil version but with dramatically faster development experience!