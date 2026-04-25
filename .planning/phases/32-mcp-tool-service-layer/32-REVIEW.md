---
phase: 32-mcp-tool-service-layer
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/services/shared/tokens.ts
  - src/services/shared/groups.ts
  - src/services/shared/themes.ts
  - src/mcp/tools/theme-mutations.ts
  - src/mcp/tools/tokens.ts
  - src/mcp/tools/groups.ts
  - src/mcp/tools/themes.ts
  - src/mcp/server.ts
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The MCP tool / shared service layer is well-structured. The delegation pattern (MCP tools → shared services → MongoDB) is clean, tool descriptions are thorough, and error handling at the MCP boundary is consistent. The `toMcpContent` helper is a good idea but has been copied three times instead of being extracted to a shared module.

The main concerns are: (1) a path injection issue where unsanitized AI-supplied dot-paths are interpolated directly into MongoDB field keys; (2) several "silent success" bugs where mutation operations return `success: true` even when nothing was actually changed (non-existent token/group/theme); and (3) a dead function parameter in `tokens.ts`.

---

## Critical Issues

### CR-01: Unsanitized dot-paths interpolated into MongoDB field keys

**Files:**
- `src/services/shared/tokens.ts:63-70`, `src/services/shared/tokens.ts:108-109`, `src/services/shared/tokens.ts:143-146`, `src/services/shared/tokens.ts:177-180`
- `src/services/shared/groups.ts:83-86`, `src/services/shared/groups.ts:124-129`, `src/services/shared/groups.ts:152-155`

**Issue:** `tokenPath`, `groupPath`, `oldPath`, and `newPath` are AI-supplied string parameters that are interpolated verbatim into MongoDB update operation keys:

```ts
$set: { [`tokens.${tokenPath}.$value`]: value }
$unset: { [`tokens.${groupPath}`]: "" }
```

There is no validation rejecting paths that contain `$`, `__proto__`, `constructor`, or multiple consecutive dots. Because the MCP server is AI-driven (Claude constructs these paths from natural language), a prompt-injection attack or a confused-deputy scenario could cause MongoDB to write to unintended paths (e.g. `tokens.__proto__.polluted` or `tokens.$where`). MongoDB dot-notation keys beginning with `$` in `$set` operations are rejected by MongoDB 5+ with a `BadValue` error, but paths containing `__proto__` or `constructor` are not rejected by MongoDB and can cause prototype pollution on deserialized objects.

**Fix:** Add a validation helper before any path is used in a MongoDB key. Reject paths that:
- Contain `$`
- Contain `__proto__` or `constructor`
- Contain `..` (double dot, empty segment)
- Start or end with `.`

```ts
function validateTokenPath(path: string): string | null {
  if (!path || typeof path !== "string") return "path must be a non-empty string";
  if (path.startsWith(".") || path.endsWith(".")) return "path must not start or end with '.'";
  if (path.includes("..")) return "path must not contain consecutive dots";
  if (path.includes("$")) return "path must not contain '$'";
  if (/__(proto|constructor|defineGetter|defineSetter)__/i.test(path))
    return "path contains reserved key";
  return null; // valid
}
```

Call at the top of each service function and return `{ success: false, message }` on failure.

---

## Warnings

### WR-01: deleteToken returns success when path did not exist

**File:** `src/services/shared/tokens.ts:139-158`

**Issue:** `$unset` on a non-existent key is a MongoDB no-op. The function checks whether the *collection* was found but does not verify whether the token path actually existed before deletion. It returns `{ success: true, message: "Token deleted at path '...'" }` even when the token never existed.

**Fix:** Fetch the document first (or use a projection), verify the token path exists, and return an appropriate error if not:

```ts
const existing = await TokenCollection.findById(collectionId).lean();
if (!existing) return { success: false, message: `Collection not found: ${collectionId}` };
const tokens = existing.tokens as Record<string, unknown>;
const node = getNestedValue(tokens, tokenPath);
if (node === undefined) {
  return { success: false, message: `Token not found at path '${tokenPath}'` };
}
// proceed with $unset
```

---

### WR-02: deleteGroup returns success when group did not exist

**File:** `src/services/shared/groups.ts:148-167`

**Issue:** Same pattern as WR-01. MongoDB `$unset` on a non-existent path is a no-op; the service returns `success: true` and "Group deleted" regardless.

**Fix:** Follow the same pattern as `renameGroup` — call `findById().lean()` first, call `getNestedValue`, and return a failure if the path is not found before issuing the update.

---

### WR-03: deleteTheme silently succeeds when themeId does not exist

**File:** `src/services/shared/themes.ts:317-336`

**Issue:** MongoDB `$pull` with `{ id: themeId }` is a no-op when no matching subdocument exists. The function checks whether the *collection* was found but not whether the theme actually existed. A caller passing a stale or invalid `themeId` receives `{ success: true, message: "Theme '...' deleted" }`.

**Fix:** Check the returned document's themes array to confirm the theme was removed, or fetch upfront:

