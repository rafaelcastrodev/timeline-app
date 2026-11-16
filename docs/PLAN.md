# Execution plan

## Current status

- Active phase: none; phases 0–14 done. Phase 6 manual check on a real touch device still pending.
- Done so far: phase 0 (setup), phase 1 (data layer: Dexie schema v1, zod models, repositories, live-query hooks), phase 2 (Markdown components), phase 3 (router and master-detail layout, timeline list with infinite scroll, timeline create/edit route dialogs, delete with confirmation), phase 4 (timeline view: orientation toggle persisted per timeline, vertical and horizontal layouts, node cards, empty state, "+ Node" action), phase 5 (node create route, node detail with edit in place, delete with confirmation, clickable node cards, unsaved-changes guard on node and timeline forms), phase 6 code (sortable node list in both orientations from the card's drag handle, mouse/touch/keyboard sensors, optimistic reorder with transactional persistence), phase 7 (JSON export download, import parser with size limit and readable errors, preview dialog, "import as new" from the dashboard and "replace from file" from the timeline menu, transactional writes), phase 8 (accessibility pass: landmarks, headings, contrast tokens, focus return after dialogs and navigation; dark mode; toasts; PWA with offline precache; README), phase 9 (node card colors: `color` field with Dexie v2 migration, swatch picker in the node form, soft card backgrounds, color in the export file), phase 10 (node `layer` field with Dexie v3 migration, layer select in the node form, layer focus button that dims the other layers, layer in the export file), phase 11 (node `severity` field with Dexie v4 migration, severity select next to the layer select, severity in the export file), phase 12 (severity chart page with shadcn/ui chart + Recharts: monotone curve, title tooltip, points that open the node detail by click or Enter, focus returns to the point), phase 13 (demo timeline written by Dexie `populate` when the database is created; off in tests via `VITE_DEMO_TIMELINE=off`), phase 14 (severity scale 1–7 with named options, default 4). 163 unit/integration tests pass; E2E dashboard, timeline view, node, reorder, transfer, focus, layers, chart, theme/toast and axe accessibility specs pass on mobile and desktop (51 passed, 3 skipped by viewport; touch long press emulated via CDP on mobile). Lighthouse accessibility (mobile, production build): 100 on the dashboard and on a timeline with nodes.
- Next step: manual checks on a real touch device: reorder (long press on the grip drags; swiping elsewhere and on the grip scrolls), tapping chart points, and PWA install / offline launch.

## Phases

Phases 1–5 form the usable core. Phases 6–11 are independent of each other; phase 12 builds on phase 11; phase 13 uses the fields of phases 9–11; phase 14 changes the scale of phase 11.

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

### 9. Customization
- [x] Node `color` field (zod models, Dexie v2 migration, export/import).
- [x] Color picker in the node form (500 shade of each color, plus default).
- [x] Soft card background for the chosen color, AA contrast in both themes.
- [x] Timeline marker in the card color.
- [x] Sticky dialog header bar; node dialogs color it with the card color (live in the forms).

Done when: the color is saved on create and edit, shown on the card, kept by export/import, and axe passes with colored cards in both themes.

### 10. Layers
- [x] Node `layer` field 1–5, default 1 (zod models, Dexie v3 migration, export/import).
- [x] Layer select in the node form.
- [x] Layer focus button in the timeline header; nodes of the other layers dimmed.

Done when: the layer is saved on create and edit, kept by export/import, older data and files read as layer 1, and the focus button cycles through the layers in use, dimming the others.

### 11. Severity
- [x] Node `severity` field (zod models, Dexie v4 migration, export/import).
- [x] Severity select next to the layer select in the node form.

Done when: the severity is saved on create and edit, kept by export/import, and older data and files read as the default severity.

### 12. Severity chart
- [x] shadcn/ui `chart` component + Recharts.
- [x] Chart page route (`timelines/:timelineId/chart`) with the node detail as child route.
- [x] Chart link next to the layer focus button in the timeline header.
- [x] Monotone line of severity by timeline order, title tooltip, points open the node detail (click and Enter).
- [x] Focus returns to the point after the node detail closes.
- [x] Run unit, E2E and accessibility suites.

Done when: the chart shows one point per node at its severity, hovering shows the title, clicking or Enter opens the node detail and closing it returns to the chart with focus on the point, and axe passes on the chart in both themes and viewports.

### 13. Demo timeline
- [x] Demo timeline content (15 nodes, lorem ipsum, random colors, layers and severities).
- [x] Written by Dexie `populate` on database creation; `VITE_DEMO_TIMELINE=off` in Vitest and Playwright.
- [x] Unit tests: seeded on creation, not restored after deletion, not added on upgrade, opt-out.

Done when: a fresh browser shows the demo timeline, deleting it is permanent, existing databases are unchanged, and the test suites start from an empty database.

### 14. Severity scale
- [x] Severity 1–7, default 4 (`NODE_SEVERITIES`, `DEFAULT_NODE_SEVERITY`; absent values in old data and files read as 4).
- [x] Select options labeled with the number and name: Downfall, Lowest, Low, Mid, High, Highest, Climax.
- [x] Chart y axis 1 to 7; demo timeline uses the wider range.

Done when: the form offers the 7 labeled options with 4 (Mid) preselected, values 6 and 7 are saved, imported and charted, and values above 7 are rejected.
