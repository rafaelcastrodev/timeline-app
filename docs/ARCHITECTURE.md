# Architecture

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite + React + TypeScript (strict) | TypeScript pinned to 6.0.x until typescript-eslint supports 7 (D-010) |
| Styling | Tailwind CSS v4 | |
| Components | shadcn/ui (Radix base, Nova preset, Lucide icons) | Dialog, Drawer/Sheet, AlertDialog, Button, Card, Input, Textarea, Tabs, Toggle Group, Dropdown Menu, Sonner (toasts), Skeleton, ScrollArea |
| Persistence | Dexie.js + `dexie-react-hooks` (`useLiveQuery`) | Reactive queries; schema versioning for migrations |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Pointer, touch and keyboard sensors |
| Routing | React Router 8, data router (`createBrowserRouter`) | Required for `useBlocker`. `RouterProvider` comes from `react-router/dom`, everything else from `react-router` |
| Forms | react-hook-form + `@hookform/resolvers` (zod) | zod schemas are shared with import validation. Fields use shadcn/ui `Field` |
| Markdown | `react-markdown` + `remark-gfm` | No `rehype-raw`: raw HTML is never rendered |
| IDs | `crypto.randomUUID()` | |
| Unit/integration tests | Vitest + Testing Library + `fake-indexeddb` | |
| E2E tests | Playwright (mobile and desktop viewports) | Projects: `mobile` 360×800 with touch, `desktop` 1280×800; Chromium |
| Lint / format | ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier (Tailwind class sorting) | |

Library versions: latest stable at setup time. Check each library's current docs during phase 0 (APIs differ across major versions, notably Tailwind v4 setup and shadcn/ui CLI).

## Folder structure (target)

```
src/
  app/              router, layouts, providers
  components/
    ui/             shadcn/ui generated components
    markdown/       Markdown renderers and editor
    common/         shared app components (ConfirmDialog, EmptyState, LoadMoreSentinel, RouteDialog)
  db/               Dexie instance, schema, repositories, migrations
  features/
    timelines/      dashboard list, timeline form, timeline view
    nodes/          node card, node detail, node form, sortable logic
    transfer/       import/export (schema, parser, UI)
  hooks/            useInfiniteLimit, useCloseRoute, useUnsavedChangesGuard
  lib/              dates, slug, utils
  types/
  test/             Vitest setup
e2e/                Playwright specs
```

- Unit/integration tests are co-located as `*.test.ts(x)` under `src/`.
- Import alias: `@/` maps to `src/`.

## Data model

```ts
interface Timeline {
  id: string                 // UUID
  title: string              // Markdown (inline subset)
  description: string        // Markdown
  orientation: 'vertical' | 'horizontal'
  created_at: string         // ISO 8601, set once
  updated_at: string         // ISO 8601; also bumped when any of its nodes changes
}

interface TimelineNode {
  id: string                 // UUID
  timeline_id: string
  title: string              // Markdown (inline subset)
  description: string        // Markdown
  position: number           // 0..n-1, manual order within the timeline
  created_at: string         // ISO 8601, set once, preserved by import
  updated_at: string         // ISO 8601
}
```

### Dexie schema (v1)

```ts
db.version(1).stores({
  timelines: 'id, updated_at',
  nodes: 'id, timeline_id, [timeline_id+position]',
})
```

### Rules

- Create/update/delete of a node bumps the parent timeline's `updated_at` in the same transaction (dashboard sorts by recent activity).
- Reorder: after a drop, renumber `position` for the timeline's nodes inside one transaction. Integer renumbering is enough for personal-scale data (hundreds of nodes). The repository takes the full ordered id list and rejects it unless it is a permutation of the timeline's node ids. Reorder bumps the timeline's `updated_at` but not the nodes' (order is not node content).
- New node: `position = max + 1` (appended at the end).
- Delete node: renumber the remaining nodes so positions stay `0..n-1`.
- Delete timeline: delete its nodes and the timeline in one transaction.
- Call `navigator.storage.persist()` on startup to reduce the risk of the browser evicting data.

