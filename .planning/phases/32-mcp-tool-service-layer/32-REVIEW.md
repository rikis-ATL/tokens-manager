---
phase: 32-mcp-tool-service-layer
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/services/shared/tokens.ts
  - src/services/shared/groups.ts
  - src/services/shared/themes.ts
  - src/mcp/tools/theme-mutations.ts
  - src/mcp/tools/tokens.ts
  - src/mcp/tools/groups.ts
  - src/mcp/server.ts
  - src/app/api/collections/[id]/tokens/route.ts
  - src/app/api/collections/[id]/groups/route.ts
  - src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts
findings:
  critical: 0
  warning: 6
  info: 4
  total: 10
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The MCP tool / shared service layer is well-structured overall. The delegation pattern (MCP tools → shared services → MongoDB) is clean, tool descriptions are thorough, and error handling at the MCP boundary is consistent. Auth boundaries are correct — API routes enforce `requireRole` + `assertOrgOwnership`; MCP is documented as trusted admin-level. The `toMcpContent` helper pattern is good but has been copied three times instead of being extracted to a shared module.

The main concerns are:

1. **Silent success on delete operations** — MongoDB `$unset` and `$pull` are no-ops when the target does not exist. Three delete functions (`deleteToken`, `deleteGroup`, `deleteTheme`) return `success: true` even when nothing was actually removed. Callers cannot distinguish a successful delete from a delete of a non-existent resource.

2. **Data-loss risk in renameGroup** — The destination path is not checked before overwriting, so renaming onto an occupied path silently destroys the existing content.

3. **Type contract mismatch in updateThemeToken** — The API route passes `body.value ?? ''` to the service, converting an absent `value` into an empty string. The service guard `if (value === undefined)` is bypassed, causing tokens to be upserted with an empty string value when only `type` is provided.

4. **Dead code / duplication** — `getNestedValue` and `toMcpContent` are both duplicated across multiple files; `toMcpContent` in tokens.ts has an unused parameter.

---

## Warnings

### WR-01: deleteToken returns success when the token path does not exist

**File:** `src/services/shared/tokens.ts:139-158`
**Issue:** `$unset` on a missing field is a MongoDB no-op. The function checks whether the *collection* was found but not whether the token path actually existed. It returns `{ success: true, message: "Token deleted at path '...'" }` even when the token was never there. The HTTP DELETE handler maps `!serviceResult.success` to 404, so the caller receives a 200 for a path that did not exist.

**Fix:** Read the document first and verify the path exists before issuing the update:
```typescript
export async function deleteToken(
  collectionId: string,
  tokenPath: string
): Promise<ToolResult> {
  const existing = await TokenCollection.findById(collectionId).lean();
  if (!existing) {
    return { success: false, message: `Collection not found: ${collectionId}` };
  }
  const tokens = existing.tokens as Record<string, unknown>;
  if (getNestedValue(tokens, tokenPath) === undefined) {
    return { success: false, message: `Token not found at path '${tokenPath}'` };
  }
  await TokenCollection.findByIdAndUpdate(
    collectionId,
    { $unset: { [`tokens.${tokenPath}`]: "" } }
  );
  return {
    success: true,
    message: `Token deleted at path '${tokenPath}'`,
    data: { path: tokenPath },
  };
}
```

---

### WR-02: deleteGroup returns success when the group path does not exist

**File:** `src/services/shared/groups.ts:148-167`
**Issue:** Same pattern as WR-01. `$unset` on a missing path is a no-op; the service returns `success: true` and "Group deleted" regardless. The HTTP DELETE handler maps failure to 404 but will never see that failure for a non-existent path.

**Fix:** Add an existence check before the update, mirroring the pattern already used in `renameGroup`:
```typescript
const collection = await TokenCollection.findById(collectionId).lean();
if (!collection) {
  return { success: false, message: `Collection not found: ${collectionId}` };
}
const tokens = collection.tokens as Record<string, unknown>;
if (getNestedValue(tokens, groupPath) === undefined) {
  return { success: false, message: `Group path '${groupPath}' not found in collection.` };
}
// proceed with $unset
```

---

### WR-03: deleteTheme silently succeeds when the theme ID does not exist

**File:** `src/services/shared/themes.ts:317-336`
**Issue:** MongoDB `$pull` with `{ id: themeId }` is a no-op when no matching subdocument exists. The function checks whether the *collection* was found but not whether the theme was actually present. A caller passing a stale or invalid `themeId` receives `{ success: true, message: "Theme '...' deleted" }`.

**Fix:** Verify the theme exists before pulling:
```typescript
const before = await TokenCollection.findById(collectionId).lean() as Record<string, unknown> | null;
if (!before) {
  return { success: false, message: `Collection not found: ${collectionId}` };
}
const themes = (before.themes as Array<Record<string, unknown>>) ?? [];
if (!themes.some((t) => (t.id as string) === themeId)) {
  return { success: false, message: `Theme '${themeId}' not found` };
}
// proceed with $pull
```

---

### WR-04: renameGroup silently overwrites an existing destination path

