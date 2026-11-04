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
After a drop, the new id order is kept in component state and shown until the live query returns the same order; it is discarded if the set of nodes changes, and on a failed write (only the latest request can discard it), which shows an inline alert. Reorder failures are not toasts yet (toasts are phase 8). Superseded in part by D-030: a failed write shows an error toast instead of the inline alert.
Rationale: no flash back to the old order between the drop and the IndexedDB commit, consecutive drags do not flicker, and an order kept in state never overrides a later change from another tab.

## D-025 — Import flow: file picker first, one preview dialog that confirms (2026-11-03)
"Import timeline" (dashboard) and "Replace from file" (timeline menu) open the file picker directly. After parsing, one `ConfirmDialog` shows the preview (title, node count, export date) and the confirm action; for replace it is the destructive confirmation required by F11, so there is no second prompt. Rejected files show their error in a dialog with "Choose another file". The flow is component state (`useTimelineImport`), not a route.
Rationale: one click less than an intermediate "choose a file" dialog; the preview is the information the user needs to confirm a replace, so a separate confirmation would repeat it; a `File` cannot be carried in a URL, and closing the dialog has nothing to guard. Errors are not toasts yet (toasts are phase 8). D-030 keeps import errors in the dialog.

## D-026 — Export file schema in `src/types`, array order wins on import (2026-11-03)
The file format schema lives in `src/types/transfer.ts` and is used by both the parser (`src/features/transfer`) and the transfer repository (`src/db/transfer.ts`), which re-validates its input. On import, node order comes from the array order and the `position` values are only validated. Ids in the file must be UUIDs even though both modes regenerate them.
Rationale: the repository cannot depend on a feature folder; the export writes nodes sorted by position, so array order and positions agree for files from the app, and array order is what a user sees when editing a file by hand. Validating the full record shape keeps the format strict and documented.

## D-027 — Accessibility structure and contrast tokens (2026-11-04)
`<main>` is always rendered (below `lg` without a selection it holds only portaled dialogs and the hidden desktop empty state); a visually hidden `<h1>` ("Timeline App") heads the page and each pane title is an `h2`. Light `--muted-foreground` goes from `oklch(0.556 0 0)` to `oklch(0.53 0 0)`, light `--destructive` from `oklch(0.577 0.245 27.325)` to `oklch(0.53 0.22 27.325)`, dark `--destructive` from `oklch(0.704 0.191 22.216)` to `oklch(0.76 0.16 22.216)`. An axe E2E spec checks the main screens in both themes and viewports; while a modal overlay is open it skips the rules about content Radix hides on purpose.
Rationale: below `lg` the hidden detail pane left the dashboard without a main landmark, and the hidden list pane left a selected timeline without an `h1`. The preset tokens measured 4.34:1 (muted text on `bg-muted`, the active list item), 4.0:1 and 4.24:1 (destructive text on its tinted button), under WCAG AA's 4.5:1. Changing the tokens fixes every use at once. Radix modal menus and dialogs set `aria-hidden` on the page and trap focus, so the hidden content is unreachable; axe reports it anyway.

## D-028 — Focus returns to the opener, else to the page heading (2026-11-04)
`RouteDialog` and `ConfirmDialog` use `useReturnFocus`: record the focused element on open (the menu trigger for a dropdown menu item) and focus it on close; when it is gone or hidden, focus the page heading (`tabIndex={-1}`). After a navigation that leaves focus nowhere, `AppLayout` focuses the heading of the view now shown, waiting for it while the view loads.
Rationale: these dialogs have no Radix `Trigger`, so Radix's close handler focused nothing and focus fell to `<body>`, including after "Keep editing" in the discard prompt. On mobile, selecting a timeline or going back hides the focused link. Returning to the opener is the WAI-ARIA dialog pattern; the heading is the nearest meaningful place when the opener no longer exists (deleted node or timeline) and announces the new screen.

