# Execution plan

## Current status

- Active phase: **8. Polish** (done). Phase 6 manual check on a real touch device still pending.
- Done so far: phase 0 (setup), phase 1 (data layer: Dexie schema v1, zod models, repositories, live-query hooks), phase 2 (Markdown components), phase 3 (router and master-detail layout, timeline list with infinite scroll, timeline create/edit route dialogs, delete with confirmation), phase 4 (timeline view: orientation toggle persisted per timeline, vertical and horizontal layouts, node cards, empty state, "+ Node" action), phase 5 (node create route, node detail with edit in place, delete with confirmation, clickable node cards, unsaved-changes guard on node and timeline forms), phase 6 code (sortable node list in both orientations from the card's drag handle, mouse/touch/keyboard sensors, optimistic reorder with transactional persistence), phase 7 (JSON export download, import parser with size limit and readable errors, preview dialog, "import as new" from the dashboard and "replace from file" from the timeline menu, transactional writes), phase 8 (accessibility pass: landmarks, headings, contrast tokens, focus return after dialogs and navigation; dark mode; toasts; PWA with offline precache; README). 118 unit/integration tests; E2E dashboard, timeline view, node, reorder, transfer, focus, theme/toast and axe accessibility specs pass on mobile and desktop (touch long press emulated via CDP on mobile). Lighthouse accessibility (mobile, production build): 100 on the dashboard and on a timeline with nodes.
- Next step: manual checks on a real touch device: reorder (long press on the grip drags; swiping elsewhere and on the grip scrolls) and PWA install / offline launch. All planned phases are done after that.

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
- [x] `MarkdownInline`, `MarkdownBlock`, `MarkdownExcerpt`, `MarkdownEditor` (Write/Preview tabs).
- [x] Verify `line-clamp` with nested blocks; apply fallback if needed.

Done when: tests cover allowed elements per variant, raw HTML not rendered, `javascript:` links neutralized.

### 3. Dashboard (master-detail)
- [x] App layout: two panes on `lg+`, stacked screens below.
- [x] Timeline list with infinite scroll (growing limit + IntersectionObserver), loading skeleton, empty state.
- [x] Timeline create/edit form (title, description, orientation).
- [x] Delete timeline with confirmation (cascade).

Done when: E2E on mobile and desktop: create several timelines, scroll loads more, select one, edit, delete with confirmation.

### 4. Timeline view
- [x] Header with title, orientation toggle (persisted), actions menu.
- [x] Vertical and horizontal layouts (`snap-x` for horizontal).
- [x] Node card: inline title + clamped excerpt + drag handle placeholder.
- [x] Empty state + "+ Node" action.

Done when: both orientations render correctly at 360 px and desktop widths; orientation survives reload.

### 5. Node CRUD + detail
- [x] Node detail route: read mode (full Markdown), "Edit" switches to form in place.
- [x] Node create/edit form (react-hook-form + zod).
- [x] Full screen on mobile, Dialog on desktop.
- [x] Delete node with confirmation.
- [x] Unsaved-changes guard (`useUnsavedChangesGuard`) on node and timeline forms: dialog close, Cancel, in-app navigation, browser back, `beforeunload`.

Done when: E2E: create/view/edit/delete a node; with a dirty form, Esc/X/back/Cancel asks for confirmation; with a clean form or after saving, it does not.

### 6. Drag and drop
- [x] Sortable list in both orientations.
- [x] Mouse, touch (activation delay) and keyboard sensors; drag handle only.
- [x] Optimistic reorder + transactional persistence.

Done when: E2E: reorder by mouse and by keyboard, reload, order kept. Manual check on a real touch device.

### 7. Import / Export
- [x] Export timeline to JSON (format in `docs/ARCHITECTURE.md`).
- [x] Import parser with zod validation, size limit, readable errors.
- [x] Preview step (title, node count).
- [x] "Import as new" (dashboard) and "Replace" (timeline menu, with confirmation).

Done when: round trip (export → import as new) produces equivalent data with node `created_at` preserved; replace keeps the target id; invalid files write nothing and show an error.

### 8. Polish
- [x] Accessibility pass (focus order, labels, focus return after dialogs).
- [x] Dark mode (shadcn/ui theme).
- [x] Toasts for save/delete/import/export outcomes.
- [x] Optional: PWA (installable, offline cache).
- [x] README with usage and backup advice.

Done when: Lighthouse accessibility ≥ 90 on mobile.