### Code layout

- zod schemas and inferred types: `src/types/models.ts`. Record schemas (`timelineSchema`, `timelineNodeSchema`), creation input schemas with defaults (`timelineInputSchema`, `nodeInputSchema`), partial update schemas without defaults (`timelineChangesSchema`, `nodeChangesSchema`) and form schemas with every field required (`timelineFormSchema`, `nodeFormSchema`). Titles are trimmed and required.
- Repositories: `src/db/timelines.ts`, `src/db/nodes.ts`, re-exported from `src/db/index.ts`. They validate input with the zod schemas and throw `RecordNotFoundError` / `InvalidReorderError` (`src/db/errors.ts`). Error names must not match DOMException names, because Dexie rewraps those.
- Live-query hooks: `src/db/hooks.ts`. Single-record hooks return `undefined` while loading and `null` when the record does not exist.
- Test helper `setupTestDatabase()` (`src/test/db.ts`) clears tables and fakes only `Date`; timers stay real for fake-indexeddb.

## Routes

```
/                                  dashboard: timeline list (master)
/timelines/new                     create timeline (form)
/timelines/:timelineId             timeline view (detail pane)
/timelines/:timelineId/edit        edit timeline metadata (form)
/timelines/:timelineId/nodes/new   create node (form)
/timelines/:timelineId/nodes/:nodeId   node detail (read mode, "Edit" switches to the form in place)
```

- Route tree: `src/app/routes.tsx`; `App.tsx` creates the browser router. `AppLayout` (`src/app/app-layout.tsx`) renders the list pane (`<aside>`) and the detail pane (`<main>`, the outlet). A pathless child route renders the "no timeline selected" empty state with `timelines/new` nested under it; `timelines/:timelineId` renders the timeline view, which passes the loaded timeline to its child routes (`edit`, `nodes/new`, `nodes/:nodeId`) as outlet context. Unknown URLs render a top-level `NotFound`; render errors go to `RouteError`.
- Mobile (< `lg`): each route is a full screen; the list and the timeline are separate screens with a back action. The layout shows the list when no `:timelineId` param is matched and the detail pane otherwise (CSS `hidden` + `lg:` overrides, no media-query hook).
- Desktop (≥ `lg`): two panes, each scrolling on its own. The list stays visible on the left; the selected timeline renders on the right. With no selection, the right pane shows an empty state.
- Forms and node detail are route dialogs (`RouteDialog`): a shadcn/ui Dialog that is open while its route is mounted, full screen below `lg` and a centered modal from `lg` up (D-016). Its title is a `ReactNode`, so node titles render as inline Markdown.
- Closing a route dialog (X, Esc, overlay, Cancel, after save) goes back in history when it was opened inside the app, and replaces it with the parent route when it was opened by direct URL (`useCloseRoute`, D-017). Creating a timeline replaces `/timelines/new` with the new timeline's route.
- Detail views are routes (not only component state), so the browser back button closes them and the unsaved-changes guard can intercept it.

## Dashboard (master-detail, infinite scroll)

- Query: `useTimelines(limit)` (`orderBy('updated_at').reverse().limit(n)` via `useLiveQuery`); `useInfiniteLimit(20)` holds `n`.
- `LoadMoreSentinel` sits after the last item and observes the viewport (IntersectionObserver, 200 px margin). It calls `loadMore` while visible and enabled; it is enabled only when more timelines exist and the page for the current limit has arrived, so each page loads once and a short page that leaves the sentinel on screen keeps loading.
- Growing the limit (instead of cursor pagination) keeps the list reactive when `updated_at` changes reorder items. `useLiveQuery` keeps the previous result while the query for a new limit runs, so the list does not flash.
- States: skeleton rows while loading; empty state when there are no timelines.
- List item: a `NavLink` (highlighted while its timeline or a child route is open) with title (inline Markdown, links as text), description excerpt (2 lines), node count, relative `updated_at` (`formatRelativeTime`, absolute date in the tooltip).
- Actions: new timeline, import as new timeline (phase 7).
- Nodes inside a timeline are rendered in full (no virtualization or infinite scroll); virtualization conflicts with drag and drop and is unnecessary at personal scale.

