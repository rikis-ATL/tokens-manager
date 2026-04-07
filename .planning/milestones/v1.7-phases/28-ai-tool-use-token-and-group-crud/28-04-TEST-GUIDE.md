# Phase 28 Human Verification Test Guide

> **Milestone reminder:** Do not treat v1.7 AI tool use as closed until you complete this guide and sign off. See `.planning/v1.7-HUMAN-GATES.md`.

**Status:** ⏸️ READY FOR TESTING  
**Estimated Time:** 15-20 minutes  
**Prerequisites:** Dev server running (`yarn dev`)

---

## Setup

1. Start the dev server:
   ```bash
   yarn dev
   ```

2. Navigate to any collection's Tokens page:
   ```
   http://localhost:3001/collections/[COLLECTION_ID]/tokens
   ```

3. Click the **MessageSquare** button in the header to open the AI chat panel

---

## Test Scenarios

### ✅ Test 1: Token Creation (AI-05)

**Steps:**
1. In the AI chat panel, type:
   ```
   Create a token called color.brand.primary with value #0056D2
   ```

2. **Expected AI behavior:**
   - AI describes what it will do
   - Calls `create_token` tool
   - Confirms the token was created

3. **Verify:**
   - Token appears in the token table (may need page refresh)
   - Token path: `color.brand.primary`
   - Token value: `#0056D2`

**Result:** [ ] PASS  [ ] FAIL  [ ] SKIP

---

### ✅ Test 2: Token Editing (AI-06)

**Steps:**
1. Type:
   ```
   Change color.brand.primary to #FF6600
   ```

2. **Expected AI behavior:**
   - Calls `update_token` tool
   - Confirms the change

3. **Verify:**
   - Token value updated in the table
   - New value: `#FF6600`

**Result:** [ ] PASS  [ ] FAIL  [ ] SKIP

---

### ✅ Test 3: Token Deletion with Confirmation (AI-07)

**Steps:**
1. Type:
   ```
   Delete the token color.brand.primary
   ```

2. **Expected AI behavior:**
   - Lists the token to be deleted
   - Asks "Shall I proceed?" (or similar confirmation)

3. Respond:
   ```
   Yes, proceed
   ```

4. **Expected AI behavior:**
   - Calls `delete_token` tool
   - Confirms deletion

5. **Verify:**
   - Token removed from the table

**Result:** [ ] PASS  [ ] FAIL  [ ] SKIP

---

### ✅ Test 4: Group Rename (AI-09)

**Steps:**
1. If you have a group (e.g., "colors.brand"), type:
   ```
   Rename the group colors.brand to colors.main
   ```
   *(Adjust group names based on your collection)*

2. **Expected AI behavior:**
   - Calls `rename_group` tool
   - Confirms the rename

3. **Verify:**
   - Group path updated in the tree sidebar
   - All tokens in group moved to new path

**Result:** [ ] PASS  [ ] FAIL  [ ] SKIP

---

### ✅ Test 5: Error Handling

**Steps:**
1. Type:
   ```
   Delete the token nonexistent.path.here
   ```

2. **Expected AI behavior:**
   - Attempts the tool call
   - Receives an error from the API
   - Explains the issue in plain language (e.g., "I couldn't find that token")

3. **Verify:**
   - Error message is user-friendly
   - AI doesn't crash or show raw error objects

**Result:** [ ] PASS  [ ] FAIL  [ ] SKIP

---

### ✅ Test 6: API Endpoint Routing (AI-15)

**Steps:**
1. Open browser DevTools → Network tab

2. Perform any tool use operation (e.g., create a token)

3. **Expected network activity:**
   - `POST /api/ai/chat` (the chat request)
   - `POST /api/collections/[id]/tokens` (or similar endpoint for the tool action)
   - **NO** direct MongoDB connections visible

4. **Verify:**
   - All tool operations route through HTTP API endpoints
   - AI is NOT writing directly to database

**Result:** [ ] PASS  [ ] FAIL  [ ] SKIP

---

## Summary

**Total Tests:** 6  
**Passed:** ___  
**Failed:** ___  
**Skipped:** ___  

**Overall Status:** [ ] ALL PASS  [ ] SOME FAIL  [ ] BLOCKED

---

## Issues Encountered

*(Document any issues, unexpected behavior, or notes here)*

---

## Next Steps

1. If **ALL PASS**: Type "approved" and I'll create the 28-04-SUMMARY.md and 28-VERIFICATION.md
2. If **SOME FAIL**: Describe the issues and I'll help debug
3. If **BLOCKED**: Let me know what's blocking the tests

---

**Test Date:** ___________  
**Tester:** ___________  
**Build Version:** main @ commit 2597607
