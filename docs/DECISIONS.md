# Decision log

Format: `D-xxx — title (date)`, then decision and rationale. Never delete entries; mark superseded ones and reference the replacement.

## D-001 — No backend (2026-11-03)
Personal app. All data in IndexedDB; JSON export is the backup.

## D-002 — Stack (2026-11-03)
Vite + React + TS, Tailwind CSS v4, shadcn/ui, Dexie.js, dnd-kit, React Router (data router), react-hook-form + zod, react-markdown + remark-gfm, Vitest, Playwright.
Rationale: widely adopted, TypeScript-first, Tailwind-compatible; `useBlocker` covers the unsaved-changes guard, dnd-kit covers touch and keyboard sorting, zod is shared by forms and import validation.

## D-003 — Manual node order (2026-11-03)
Nodes are ordered by a `position` field changed via drag and drop, not by dates.
Rationale: predictable drag behavior; no conflict between chronological and manual order.

## D-004 — Multiple timelines with master-detail dashboard (2026-11-03)
Timeline list (infinite scroll) as master, timeline view as detail. Two panes on desktop, stacked screens on mobile. Infinite scroll uses a growing `limit` on a live query, so the list stays reactive when `updated_at` reorders items.

## D-005 — Node detail opens in read mode (2026-11-03)
"Edit" switches to the form. Avoids accidental edits and limits the unsaved-changes guard to real edits.

## D-006 — All text fields are Markdown (2026-11-03)
Titles render an inline-only subset (strong, em, del, code, link); descriptions render GFM. No raw HTML.

## D-007 — Import supports "new" and "replace" (2026-11-03)
Both modes regenerate node ids (avoid collisions with other timelines) and preserve node `created_at`. Replace keeps the target timeline id and `created_at` and requires confirmation.

## D-008 — No virtualization inside a timeline (2026-11-03)
Nodes render in full. Virtualization conflicts with drag and drop and is unnecessary at personal scale.

## D-009 — Node writes bump the parent timeline's `updated_at` (2026-11-03)
The dashboard sorts by recent activity.

## D-010 — TypeScript 6.0.x with ESLint (2026-11-03)
The Vite template now ships TypeScript 7 and oxlint. typescript-eslint 8.72 supports TypeScript `<6.1`, so TypeScript is pinned to `~6.0.3` to keep ESLint (typescript-eslint, react-hooks rules) as planned in D-002.
Rationale: ESLint with typescript-eslint and the official react-hooks plugin is the established setup; Vite transpiles independently of `tsc`, so the pin only affects type checking. Revisit when typescript-eslint supports TypeScript 7.

## D-011 — shadcn/ui Radix base, Nova preset (2026-11-03)
`shadcn init` with `--base radix --preset nova` (neutral base color, Lucide icons, Geist font, CSS variables). Class merging uses shadcn's `cn` package, re-exported from `src/lib/utils.ts`.
Rationale: Radix matches the primitives named in the architecture; Nova is the CLI default preset.

## D-012 — Reorder and delete keep positions dense (2026-11-03)
Deleting a node renumbers the rest to `0..n-1`. Reorder takes the full ordered id list, validates it is a permutation of the timeline's nodes, and bumps only the timeline's `updated_at`, not the nodes'.
Rationale: dense positions keep `max + 1` appends and export order trivial; node `updated_at` tracks content edits, while the timeline's tracks any activity (D-009).

## D-013 — Separate create and update schemas (2026-11-03)
Creation input schemas carry defaults (`description: ''`, `orientation: 'vertical'`); update schemas are `partial()` of the base fields without defaults.
Rationale: in zod 4 defaults apply inside `optional()`, so a partial of the creation schema would overwrite absent fields with defaults.

## D-014 — Markdown rendering details (2026-11-03)
Elements are styled by mapping them to components with Tailwind classes and theme tokens, not with `@tailwindcss/typography`. Raw HTML is shown as literal text (react-markdown default without `rehype-raw`). Links whose URL is blanked by the default URL transform render as plain text instead of `<a href="">`. Excerpts always render links as plain text and `MarkdownInline` has a `disableLinks` prop, because both appear inside clickable cards and list items. Images render as alt text in titles and excerpts.
Rationale: component mapping uses the shadcn/ui tokens directly with no extra dependency; showing raw HTML as text keeps what the user typed visible; nested interactive elements are invalid HTML and break click handling.