## Timeline view

- Header: back action (mobile), title, orientation toggle, "+ Node" action, actions menu (edit, export, import-replace, delete).
- Orientation toggle: icon-only single-select Toggle Group (`OrientationToggle`, radio semantics, labels "Vertical"/"Horizontal"). Selecting the active item again keeps it. A change is saved immediately with `updateTimeline`, which bumps `updated_at` like any timeline write (D-019); the view re-renders from the live query.
- "+ Node": one link to `nodes/new`, a floating action button (bottom-right, icon only) below `lg` and a regular header button from `lg` up. The node area has bottom padding below `lg` so the last card stays clear of it.
- Delete asks for confirmation (`ConfirmDialog`, which stays open until the action settles and shows its error if it fails), then replaces the route with `/`.
- Below the header: description (full Markdown), then the nodes (`NodeList`, `src/features/nodes`): skeleton while loading, empty state with an "Add first node" action when there are none.
- Vertical: an ordered list with a vertical line on the left and a marker per card; cards stacked, max width `2xl`.
- Horizontal: the list sits in its own horizontal scroll container (`snap-x snap-mandatory`, cards `snap-start`) under a horizontal line with a marker per card; cards have a fixed width (`w-64`, `md:w-72`). The page itself never scrolls horizontally.
- Node card (`NodeCard`, shadcn/ui `Card`): inline title (`h3`) + description excerpt clamped to 3 lines + grip icon. The title is a link to the node detail whose `::after` overlay covers the whole card (stretched link, D-022); Markdown links in the title and excerpt render as text. The grip is a visual placeholder until phase 6 turns it into the drag handle.

## Node detail and forms

Components live in `src/features/nodes`.

- Create (`NodeCreateDialog`, `nodes/new`): `NodeForm` (title, description). Saving appends the node at the end and closes the route back to the timeline.
- Detail (`NodeDetailDialog`, `nodes/:nodeId`): read mode shows the title (inline Markdown, as the dialog title), the description (`MarkdownBlock`) and the "Edit" and "Delete" actions. While the node loads the dialog shows skeletons; a node that does not exist or belongs to another timeline shows "Node not found".
- "Edit" swaps the read view for `NodeForm` inside the same dialog (component state, no route change) and focuses the title. Save and Cancel return to read mode and focus "Edit". Closing the dialog from edit mode closes the route (D-021).
- Delete asks for confirmation (`ConfirmDialog`), deletes the node, then closes the route.

## Markdown

Components live in `src/components/markdown` (re-exported from `index.ts`). All variants use `remark-gfm` and are styled by mapping elements to components with Tailwind classes and theme tokens (no typography plugin).

