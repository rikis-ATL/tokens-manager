---
status: resolved
trigger: "tokens added/changed in the TokenGeneratorForm are not being saved to the database. Every time the tokens page loads, the collection resets (tokens disappear)."
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — Two compounding bugs; the primary is persistGraphState overwriting tokens with {}
test: Full code trace completed
expecting: N/A — root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: Tokens added/changed in TokenGeneratorForm persist after page reload
actual: Every page load resets the collection — tokens disappear
errors: None reported
reproduction: Add/change tokens in TokenGeneratorForm, interact with graph panel (triggering auto-save), reload page — tokens are gone
started: Unknown

## Eliminated

- hypothesis: "PUT API route is broken or drops tokens"
  evidence: route.ts at line 43–61 correctly accepts body.tokens and passes to repo.update()
  timestamp: 2026-03-26

- hypothesis: "loadCollection() overwrites local state incorrectly"
  evidence: loadCollection() sets masterGroups correctly from DB tokens; the overwrite happens AFTER load via form mount side-effect
  timestamp: 2026-03-26

- hypothesis: "handleSave() uses wrong payload"
  evidence: handleSave() correctly uses generateTabTokensRef.current ?? rawCollectionTokens. The problem is generateTabTokensRef.current is {} not null, so rawCollectionTokens is never reached
  timestamp: 2026-03-26

## Evidence

- timestamp: 2026-03-26
  checked: TokenGeneratorForm.tsx line 425-426 (initial state)
  found: tokenGroups is initialized as [{ id: '1', name: 'colors', tokens: [], level: 0, expanded: true }]
  implication: Form always starts with empty default state regardless of what the page loads from DB

- timestamp: 2026-03-26
  checked: TokenGeneratorForm.tsx line 448-469 (onTokensChange effect)
  found: When tokenGroups has 0 tokens, onTokensChange(null, ...) is called. handleTokensChange does `tokens ?? {}` → generateTabTokensRef.current = {}
  implication: generateTabTokensRef.current is {} (empty object, not null) immediately after form mounts

- timestamp: 2026-03-26
  checked: TokenGeneratorForm.tsx line 651-659 (onGroupsChange effect)
  found: On form mount, prevGroupsRef.current is '' so the serialized check passes and onGroupsChange fires with the initial empty default groups
  implication: masterGroups in the page is overwritten with the empty default state on every form mount

- timestamp: 2026-03-26
  checked: page.tsx line 887-891 (TokenGeneratorForm props)
  found: Page passes groups={activeThemeId ? undefined : masterGroups} but TokenGeneratorFormProps has no 'groups' prop
  implication: masterGroups is silently ignored by the form; it never seeds the form's internal tokenGroups state

- timestamp: 2026-03-26
  checked: page.tsx line 386-410 (persistGraphState)
  found: `const tokens = generateTabTokensRef.current ?? rawCollectionTokensRef.current ?? {}` — since generateTabTokensRef.current is {} (not null/undefined), the ?? never falls through to rawCollectionTokensRef.current
  implication: Every graph auto-save (1.5s after node interaction) sends { tokens: {} } to PUT /api/collections/[id], overwriting the DB with empty tokens

- timestamp: 2026-03-26
  checked: page.tsx line 424-428 (graph auto-save timer)
  found: graphAutoSaveTimerRef fires persistGraphState(graphStateMapRef.current) 1.5s after ANY graph state change
  implication: Any user who clicks on the graph panel triggers the wipe — they don't even need to click Save

## Resolution

root_cause: |
  Two compounding bugs:

  PRIMARY (data wipe on graph interaction):
  persistGraphState() at page.tsx:400 uses:
    const tokens = generateTabTokensRef.current ?? rawCollectionTokensRef.current ?? {}
  generateTabTokensRef.current is set to {} (empty object) immediately at form mount because:
    1. TokenGeneratorForm always initializes tokenGroups with a default empty state
    2. The onTokensChange effect fires at mount with allTokens=0 → calls onTokensChange(null, ...)
    3. handleTokensChange does `null ?? {}` → sets generateTabTokensRef.current = {}
    4. {} is truthy, so the ?? chain never reaches rawCollectionTokensRef.current
  Result: Any graph auto-save (triggered 1.5s after any node interaction) sends { tokens: {} }
  to PUT /api/collections/[id], silently wiping all tokens from the database.

  SECONDARY (form ignores loaded data):
  page.tsx:891 passes groups={masterGroups} to TokenGeneratorForm, but TokenGeneratorFormProps
  has no 'groups' prop. The prop is silently ignored. The form never receives the collection's
  loaded token groups, so it always renders empty. The form's onGroupsChange effect fires at
  mount, overwriting masterGroups in the page with the empty default group.

fix: |
  MINIMAL FIX for the PRIMARY bug (the actual data wipe):

  In persistGraphState (page.tsx ~line 400), change the tokens line from:
    const tokens = generateTabTokensRef.current ?? rawCollectionTokensRef.current ?? {};
  to:
    const tokens = (generateTabTokensRef.current && Object.keys(generateTabTokensRef.current).length > 0)
      ? generateTabTokensRef.current
      : (rawCollectionTokensRef.current ?? {});

  This ensures that an empty {} from the form's initial mount state does NOT overwrite the
  DB tokens. Only a non-empty token payload from the generate tab gets used.

  SECONDARY FIX needed (form doesn't show or round-trip loaded tokens):
  The form needs a 'groups' prop in TokenGeneratorFormProps that accepts TokenGroup[] and seeds
  the initial tokenGroups state (or use a useEffect to sync when the prop changes), OR the page
  should pass the loaded tokens via the existing collectionToLoad prop instead of the
  non-existent groups prop.

verification:
files_changed: []