## D-029 — Dark mode with next-themes (2026-11-04)
Theme: light, dark or system (default), via `next-themes` (`attribute="class"`), chosen from a "Theme" menu in the list pane header. An inline script in `index.html` applies the stored theme before the app loads.
Rationale: next-themes was already installed by the shadcn/ui Sonner component, which reads the theme from it; it handles system changes, storage and cross-tab sync. Its own script only runs in server rendering, so a client-only SPA needs the `index.html` script to avoid a light flash; next-themes' script is typed as a data block to avoid React's script-tag warning.

## D-030 — Toasts for action outcomes (2026-11-04)
Success toasts for timeline and node create / save / delete, export, import and replace. Error toasts for export, orientation and reorder failures. Form save errors stay inline in the form; confirmation and import errors stay in their dialog. Toasts sit bottom center, raised on small screens above the floating "Add node" button.
Rationale: a toast confirms an action whose result is otherwise only implied (dialog closed, card gone, download started) and reports failures of actions that have no form or dialog to show them. Errors that need a follow-up action (fix the field, choose another file, retry the confirmation) stay where that action is. Bottom center never overlaps the floating button at any width with the mobile offset.

## D-031 — PWA with precaching and background updates (2026-11-04)
`vite-plugin-pwa` (`generateSW`, `registerType: 'autoUpdate'`, injected register script) precaches the build and serves `index.html` for navigations. New versions install in the background and apply on the next load. Icons are generated from `public/favicon.svg` (a new app icon replacing the Vite logo) with `@vite-pwa/assets-generator` and committed.
Rationale: without a service worker the app does not load offline, which the requirements ask for. Automatic reloads could discard unsaved form changes, and an update prompt adds UI for a personal app; using the new version on the next load avoids both. Generated icons are committed so builds do not depend on the native image library.

## D-032 — Node card colors (2026-11-04)
Nodes have a `color` field: a Tailwind chromatic hue name (17 values, `red` … `rose`) or `null` for the default card. The node form picks it from swatches of each hue's `700` shade; the card uses the hue's `100` shade in light mode and `950` in dark mode. Colored cards darken (light) or lighten (dark) `--muted-foreground` locally. Superseded in part by D-033: swatches use the `500` shade, cards `50` / `900`. Dexie schema v2 sets `color: null` on existing nodes. The export format stays at `schema_version` 1 with `color` as an optional node field defaulting to `null`.
Rationale: the hue name is stored (not a CSS value), so the shades used for swatch and card can change without a migration. Neutral palettes are excluded because their soft shades are indistinguishable from each other and from the default card. With the global token, the excerpt measured 4.28:1 to 4.49:1 on several `100` shades (red, blue, indigo, violet, purple, pink, rose); the local values keep every shade and hover state at 4.5:1 or more. The field is additive and optional in the file, so older exports import unchanged and the parser stays strict on unknown values; a version bump would only reject files that are still valid.

## D-033 — Card color shades: `500` swatches, `50` / `900` cards (2026-11-04)
Picker swatches use each hue's `500` shade with a dark (`neutral-950`) check icon. Cards use `50` in light mode and `900` in dark mode (hover `100` and `800/50`); colored cards set `--muted-foreground` to `oklch(0.46 0 0)` light and `oklch(0.85 0 0)` dark. Superseded in part by D-034: card shades and muted text.
Rationale: `700` darkens every hue and turns the warm ones (yellow, amber, orange, lime) toward brown, so the swatch did not match the color name or the card. `500` is the most saturated shade of each hue. A white check fails 3:1 on several `500` shades (1.91:1 on yellow); `neutral-950` reaches at least 4.32:1 (indigo). Cards move one step lighter than D-032 in each theme. On `900` the excerpt needs a lighter muted color: `oklch(0.85 0 0)` measures at least 5.50:1 on `900` and 4.89:1 on the hover state (yellow is the lowest).