- `MarkdownInline`: for titles. Allows only `strong`, `em`, `del`, `code`, `a` (`unwrapDisallowed`); images render as their alt text. `disableLinks` renders links as plain text, for titles inside links/buttons (no nested interactive content). The form field is a single-line Input.
- `MarkdownBlock`: for descriptions in detail views. GFM enabled (lists, tables, task lists with disabled checkboxes, strikethrough, autolinks).
- `MarkdownExcerpt`: for cards and list items. Headings render as plain paragraphs, images as their alt text, links as plain text. Clamped with `line-clamp-{1..4}` via the `lines` prop (default 3). `line-clamp` was verified in Chromium with nested block children (paragraphs, lists, nested lists, code blocks, blockquotes); no fallback needed.
- `MarkdownEditor`: Textarea with "Write" / "Preview" tabs, controlled (`value` / `onChange(string)`, used with react-hook-form's `Controller`); other textarea props are forwarded. The textarea stays mounted (hidden) while previewing.
- Links open in a new tab with `rel="noopener noreferrer"`.
- Safety: no `rehype-raw`, so raw HTML is shown as literal text and never rendered. The default URL transform blanks unsafe URLs (`javascript:`, `data:`, …); a link whose URL was blanked renders as plain text. Never use `dangerouslySetInnerHTML`.

## Unsaved-changes guard

Shared hook `useUnsavedChangesGuard(isDirty)` (`src/hooks/use-unsaved-changes-guard.tsx`), called by `TimelineForm` and `NodeForm` with react-hook-form's `isDirty`. The form renders the hook's confirmation dialog ("Discard unsaved changes?", actions "Discard" and "Keep editing"; built on `ConfirmDialog`, whose `onCancel` runs only when it is dismissed without confirming). D-020.

1. Route dialog close (X, Esc, overlay click): route dialogs close by navigating (`useCloseRoute`), so the navigation blocker below catches them; there is no separate `onOpenChange` interception.
2. In-app navigation and browser back: React Router `useBlocker` while dirty; "Discard" calls `proceed()`, "Keep editing" calls `reset()`.
3. Tab close/reload: `beforeunload` listener while dirty (the browser shows its own generic message; text cannot be customized).
4. Cancel button: `confirmDiscard(action)` asks when dirty, then runs the action with the blocker bypassed, so a Cancel that navigates is not asked twice. Cancel either closes the route or, in node edit mode, returns to read mode.
5. After a successful save, the form resets its dirty state and calls `onSaved` through `bypass(action)`: the registered blocker still holds the previous dirty value until the next render. A bypass lasts until the dirty flag changes.

## Drag and drop

- `DndContext` + `SortableContext` with `verticalListSortingStrategy` or `horizontalListSortingStrategy` by orientation.
- Sensors: `PointerSensor` (mouse), `TouchSensor` with an activation delay (~250 ms, tolerance ~5 px) so scrolling is not hijacked, `KeyboardSensor` with `sortableKeyboardCoordinates`.
- Dragging starts only from a drag handle on the card; tapping elsewhere on the card opens the detail.
- Auto-scroll while dragging near container edges (dnd-kit built-in).
- Optimistic UI: apply `arrayMove` locally, then persist the renumbering.

## Import / Export

### File format (`schema_version` 1)

```json
{
  "format": "timeline-app",
  "schema_version": 1,
  "exported_at": "2026-11-03T12:00:00.000Z",
  "timeline": {
    "id": "…",
    "title": "…",
    "description": "…",
    "orientation": "vertical",
    "created_at": "…",
    "updated_at": "…"
  },
  "nodes": [
    { "id": "…", "title": "…", "description": "…", "position": 0, "created_at": "…", "updated_at": "…" }
  ]
}
```

- Export: one timeline per file; nodes sorted by `position`. File name: `timeline-<slug>-<yyyymmdd>.json`.
- Validation: zod schema checks `format`, supported `schema_version`, required fields, ISO dates, `orientation` enum. Unknown fields are stripped. Reject files over 10 MB before parsing.
- Preview before writing: timeline title and node count.
- All writes run in one transaction; on any error nothing is written.

### Modes

| Mode | Where | Timeline record | Nodes |
|---|---|---|---|
| Import as new | Dashboard | New `id`, `created_at = now`; title/description/orientation from file | New `id`s; `created_at`/`updated_at` from file; `position` from array order |
| Replace | Timeline actions menu (requires confirmation) | Keeps target `id` and `created_at`; title/description/orientation from file; `updated_at = now` | Existing nodes deleted; imported nodes get new `id`s (avoids collisions with other timelines); `created_at`/`updated_at` from file |

## Risks

- IndexedDB eviction (notably Safari for non-installed web apps after a period of no use). Mitigation: `navigator.storage.persist()`, optional PWA install, regular JSON exports.
- Drag vs. scroll on touch devices. Mitigation: drag handle + activation delay; test on a real device.
- `beforeunload` text cannot be customized.