## D-015 — ESLint `no-unused-vars` ignores rest siblings (2026-11-03)
`@typescript-eslint/no-unused-vars` runs with `ignoreRestSiblings: true`.
Rationale: react-markdown passes a `node` prop to custom components; destructuring it out (`{ node, ...props }`) keeps it off the DOM.

## D-016 — Route dialogs are full screen on mobile (2026-11-03)
Forms and node detail render in one responsive shadcn/ui Dialog (`RouteDialog`): full screen below `lg`, centered modal from `lg` up. No separate page component for mobile.
Rationale: one component and one close path (X, Esc, overlay) for the unsaved-changes guard on every screen size; no remount when the viewport crosses the breakpoint; still a full screen on mobile as required.

## D-017 — Closing a route view goes back in history (2026-11-03)
Closing a route dialog navigates back (`navigate(-1)`) when it was opened inside the app, and replaces it with the parent route when it was the first history entry (direct URL). Creating a timeline replaces `/timelines/new` with the new timeline's route; deleting one replaces the route with `/`.
Rationale: closed dialogs and deleted records do not stay in the history stack, so the back button never reopens a finished form or a missing timeline.

## D-018 — React Router 8 (2026-11-03)
React Router 8 is the current major at phase 3. It removed `react-router-dom`: `RouterProvider` is imported from `react-router/dom`, everything else from `react-router`. The data router API (`createBrowserRouter`, `useBlocker`) is unchanged.
Rationale: latest stable at implementation time (D-002 names React Router without a version).

## D-019 — Orientation toggle is a regular timeline update (2026-11-03)
The header toggle saves the orientation with `updateTimeline`, which bumps the timeline's `updated_at`, so switching the view moves the timeline to the top of the dashboard.
Rationale: orientation is a persisted field of the timeline, also editable in its form; `updated_at` tracks any activity on the timeline (D-009, D-012); one update path in the repository.

## D-020 — Unsaved-changes guard is built on the navigation blocker (2026-11-03)
Route dialogs close by navigating, so X, Esc, overlay click and browser back are all caught by `useBlocker` while the form is dirty; the dialog's `onOpenChange` is not intercepted separately. Cancel confirms inside the form and then runs with the blocker bypassed. After a save, the form resets and navigates through the same bypass.
Rationale: one interception path for every way of leaving a route dialog, and the same confirmation dialog for all of them. The bypass prevents a second prompt after Cancel and a false prompt after saving, because `useBlocker` registers its function in an effect and still sees the old dirty value until the next render.

## D-021 — Node edit mode is component state (2026-11-03)
"Edit" in the node detail swaps the read view for the form without a route change; Save and Cancel return to read mode. Creating a node closes the dialog back to the timeline.
Rationale: D-005 asks for editing in place; no extra route or history entry for a mode switch. Back or closing the dialog from edit mode closes the detail (guarded while dirty). Returning to read mode after saving shows the rendered result; after creating, the new card is visible at the end of the timeline.

## D-022 — Node card is clickable through a stretched title link (2026-11-03)
The card title is the only link; its `::after` overlay covers the card. The card is not wrapped in a link.
Rationale: the whole card is a click target with the title as the link's accessible name, and the phase 6 drag handle can be a button inside the card without nesting interactive content in a link.

## D-023 — Mouse and touch sensors instead of the pointer sensor (2026-11-03)
Drag and drop uses `MouseSensor` (distance 5 px) and `TouchSensor` (delay 250 ms, tolerance 5 px) plus `KeyboardSensor`, not `PointerSensor`. The drag handle uses `touch-action: manipulation`.
Rationale: `PointerSensor` also handles touch and, per the dnd-kit docs, needs `touch-action: none` to reliably prevent scrolling; touch events can block scrolling from `touchmove` instead, so the handle does not need `touch-action: none` and the long-press delay decides between drag and scroll. Separate sensors give mouse and touch their own activation constraints.

## D-024 — Optimistic reorder reconciled against the live query (2026-11-03)
After a drop, the new id order is kept in component state and shown until the live query returns the same order; it is discarded if the set of nodes changes, and on a failed write (only the latest request can discard it), which shows an inline alert. Reorder failures are not toasts yet (toasts are phase 8).
Rationale: no flash back to the old order between the drop and the IndexedDB commit, consecutive drags do not flicker, and an order kept in state never overrides a later change from another tab.