```ts
const before = await TokenCollection.findById(collectionId).lean();
if (!before) return { success: false, message: `Collection not found: ${collectionId}` };
const exists = (before.themes ?? []).some((t: Record<string, unknown>) => t.id === themeId);
if (!exists) return { success: false, message: `Theme '${themeId}' not found` };
// proceed with $pull
```

---

### WR-04: renameGroup update result is not checked

**File:** `src/services/shared/groups.ts:124-137`

**Issue:** The `findByIdAndUpdate` call result is discarded (`await TokenCollection.findByIdAndUpdate(...)`). The collection existence was already checked with `findById().lean()` on line 109, but between that read and the update a race condition could cause the update to affect zero documents. The function has no awareness of this; it returns success unconditionally.

**Fix:** Capture and check the result:

```ts
const updated = await TokenCollection.findByIdAndUpdate(
  collectionId,
  { $set: { [`tokens.${newPath}`]: groupValue }, $unset: { [`tokens.${oldPath}`]: "" } },
  { new: true }
);
if (!updated) {
  return { success: false, message: `Collection not found: ${collectionId}` };
}
```

---

### WR-05: Dead parameter in toMcpContent in tokens.ts

**File:** `src/mcp/tools/tokens.ts:48-72`

**Issue:** `toMcpContent` has a `toolName: string` second parameter (line 50) that is never referenced inside the function body. Every call site passes a string literal (`"create_token"`, `"update_token"`, etc.) that is silently ignored. This is misleading — a reader would assume the parameter affects behavior.

**Fix:** Remove the unused parameter from the signature and all call sites:

```ts
// Before
function toMcpContent(result: ..., toolName: string): ...

// After
function toMcpContent(result: ...): ...
```

---

### WR-06: updateThemeToken — type guard `if (value === undefined)` on a required parameter

**File:** `src/services/shared/themes.ts:162`

**Issue:** `value` is typed as `string` (not `string | undefined`) on line 156. The runtime guard `if (value === undefined)` can never be true in TypeScript, so the validation is dead code in typed contexts. If called from untyped JS (e.g., the MCP handler passes the raw Zod-parsed object), the guard would be needed but the parameter type would need to be `string | undefined`.

**Fix:** Either change the parameter type to reflect that the guard is meaningful:

```ts
export async function updateThemeToken(
  collectionId: string,
  themeId: string,
  tokenPath: string,
  value: string | undefined,  // make optional explicit
  type?: string
): Promise<ToolResult>
```

Or remove the guard and rely on Zod validation at the tool layer. Pick one — do not have a dead guard and a non-optional type simultaneously.

---

## Info

### IN-01: getNestedValue helper duplicated three times

**Files:**
- `src/services/shared/tokens.ts:39-46`
- `src/services/shared/groups.ts:24-31`
- `src/mcp/tools/tokens.ts:36-43`

**Issue:** The same `getNestedValue` function is copy-pasted verbatim across three files. Any future fix or change needs to be applied in all three places.

**Fix:** Extract to a shared utility, e.g. `src/services/shared/utils.ts`, and import from all three locations:

```ts
// src/services/shared/utils.ts
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
```

---

### IN-02: toMcpContent helper duplicated three times

**Files:**
- `src/mcp/tools/tokens.ts:48-72` (with spurious extra parameter — see WR-05)
- `src/mcp/tools/groups.ts:80-103`
- `src/mcp/tools/theme-mutations.ts:28-51`

**Issue:** Same helper, three copies, same maintenance burden as IN-01.

**Fix:** Extract to `src/mcp/tools/utils.ts` and import in all three tool modules.

---

### IN-03: createGroup — return value of findByIdAndUpdate not captured

**File:** `src/services/shared/groups.ts:83-87`

**Issue:** Unlike other service functions, `createGroup` does not capture the return value of `findByIdAndUpdate` and therefore cannot detect if the collection disappeared between the initial `findById` check (line 47) and the update. The race window is narrow but the pattern is inconsistent.

**Fix:** Capture and check the result for consistency with the rest of the service:

```ts
const updated = await TokenCollection.findByIdAndUpdate(...);
if (!updated) {
  return { success: false, message: `Collection not found: ${collectionId}` };
}
```

---

### IN-04: updateThemeToken — misleading comment about deep-clone scope

**File:** `src/services/shared/themes.ts:187-189`

**Issue:** The comment "Deep-clone to avoid mutating the lean result" refers to `JSON.parse(JSON.stringify(themes[themeIndex]))`. However, on line 189, `themeTokens` is cast from `theme.tokens` with no separate clone — mutations to `group.tokens` happen in place on `themeTokens`. This is not a bug (because `theme` itself is the clone), but the comment implies the clone boundary is at `theme`, not at `themeTokens`. A future reader may add code expecting `themeTokens` to be independently cloneable.

**Fix:** Add a clarifying comment:

```ts
// Deep-clone the theme entry to avoid mutating the lean result.
// themeTokens is aliased from the clone's .tokens — mutations are safe.
const theme = JSON.parse(JSON.stringify(themes[themeIndex])) as Record<string, unknown>;
const themeTokens = (theme.tokens as TokenGroup[]) ?? [];
```

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
