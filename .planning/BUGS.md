# Bugs Tracking

## ✅ FIXED - 2026-04-01

All bugs reported have been fixed. See `BUGFIX_SUMMARY.md` for detailed information.

### Fixed Issues:
1. ✅ Inherited token values missing .value suffix
2. ✅ JSON import token reference handling  
3. ✅ CSS export showing raw references instead of resolved values
4. ✅ Undo/Redo implementation with toast feedback
5. ✅ Moving groups to subgroups losing tokens
6. ✅ Group position not persisting on reload
7. ✅ Unresolved token reference visual feedback
8. ✅ JSON graph node token types matching table

### Files Modified:
- `src/components/tokens/TokenReferencePicker.tsx`
- `src/services/file.service.ts`
- `src/app/collections/[id]/tokens/page.tsx`
- `src/app/api/collections/[id]/route.ts`
- `src/components/tokens/TokenGeneratorForm.tsx`
- `src/components/graph/nodes/JsonNode.tsx`
- `src/components/graph/nodes/TokenOutputNode.tsx`
- `src/components/graph/nodes/GroupCreatorNode.tsx`

See `BUGFIX_SUMMARY.md` for complete details and testing recommendations.






