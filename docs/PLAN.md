# Execution plan

## Current status

- Active phase: **2. Markdown foundation** (not started).
- Done so far: phase 0 (setup), phase 1 (data layer: Dexie schema v1, zod models, repositories, live-query hooks, 30 unit tests).
- Next step: phase 2, first item.

## Phases

Phases 1–5 form the usable core. Phases 6–8 are independent of each other.

### 0. Setup
- [x] Scaffold Vite + React + TypeScript (strict) in this folder.
- [x] Tailwind CSS v4.
- [x] shadcn/ui init + base components (Button, Input, Textarea, Dialog, Drawer/Sheet, AlertDialog, Tabs, Toggle Group, Dropdown Menu, Sonner, Skeleton).
- [x] ESLint + Prettier.
- [x] Vitest + Testing Library + `fake-indexeddb`.
- [x] Playwright with mobile (e.g. 360×800) and desktop projects.
- [x] Folder structure from `docs/ARCHITECTURE.md`.
- [x] Fill the "Commands" section of `CLAUDE.md`.

Done when: `dev`, `build`, `lint`, `test` and `e2e` scripts all pass on an empty app.

### 1. Data layer
- [x] Dexie instance and schema v1.
- [x] zod schemas + TS types for `Timeline` and `TimelineNode`.
- [x] Timeline repository: create, update, delete (cascade), get, list (ordered by `updated_at` desc, limit).
- [x] Node repository: create (append position), update, delete, list by timeline (ordered by position), reorder (transactional renumbering).
- [x] Node writes bump parent `updated_at`.
- [x] `navigator.storage.persist()` on startup.
- [x] Hooks over `useLiveQuery`.

Done when: unit tests cover CRUD, cascade delete, ordering, reorder, `created_at` unchanged on update, parent `updated_at` bump.

### 2. Markdown foundation
- [ ] `MarkdownInline`, `MarkdownBlock`, `MarkdownExcerpt`, `MarkdownEditor` (Write/Preview tabs).
- [ ] Verify `line-clamp` with nested blocks; apply fallback if needed.

Done when: tests cover allowed elements per variant, raw HTML not rendered, `javascript:` links neutralized.

### 3. Dashboard (master-detail)
- [ ] App layout: two panes on `lg+`, stacked screens below.
- [ ] Timeline list with infinite scroll (growing limit + IntersectionObserver), loading skeleton, empty state.
- [ ] Timeline create/edit form (title, description, orientation).
- [ ] Delete timeline with confirmation (cascade).

Done when: E2E on mobile and desktop: create several timelines, scroll loads more, select one, edit, delete with confirmation.

### 4. Timeline view
- [ ] Header with title, orientation toggle (persisted), actions menu.
- [ ] Vertical and horizontal layouts (`snap-x` for horizontal).
- [ ] Node card: inline title + clamped excerpt + drag handle placeholder.
- [ ] Empty state + "+ Node" action.

Done when: both orientations render correctly at 360 px and desktop widths; orientation survives reload.

### 5. Node CRUD + detail
- [ ] Node detail route: read mode (full Markdown), "Edit" switches to form in place.
- [ ] Node create/edit form (react-hook-form + zod).
- [ ] Full screen on mobile, Dialog on desktop.
- [ ] Delete node with confirmation.
- [ ] Unsaved-changes guard (`useUnsavedChangesGuard`) on node and timeline forms: dialog close, Cancel, in-app navigation, browser back, `beforeunload`.

Done when: E2E: create/view/edit/delete a node; with a dirty form, Esc/X/back/Cancel asks for confirmation; with a clean form or after saving, it does not.

### 6. Drag and drop
- [ ] Sortable list in both orientations.
- [ ] Pointer, touch (activation delay) and keyboard sensors; drag handle only.
- [ ] Optimistic reorder + transactional persistence.

Done when: E2E: reorder by mouse and by keyboard, reload, order kept. Manual check on a real touch device.

### 7. Import / Export
- [ ] Export timeline to JSON (format in `docs/ARCHITECTURE.md`).
- [ ] Import parser with zod validation, size limit, readable errors.
- [ ] Preview step (title, node count).
- [ ] "Import as new" (dashboard) and "Replace" (timeline menu, with confirmation).

Done when: round trip (export → import as new) produces equivalent data with node `created_at` preserved; replace keeps the target id; invalid files write nothing and show an error.

### 8. Polish
- [ ] Accessibility pass (focus order, labels, focus return after dialogs).
- [ ] Dark mode (shadcn/ui theme).
- [ ] Toasts for save/delete/import/export outcomes.
- [ ] Optional: PWA (installable, offline cache).
- [ ] README with usage and backup advice.

Done when: Lighthouse accessibility ≥ 90 on mobile.