## D-034 — Card backgrounds: `300` in light mode, `500` tint in dark mode (2026-11-04)
Swatches stay at `500` (D-033). Light cards use the hue's `300` shade; hover mixes in 20% of the `500`. Dark cards mix the `500` into `--card` at 35% (40% on hover) with `color-mix` in oklab. Each color sets `--node-color` and `--node-tint` on the card; shared classes read them. Colored cards set `--muted-foreground` to `oklch(0.35 0 0)` light and `oklch(0.85 0 0)` dark.
Rationale: `50` was too faint to tell amber from yellow. For dark mode, fixed shades (`700`, `800`, `900`) were saturated and turned yellow brown, and `300` with dark text put bright surfaces on a dark page; a mix of the swatch color keeps the swatch's hue at the same strength for every color while staying a dark surface. The mixes are opaque, so a dragged card does not show cards beneath it, unlike alpha utilities (`bg-x/35`), which blend with the page. Lowest excerpt contrast: light hover indigo 4.84:1, dark hover yellow 4.91:1.

## D-035 — Timeline marker follows the card color (2026-11-04)
A colored node's marker is filled with the card background and outlined with the hue's `500` (`--node-color`); uncolored nodes keep the `primary` outline on `bg-background`.
Rationale: the fill ties the dot to its card; the `500` outline keeps light fills (light `300`, e.g. lime at 1.3:1 on white) visible on the page background, where a fill alone would fade.

## D-036 — Sticky route dialog header in the node color (2026-11-04)
`RouteDialog` renders the title and the close button in a header bar that is `sticky` at the top of the scrolling dialog; the close button moved from Radix's default absolute position into that bar. Node dialogs pass the node's card surface classes (light `300`, dark `500` mixed at 35%) as `headerClassName`. In the create and edit forms the header previews the color selected in the picker before saving. Every route dialog gets the bar; only node dialogs color it.
Rationale: the absolute close button scrolled away with long content; in the bar it stays reachable and comes first in the tab order, matching its visual position. One header for all route dialogs keeps them consistent. Previewing the picked color shows the result before saving. The theme's foreground and link colors already reach 8.43:1 and 6.99:1 on the lowest-contrast hue (dark yellow), so the header needs no text color overrides.

## D-037 — Node layers with a focus button (2026-11-04)
Nodes have a `layer` field, an integer from 1 to 5 (default 1), chosen with a Select in the node form. The timeline header shows a layer focus button while the nodes use more than one layer; each press focuses the next layer in use (ascending, wrapping around) and nodes of the other layers render at 40% opacity, back to full opacity while hovered, focused or dragged. The focus is component state, starts at the lowest layer in use and is not persisted. Dexie schema v3 sets `layer: 1` on existing nodes; the export format stays at `schema_version` 1 with `layer` as an optional node field defaulting to `1`.
Rationale: layers are a visual aid for story threads (requested as a visual detail only), so the focus is view state and does not move or filter nodes. Cycling only through layers in use avoids a focus on an empty layer, where every node would be dimmed; with a single layer there is nothing to switch. Hover and focus restore full opacity so a dimmed node stays readable when the user reaches for it. Dimmed text is below WCAG AA contrast (excerpt 1.67:1 light, 2.41:1 dark, measured by axe); this is accepted as the intended de-emphasis, and the axe spec scans a single-layer timeline. The field is additive and optional in the file for the same reasons as `color` (D-032).

## D-038 — Prefixed browser storage names (2026-11-04)
Every name the app stores in the browser starts with `timeline-app`, defined in `src/lib/storage.ts`: the IndexedDB database keeps its name `timeline-app`, and the theme moves from the `localStorage` key `theme` to `timeline-app:theme`. Further keys follow `timeline-app:<name>`.
Rationale: on GitHub Pages every project site of one account is served from the same `<user>.github.io` origin, so IndexedDB and `localStorage` are shared with the account's other sites; a generic key such as `theme` would collide. The database name already carried the prefix, so it stays unchanged and no data needs to move. The old `theme` key is not read as a fallback: on a shared origin it may belong to another site, and the cost of losing it is one theme choice.
