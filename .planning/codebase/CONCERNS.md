# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Untyped API Responses:**
- Issue: Widespread use of `any` type in API service classes reduces type safety
- Files: `src/services/github.service.ts` (lines 79, 86, 109, 172, 192, 267, 313, 334, 358), `src/services/figma.service.ts` (line 65)
- Impact: Silent failures at runtime, difficult to debug unexpected API response structures, no compile-time validation
- Fix approach: Create proper TypeScript interfaces for all GitHub and Figma API responses; replace `any` with specific types

**Duplicate Component Forms:**
- Issue: Two separate token generator components exist (`TokenGeneratorForm.tsx` and `TokenGeneratorFormNew.tsx`)
- Files: `src/components/TokenGeneratorForm.tsx` (546 lines), `src/components/TokenGeneratorFormNew.tsx` (850 lines)
- Impact: Code duplication, maintenance overhead, inconsistent behavior between implementations, confusion about which to use
- Fix approach: Consolidate into single component, migrate `TokenGeneratorFormNew` features into `TokenGeneratorForm`, test comprehensively before removal

**Multiple Token Processing Paths:**
- Issue: Token reference resolution implemented twice in separate locations with different logic
- Files: `src/services/token.service.ts` (lines 342-399), `src/utils/tokenUpdater.ts` (lines 106-127)
- Impact: Inconsistent token resolution, bugs in one path not caught in the other, maintenance nightmare
- Fix approach: Unify token resolution into single location, create shared token reference resolution module

**Large Component Files:**
- Issue: `TokenGeneratorFormNew.tsx` is 850 lines; `TokenGeneratorForm.tsx` is 546 lines; `GitHubConfig.tsx` is 399 lines
- Files: `src/components/TokenGeneratorFormNew.tsx`, `src/components/TokenGeneratorForm.tsx`, `src/components/GitHubConfig.tsx`
- Impact: Difficult to test, hard to maintain, high cognitive load, difficult to reuse logic
- Fix approach: Break into smaller, focused components; extract form logic into custom hooks; extract GitHub integration into separate module

**Workspace Configuration Inconsistency:**
- Issue: Three separate workspace packages (`token-manager-stencil`, `token-manager-vite`, `token-manager-angular`) but only some referenced in root package.json
- Files: `package.json` (workspaces only include stencil and vite, not angular)
- Impact: Build scripts may not work as expected for all packages, deployment confusion, unclear which package is active
- Fix approach: Document the purpose of each workspace package; clarify development/build workflow; consider consolidating if packages are inactive

## Known Bugs

**Token Reference Resolution with Namespace Stripping:**
- Symptoms: Token references may resolve incorrectly when namespace is stripped from group paths during import
- Files: `src/services/token.service.ts` (lines 342-399), particularly lines 374-383
- Trigger: Import tokens from GitHub with Structure B format (namespace wrapper), then attempt to resolve references
- Workaround: Manually verify resolved values in preview dialog before saving; test with simple token structures first
- Root cause: Path matching logic at line 374 uses `cleanRef.endsWith('.' + fullPath)` which may match partial paths incorrectly

**Directory Import Metadata Collection:**
- Symptoms: File metadata may be incomplete when importing from nested directories
- Files: `src/app/api/import/github/route.ts` (line 45-49)
- Trigger: Import from directory with nested subdirectories
- Current issue: `lastModified` field set to `git_url` instead of actual commit date (line 201 in GET endpoint)
- Root cause: Limited GitHub API information available without additional API calls

## Error Handling Gaps

**Unhandled Promise Rejections in Parallel Operations:**
- Issue: `createOrUpdateMultipleFiles` uses `Promise.all()` without catch handler
- Files: `src/services/github.service.ts` (lines 238-251)
- Impact: One failed file upload fails entire operation; no partial success handling
- Fix approach: Implement `Promise.allSettled()` with per-file error handling and reporting

**Silent Failures in Directory Processing:**
- Issue: Directory processing catches errors and continues, but only logs warnings
- Files: `src/app/api/import/github/route.ts` (lines 51-53, 68-70)
- Impact: Users don't see which files failed to import; errors silently swallowed
- Fix approach: Collect failed files and return them in response; implement retry logic or explicit user notification

**Incomplete Error Messages in Token Service:**
- Issue: `detectStructureType` returns defaults without clear error indication when input is invalid
- Files: `src/services/token.service.ts` (lines 19-25)
- Impact: Silent failures when invalid token structures passed; user unaware of processing error
- Fix approach: Distinguish between "no error" and "default fallback" cases; return error status

**GitHub API Rate Limiting Not Handled:**
- Issue: No detection or handling of GitHub API rate limit responses (429)
- Files: `src/services/github.service.ts` (all fetch calls), `src/app/api/import/github/route.ts` (all fetch calls)
- Impact: Operations silently fail at rate limit without user awareness; no backoff or retry logic
- Fix approach: Detect 429 status code; implement exponential backoff; inform user of rate limit

## Security Considerations

