# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Components: `[name].component.ts` (e.g., `token-generator.component.ts`, `token-table.component.ts`)
- Services: `[name].service.ts` (e.g., `token.service.ts`, `github.service.ts`)
- Utilities: `[name].utils.ts` (e.g., `validation.utils.ts`, `ui.utils.ts`)
- Types/Interfaces: `[name].types.ts` (e.g., `token.types.ts`)
- Spec files: `[name].spec.ts` (e.g., `app.component.spec.ts`)
- Directories use kebab-case: `token-manager-angular`, `src/app/services`, `src/app/utils`

**Functions:**
- camelCase for function names: `validateGitHubRepository`, `createToast`, `formatFileSize`
- Arrow functions with default parameters when appropriate: `export const createToast = (message: string, type: 'success' | 'error' | 'info' = 'info'): ToastMessage`
- Validation functions: `validate[EntityName]` pattern (e.g., `validateGitHubToken`, `validateBranchName`)
- Utility/helper functions: `[action][Noun]` pattern (e.g., `formatFileSize`, `copyToClipboard`, `sanitizeFilename`)
- Factory functions: `create[Type]` pattern (e.g., `createLoadingState`, `createToast`)

**Variables:**
- camelCase: `githubConfig`, `tokenGroups`, `globalNamespace`, `isLoading`
- Constants: UPPER_SNAKE_CASE in type definitions (e.g., `TOKEN_TYPES`)
- Constants in services: `private readonly BASE_URL = 'https://api.github.com'`
- Boolean variables: `isLoading`, `isValid`, `showPreview`, `hasChildren`
- Collections: plural nouns: `tokenGroups`, `availableBranches`, `errors`

**Types:**
- Interfaces: PascalCase ending in appropriate suffix: `TokenGroup`, `GeneratedToken`, `ValidationResult`, `GitHubConfig`, `ToastMessage`
- Type unions: PascalCase: `TokenType`, `StructureType`
- Type naming conventions:
  - API response types: `[Service]ApiResponse` (e.g., `GitHubApiResponse`)
  - Config types: `[Service]Config` (e.g., `GitHubConfig`, `FigmaConfig`)
  - Result types: `[Action]Result` (e.g., `ValidationResult`, `FileImportResult`)
  - State types: `[Noun]State` (e.g., `LoadingState`)

## Code Style

**Formatting:**
- Tool: Prettier (configured via `.prettierrc.json` in Stencil project)
- Tab width: 2 spaces (not tabs)
- Print width: 180 characters
- Single quotes: true (use single quotes over double)
- Semi-colons: true (required at end of statements)
- Arrow parens: avoid (e.g., `x => x * 2` not `(x) => x * 2`)
- Trailing commas: all (include trailing commas in multi-line objects/arrays)
- Brace spacing: true (`{ foo: bar }` not `{foo: bar}`)

**Linting:**
- No ESLint or TypeScript linting config detected in Angular project
- TypeScript strict mode enabled via `tsconfig.json`: strict: true

## Import Organization

**Order:**
1. Angular core/framework imports (`@angular/core`, `@angular/common`, etc.)
2. RxJS imports (`rxjs`, `rxjs/operators`)
3. Third-party libraries
4. Local service imports (grouped, relative paths with single quotes)
5. Local type/interface imports
6. Local utility/component imports

**Pattern observed:**
```typescript
// Angular framework
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Local services (alphabetically)
import { GitHubService, TokenService, FileService, FigmaService } from '../services';

// Local types
import { GitHubConfig, TokenGroup, ToastMessage, LoadingState } from '../types';

// Local utilities
import { createLoadingState, createToast } from '../utils';

// Local components
import { LoadingIndicatorComponent } from './loading-indicator.component';
```

**Path Aliases:**
- No path aliases detected in Angular project's `tsconfig.json`
- Uses relative paths: `../services`, `../types`, `../utils`, `./component`

## Error Handling

**Patterns:**
- Try-catch blocks with console.error logging: Used in services and components for async operations
- Error casting: Check `error instanceof Error` before accessing `.message` property
- Example from `github.service.ts`:
  ```typescript
  try {
    const response = await fetch(...);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw new Error(`Failed to fetch branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  ```

- Validation functions return `ValidationResult` interface: `{ isValid: boolean, errors: string[] }`
- Component error handling: Pass errors to toast notifications via `createToast(message, 'error')`

## Logging

**Framework:** console (native browser console)

**Patterns:**
- console.log for info/debug: Mostly in service initialization and structure detection
- console.error for exceptions: Used after try-catch blocks
- console.warn for non-critical issues
- Examples from `token.service.ts`:
  ```typescript
  console.log('🔍 Detecting structure type from top-level keys:', topLevelKeys);
  console.log(`📦 Structure B detected - Namespace wrapper: "${singleKey}"`);
  console.log('🏗️ Structure A detected - Flat structure (no namespace wrapper)');
  ```

**Note:** Emoji prefixes used in token service for visual debugging (🔍, 📦, 🏗️, 🎯, ✂️)

## Comments

**When to Comment:**
- JSDoc/TSDoc comments for public methods and services
- Inline comments for complex logic in utilities and algorithms
- Section headers for major code blocks (e.g., `// First pass: create all groups`)

**JSDoc/TSDoc:**
- Used extensively in services for public methods:
  ```typescript
  /**
   * Validate GitHub repository format
   */
  export const validateGitHubRepository = (repository: string): ValidationResult => {
  ```

- Includes description of what method does, parameters, and return type
- Not used for utility functions unless complex

## Function Design

**Size:**
- Services: Methods range from 10-50 lines for main methods
- Utilities: Functions typically 5-20 lines for clarity and reusability
- Complex algorithms: Broken into private helper methods (e.g., `processImportedTokens` delegates to `detectStructureType`, `createTokenGroupsFromTokenSet`)

**Parameters:**
- Single parameter functions: Direct usage
- Multiple parameters: Grouped by logical category (e.g., `token, repository, path, branch`)
- Optional parameters: Use defaults in function signature: `branch: string = 'main'`
- Async methods: Always return Promise with explicit type: `async getBranches(...): Promise<GitHubBranch[]>`

**Return Values:**
- Services: Return specific typed objects (`GitHubBranch[]`, `ValidationResult`, `TokenGroup[]`)
- Utilities: Return typed data or void
- Handlers/callbacks: Return void or Promise<void>

## Module Design

**Exports:**
- Barrel files (index.ts): Re-export all public items from directory:
  ```typescript
  // services/index.ts
  export * from './token.service';
  export * from './github.service';
  export * from './file.service';
  export * from './figma.service';
  ```

- Types exported from `types/index.ts`
- Utils exported from `utils/index.ts`

**Barrel Files:**
- Used in `src/app/services/index.ts`: Groups and re-exports all services
- Used in `src/app/utils/index.ts`: Groups and re-exports all utilities
- Used in `src/app/types/index.ts`: Groups and re-exports all type definitions
- Used in `src/app/components/index.ts`: Groups and re-exports components
- Simplifies component imports: `import { TokenService, GitHubService } from '../services'` instead of individual paths

**Visibility:**
- Services: Injectable with root-level providedIn: `@Injectable({ providedIn: 'root' })`
- Private methods: Used for internal helper logic in services (e.g., `private detectGlobalNamespaceFromPaths`, `private isTokenDefinition`)
- Dependency injection: Using `inject()` function in components: `private tokenService = inject(TokenService);`

---

*Convention analysis: 2026-02-25*
