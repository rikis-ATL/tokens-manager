# Roadmap: ATUI Tokens Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-02-28)
- 🚧 **v1.1 shadcn UI** — Phases 1-2 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Database Foundation (3/3 plans) — completed 2026-02-25
- [x] Phase 2: View Integration (2/2 plans) — completed 2026-02-25
- [x] Phase 3: Generator Form (4/4 plans) — completed 2026-02-26
- [x] Phase 4: Collection Management (3/3 plans) — completed 2026-02-26
- [x] Phase 5: Export Style Dictionary (2/2 plans) — completed 2026-02-26
- [x] Phase 6: Collection UX Improvements (3/3 plans) — completed 2026-02-28
- [x] Phase 7: Fix Figma Integration (6/6 plans) — completed 2026-02-28

See: `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Database Foundation | 2/8 | In Progress|  | 2026-02-25 |
| 2. View Integration | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Generator Form | v1.0 | 4/4 | Complete | 2026-02-26 |
| 4. Collection Management | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. Export Style Dictionary | v1.0 | 2/2 | Complete | 2026-02-26 |
| 6. Collection UX Improvements | v1.0 | 3/3 | Complete | 2026-02-28 |
| 7. Fix Figma Integration | v1.0 | 6/6 | Complete | 2026-02-28 |
| 1. shadcn UI Components | v1.1 | 1/8 | In progress | - |
| 2. Test ATUI Component Library | v1.1 | 1/1 | Complete | 2026-03-01 |

### 🚧 v1.1 shadcn UI

### Phase 1: ATUI Component Migration + Color Pickers

**Goal:** Migrate all common UI elements to ATUI Stencil components (`@alliedtelesis-labs-nz/atui-components-stencil`) and replace all color token fields with native `<input type="color">` pickers
**Depends on:** Nothing (first phase of v1.1)
**Plans:** 2/8 plans executed

Plans:
- [x] 01-01-PLAN.md — Create AtuiProvider, global JSX types, update root layout (complete 2026-03-01)
- [ ] 01-02-PLAN.md — Migrate page.tsx: at-tabs navigation, at-button actions
- [ ] 01-03-PLAN.md — Migrate CollectionSelector (at-select), SharedCollectionHeader + CollectionActions (at-button, at-dialog, at-input)
- [ ] 01-04-PLAN.md — Migrate SaveCollectionDialog, LoadCollectionDialog, BuildTokensModal (at-dialog, at-button, at-input)
- [ ] 01-05-PLAN.md — Migrate FigmaConfig, GitHubConfig (at-dialog, at-input, at-select, at-button)
- [ ] 01-06-PLAN.md — Migrate ExportToFigmaDialog, ImportFromFigmaDialog (at-dialog, at-select, at-input, at-button)
- [ ] 01-07-PLAN.md — Migrate TokenGeneratorFormNew (at-button, at-input, at-select, native color picker)
- [ ] 01-08-PLAN.md — Human verification checkpoint

### Phase 2: Test ATUI component library - confirm Button can be imported and used

**Goal:** Confirm the ATUI Stencil component library Button can be imported and rendered in the Next.js 13.5.6 App Router by creating a minimal /dev-test sandbox page that establishes the integration pattern for Phase 1.
**Depends on:** Phase 1
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — Create /dev-test sandbox page with ATUI Button integration (complete 2026-03-01)