**GitHub Token Exposure in Logs:**
- Risk: GitHub tokens may be logged in error messages
- Files: `src/services/github.service.ts` (line 157 logs URL which may contain token in query params), `src/app/api/import/github/route.ts` (line 154 logs full error)
- Current mitigation: Error messages sanitized in `handleApiResponse` method
- Recommendations:
  - Never include query parameters in error logs
  - Implement token masking function for all error messages
  - Use environment variable for logs level instead of always logging errors

**Credentials in Request URLs:**
- Risk: GitHub tokens passed as query parameters in some places
- Files: `src/app/api/import/github/route.ts` (line 168 reads token from URL query param)
- Current mitigation: GET endpoint uses query params for listing files
- Recommendations:
  - Move GitHub token to POST request body instead of query params
  - Use Authorization header only
  - Validate that tokens never appear in URLs

**No CORS or CSRF Protection Documented:**
- Risk: API endpoints accessible from any origin
- Files: `src/app/api/import/github/route.ts`, `src/app/api/export/github/route.ts`, and other API routes
- Impact: Potential for cross-site attacks if tokens stored in cookies
- Recommendations: Implement CORS headers, validate origin, add CSRF tokens

**No Input Validation on API Routes:**
- Risk: Repository paths, branch names, and file paths not validated before use in GitHub API calls
- Files: `src/app/api/import/github/route.ts` (line 87), `src/app/api/export/github/route.ts` (line 23)
- Impact: Potential for directory traversal or injection attacks
- Recommendations:
  - Validate all path inputs using GitHubService.validateRepository()
  - Use parameterized GitHub API calls
  - Implement strict allowlist for valid paths

## Performance Bottlenecks

**Recursive Directory Traversal Without Depth Limit:**
- Problem: `findJsonFilesInDirectory` recursively traverses entire directory tree without depth limit
- Files: `src/services/github.service.ts` (lines 278-306)
- Current capacity: Works for typical design token repositories; may timeout on very large repos
- Limit: GitHub API has 60-second timeout per request
- Scaling path:
  - Add configurable maximum depth parameter
  - Implement pagination for large directories
  - Consider using GitHub GraphQL API for better performance

**Synchronous JSON Parsing on Large Files:**
- Problem: `JSON.parse()` called on potentially large token files without streaming
- Files: `src/app/api/import/github/route.ts` (line 27), `src/app/api/export/github/route.ts` (line 48)
- Impact: Blocks event loop on large token files (>10MB)
- Improvement path:
  - Implement streaming JSON parser for large files
  - Add file size checks before parsing
  - Return error for files exceeding size limit

**No Caching of GitHub API Responses:**
- Problem: Every token import re-fetches from GitHub even if repository/branch unchanged
- Files: All GitHub service methods perform fresh fetch every time
- Impact: Slow repeated imports, excessive API rate limit usage
- Improvement path:
  - Implement in-memory cache with configurable TTL
  - Add cache invalidation options
  - Consider persistent cache with localStorage for offline support

**Token Resolution in Memory:**
- Problem: `getAllTokensWithResolvedRefs` loads all tokens into memory before resolution
- Files: `src/utils/tokenUpdater.ts` (lines 132-140), `src/app/api/tokens/route.ts` (lines 11-66)
- Impact: Memory usage scales with token count; slow on systems with many tokens
- Improvement path:
  - Implement lazy resolution per request
  - Add pagination for token listing
  - Cache resolved values in database for frequently accessed tokens

## Fragile Areas

**Token Structure Detection Algorithm:**
- Files: `src/services/token.service.ts` (lines 19-62)
- Why fragile:
  - Namespace detection relies on hardcoded pattern list (line 36)
  - Complex nesting check is shallow (line 43-44)
  - May incorrectly classify structures with single top-level key that isn't a namespace
- Safe modification:
  - Add configuration option to override namespace detection
  - Document all assumed namespace patterns
  - Add comprehensive test cases for edge cases
- Test coverage: No test files exist for this critical function

**Brand Flattening Logic:**
- Files: Referenced in `TokenGeneratorFormNew.tsx` but specific implementation unclear
- Why fragile:
  - Multiple processing paths for different token structures
  - Hybrid Structure A/B detection adds complexity
  - Path transformation logic applied at multiple levels
- Safe modification:
  - Add feature flags to control processing paths
  - Implement validation at each transformation step
  - Log transformation steps for debugging

**GitHub API Integration Without Retry Logic:**
- Files: All methods in `src/services/github.service.ts`, API routes in `src/app/api/`
- Why fragile:
  - Network timeouts not retried
  - Partial failures in multi-file operations not recovered
  - No exponential backoff
- Safe modification:
  - Wrap all fetch calls in retry wrapper with exponential backoff
  - Implement circuit breaker pattern
  - Add detailed error categorization (network vs API vs validation)

**Deep Component State Management:**
- Files: `src/components/TokenGeneratorFormNew.tsx` (state management scattered across 850 lines)
- Why fragile:
  - State updates in multiple functions
  - Complex nested object modifications
  - No single source of truth
  - Difficult to trace state changes
