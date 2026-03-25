# Clean Code Ruleset

**Purpose:** Canonical clean code standards for the ATUI Tokens Manager codebase. All contributors and AI assistants MUST follow these rules.

## Core Principles

### 1. SOLID

- **Single Responsibility**: One reason to change per function/component/class.
- **Open/Closed**: Extend via composition (props, callbacks, strategies), not by modifying existing code.
- **Liskov Substitution**: Implementations honor their interface contracts.
- **Interface Segregation**: Narrow interfaces; avoid god objects.
- **Dependency Inversion**: Depend on abstractions; inject dependencies.

### 2. Separation of Concerns

| Layer | Responsibility | Must NOT |
|-------|----------------|----------|
| **Components** | Render UI, handle user events, call callbacks | Contain business logic, direct API calls, complex algorithms |
| **Services** | Business logic, external APIs, data transformation | Render UI, depend on React/Next |
| **Utils** | Pure functions, helpers, validation | Have side effects, import React/Next |
| **API routes** | Parse request, validate, call service, return response | Contain business logic, duplicate service code |

### 3. Function Size and Structure

- **Target**: 5–30 lines per function.
- **Max**: ~50 lines; beyond that, extract helpers.
- **Parameters**: Prefer ≤4; use `{ options }` object for more.
- **Early returns**: Use guard clauses; avoid `if/else` pyramids.
- **Nesting**: Max 3 levels; extract to named functions if deeper.

### 4. Component Size

- **Target**: <300 lines per component file.
- **Extract when**: Logic grows, multiple concerns, repeated JSX.
- **Extraction targets**: Custom hooks, subcomponents, utils.

### 5. Naming

- **Functions**: `verbNoun` — `validateToken`, `formatFileSize`, `createToast`
- **Booleans**: `is/has/can/should` prefix — `isLoading`, `hasChildren`
- **Constants**: `UPPER_SNAKE_CASE` — `DEFAULT_THEME_ID`, `TOKEN_TYPES`
- **Types**: `PascalCase` — `TokenGroup`, `GraphGroupState`

### 6. Type Safety

- **No `any`**: Use proper types or `unknown` with type guards.
- **Strict mode**: TypeScript `strict: true` — no bypasses.
- **API responses**: Define interfaces; validate at boundaries.

### 7. DRY and Reuse

- **Duplicate logic**: Extract to shared util or service.
- **Repeated JSX**: Extract to subcomponent.
- **Repeated patterns**: Consider custom hook or HOC.

### 8. Error Handling

- **Explicit**: Handle errors; don't swallow.
- **User-facing**: Toast or inline message for recoverable errors.
- **Logging**: `console.error` with context; no sensitive data in logs.

## Enforcement

- **Code review**: Check against this ruleset.
- **Refactors**: When touching a file, improve toward these standards if practical.
- **New code**: Must comply from first commit.

## Related Documents

- `CONVENTIONS.md` — Naming, formatting, imports (includes Clean Code summary)
- `ARCHITECTURE.md` — Layers and data flow
- `STRUCTURE.md` — Where to add new code
- `CLAUDE.md` — AI assistant context (SOLID reminder)
- `.planning/milestones/v1.3-phases/08-clean-code/` — Phase 8 SRP audit