**File:** `src/services/shared/groups.ts:104-138`
**Issue:** `renameGroup` checks that `oldPath` exists (line 117) but does not check whether `newPath` is already occupied. When `newPath` already contains tokens, the combined `$set` / `$unset` operation replaces that existing content permanently. This is a data-loss risk whenever an AI tool or API caller makes a mistake on the destination path.

**Fix:** Add a guard immediately after the `oldPath` check:
```typescript
const existingAtNewPath = getNestedValue(tokens, newPath);
if (existingAtNewPath !== undefined) {
  return {
    success: false,
    message: `Group path '${newPath}' already exists. Delete it first or choose a different path.`,
  };
}
```

---

### WR-05: updateThemeToken — HTTP route converts undefined value to empty string, bypassing service guard

**File:** `src/app/api/collections/[id]/themes/[themeId]/tokens/single/route.ts:44`
**Issue:** The PATCH handler validates that at least one of `value` or `type` is present (lines 28-30), then calls the service with `body.value ?? ''`. When a caller sends `{ tokenPath: "colors/brand/primary", type: "dimension" }` (a type-only update), the service receives `value = ""`. The service guard at `themes.ts:162` checks `if (value === undefined)` — but `""` is not `undefined` — so the guard passes and the token is upserted with an empty string value, silently corrupting the token's stored value.

**Fix:** Pass `body.value` directly and update the service signature to match:
```typescript
// route.ts — pass undefined rather than coercing to ''
const serviceResult = await updateThemeToken(
  params.id,
  params.themeId,
  body.tokenPath,
  body.value,       // may be undefined; let the service decide
  body.type
);
```
```typescript
// themes.ts — reflect that value is optional
export async function updateThemeToken(
  collectionId: string,
  themeId: string,
  tokenPath: string,
  value?: string,   // now truly optional
  type?: string
): Promise<ToolResult> {
  if (value === undefined && type === undefined) {
    return { success: false, message: "At least one of 'value' or 'type' must be provided." };
  }
  // update only the fields that are present
}
```

---

### WR-06: updateThemeToken — dead type guard on a non-optional parameter

**File:** `src/services/shared/themes.ts:156-163`
**Issue:** `value` is typed as `string` (not `string | undefined`) on line 156. The runtime guard `if (value === undefined)` at line 162 can never be true under the current type signature, so it is dead code in typed contexts. This is related to WR-05 but is a distinct issue: the type says required, the guard says optional — they are in contradiction.

**Fix:** Align the type with the guard as shown in the WR-05 fix above — change `value: string` to `value?: string` so the guard is meaningful, and update all call sites accordingly.

---

## Info

### IN-01: getNestedValue helper is duplicated across three files

**Files:**
- `src/services/shared/tokens.ts:39-46`
- `src/services/shared/groups.ts:24-31`
- `src/mcp/tools/tokens.ts:36-43`

**Issue:** The same `getNestedValue` function is copy-pasted verbatim in three files. Any future bug fix must be applied in all three locations.

**Fix:** Extract to a shared utility (e.g. `src/services/shared/utils.ts`) and import from all three files:
```typescript
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

### IN-02: toMcpContent helper is duplicated across three MCP tool files

**Files:**
- `src/mcp/tools/tokens.ts:48-72`
- `src/mcp/tools/groups.ts:80-103`
- `src/mcp/tools/theme-mutations.ts:28-51`

**Issue:** The same `toMcpContent` helper is copy-pasted in all three tool modules. Any change to the MCP response format must be applied in all three places.

**Fix:** Extract to `src/mcp/tools/utils.ts` and import in all three modules.

---

### IN-03: toMcpContent in tokens.ts has an unused toolName parameter

**File:** `src/mcp/tools/tokens.ts:51`
**Issue:** The `toMcpContent` function accepts a `toolName: string` second parameter that is never referenced inside the function body. Every call site passes a string literal (`"create_token"`, `"update_token"`, etc.) that is silently ignored. The counterpart helpers in `groups.ts` and `theme-mutations.ts` do not have this parameter.

**Fix:** Remove the parameter from the signature and drop the second argument from all four call sites (lines 359, 409, 451, 499):
```typescript
// Before
function toMcpContent(result: ..., toolName: string): ...

// After
function toMcpContent(result: ...): ...
```

---

### IN-04: createGroup — findByIdAndUpdate return value not captured

**File:** `src/services/shared/groups.ts:83-87`
**Issue:** Unlike all other service functions in this phase, `createGroup` does not capture the return value of `findByIdAndUpdate` and so cannot detect if the collection disappeared between the initial `findById` check (line 47) and the update. The race window is narrow, but the pattern is inconsistent with the rest of the file.

**Fix:** Capture and check the result:
```typescript
const updated = await TokenCollection.findByIdAndUpdate(
  collectionId,
  { $set: { [`tokens.${groupPath}`]: groupObject } },
  { new: true }
);
if (!updated) {
  return { success: false, message: `Collection not found: ${collectionId}` };
}
```

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