- Safe modification:
  - Extract state management to custom hook
  - Use reducer pattern for complex state
  - Add logging middleware for state changes
- Test coverage: Gaps in testing component state transitions

## Scaling Limits

**GitHub API Rate Limiting:**
- Current capacity: 5,000 API requests per hour per token (GitHub limit)
- Limit: Typical token import uses 2-5 requests; directory import uses N+1 requests (N = number of files)
- Scaling path:
  - Implement request batching
  - Add user-facing rate limit display
  - Cache repository metadata
  - Consider GitHub App authentication for higher limits (15,000 per hour)

**Memory Usage in Token Resolution:**
- Current capacity: Tested up to ~10,000 tokens per repository
- Limit: All tokens loaded into memory simultaneously
- Scaling path:
  - Implement streaming token processing
  - Add database persistence layer
  - Paginate token results
  - Implement virtual scrolling in UI

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: All core services (TokenService, GitHubService, FigmaService, FileService)
- Files: `src/services/` directory has zero test files
- Risk: High - token processing logic is business critical; bugs could corrupt token data
- Priority: High

**No Integration Tests:**
- What's not tested: Token import → processing → export workflows
- Files: No test files for `src/app/api/` endpoints
- Risk: Medium - workflow integration bugs may only appear under specific conditions
- Priority: High

**No Component Tests:**
- What's not tested: Complex component state management, user interactions
- Files: All files in `src/components/` have zero tests
- Risk: Medium - UI bugs may go undetected; refactoring risks breaking existing functionality
- Priority: Medium

**No API Contract Tests:**
- What's not tested: GitHub/Figma API response handling, error conditions
- Files: No tests for API response parsing in `src/services/github.service.ts` and `src/services/figma.service.ts`
- Risk: High - changes to API responses could break without warning
- Priority: High

**Missing Test Coverage for Token Reference Resolution:**
- What's not tested:
  - Circular reference detection
  - Partial reference resolution (references not found)
  - Cross-file token references
  - Complex namespace stripping scenarios
- Files: `src/services/token.service.ts` (lines 342-399)
- Risk: High - token references are mission critical; broken references could cause cascading failures
- Priority: Critical

**Missing Error Scenario Tests:**
- What's not tested:
  - Network timeouts in GitHub imports
  - Invalid JSON in token files
  - Malformed GitHub responses
  - Rate limiting responses
  - Authorization failures
- Files: `src/app/api/import/github/route.ts`, `src/app/api/export/github/route.ts`
- Risk: High - users may encounter unexpected errors without proper handling
- Priority: High

## Dependencies at Risk

**Next.js Version Compatibility:**
- Risk: Package.json specifies `"next": "13.5.6"` - old version with potential security issues
- Impact: Latest patches and security fixes not available
- Migration plan:
  - Upgrade to Next.js 14+ to get App Router improvements
  - Review breaking changes
  - Test thoroughly after upgrade

**TypeScript Strictness Issues:**
- Risk: `"skipLibCheck": true` means dependency type errors not caught
- Impact: Unexpected runtime errors from type inconsistencies in dependencies
- Recommendations:
  - Set `skipLibCheck: false` and fix dependency type issues
  - Monitor dependency updates for type safety

**Missing Test Framework:**
- Risk: No test runner configured (no Jest, Vitest, etc.)
- Impact: Cannot implement unit/integration tests without setup
- Recommendations:
  - Install and configure Vitest for Node environments
  - Install and configure testing library for React components
  - Add pre-commit hooks to run tests

## Missing Critical Features

**No Undo/Redo Functionality:**
- Problem: Users who modify tokens have no undo capability
- Blocks: Users need safety net for experimental token changes
- Suggested approach:
  - Implement command pattern for all token modifications
  - Add in-memory undo/redo stack with configurable depth
  - Persist undo history to localStorage for session recovery

**No Token Versioning:**
- Problem: No history of token changes; cannot revert to previous token states
- Blocks: Auditing and compliance requirements; debugging production issues
- Suggested approach:
  - Implement git-based version control for tokens
  - Create backup system with retention policy
  - Add change tracking to token metadata

**No Token Diff/Merge Functionality:**
- Problem: Cannot see differences between imported and current tokens
- Blocks: Users cannot validate imports before applying them
- Suggested approach:
  - Implement three-way merge for conflicting tokens
  - Add visual diff UI component
  - Create merge strategy selection interface

**No Token Validation Rules:**
- Problem: Any value accepted for tokens without constraint validation
- Blocks: Cannot enforce naming conventions, value ranges, or format requirements
- Suggested approach:
  - Create token validation schema system
  - Allow users to define constraints (e.g., color tokens must be valid hex)
  - Implement constraint checking in UI and on import

**No Multi-User Collaboration:**
- Problem: Application assumes single user
- Blocks: Teams cannot work on tokens together; conflicts when multiple people import
- Suggested approach:
  - Add user authentication system
  - Implement conflict resolution for concurrent edits
  - Add change attribution and audit trails

---

*Concerns audit: 2026-02-25*
