# Architecture

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite + React + TypeScript (strict) | |
| Styling | Tailwind CSS v4 | |
| Components | shadcn/ui (Radix primitives) | Dialog, Drawer/Sheet, AlertDialog, Button, Input, Textarea, Tabs, Toggle Group, Dropdown Menu, Sonner (toasts), Skeleton, ScrollArea |
| Persistence | Dexie.js + `dexie-react-hooks` (`useLiveQuery`) | Reactive queries; schema versioning for migrations |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Pointer, touch and keyboard sensors |
| Routing | React Router, data router (`createBrowserRouter`) | Required for `useBlocker` |
| Forms | react-hook-form + zod | zod schemas are shared with import validation |
| Markdown | `react-markdown` + `remark-gfm` | No `rehype-raw`: raw HTML is never rendered |
| IDs | `crypto.randomUUID()` | |
| Unit/integration tests | Vitest + Testing Library + `fake-indexeddb` | |
| E2E tests | Playwright (mobile and desktop viewports) | |

Library versions: latest stable at setup time. Check each library's current docs during phase 0 (APIs differ across major versions, notably Tailwind v4 setup and shadcn/ui CLI).

## Folder structure (target)

```
src/
  app/              router, layouts, providers
  components/
    ui/             shadcn/ui generated components
    markdown/       Markdown renderers and editor
    common/         shared app components (ConfirmDialog, EmptyState, InfiniteList)
  db/               Dexie instance, schema, repositories, migrations
  features/
    timelines/      dashboard list, timeline form, timeline view
    nodes/          node card, node detail, node form, sortable logic
    transfer/       import/export (schema, parser, UI)
  hooks/            useUnsavedChangesGuard, useInfiniteLimit, useMediaQuery
  lib/              dates, slug, utils
  types/
```

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
- Reorder: after a drop, renumber `position` for the timeline's nodes inside one transaction. Integer renumbering is enough for personal-scale data (hundreds of nodes).
- New node: `position = max + 1` (appended at the end).
- Delete timeline: delete its nodes and the timeline in one transaction.
- Call `navigator.storage.persist()` on startup to reduce the risk of the browser evicting data.

## Routes

```
/                                  dashboard: timeline list (master)
/timelines/new                     create timeline (form)
/timelines/:timelineId             timeline view (detail pane)
/timelines/:timelineId/edit        edit timeline metadata (form)
/timelines/:timelineId/nodes/new   create node (form)
/timelines/:timelineId/nodes/:nodeId   node detail (read mode, "Edit" switches to the form in place)
```

- Mobile (< `lg`): each route is a full screen; the list and the timeline are separate screens with a back action.
- Desktop (≥ `lg`): two panes. The list stays visible on the left; the selected timeline renders on the right. With no selection, the right pane shows an empty state. Node detail and forms open in a Dialog over the timeline.
- Detail views are routes (not only component state), so the browser back button closes them and the unsaved-changes guard can intercept it.

## Dashboard (master-detail, infinite scroll)

- Query: `db.timelines.orderBy('updated_at').reverse().limit(n)` via `useLiveQuery`; `n` grows by a page size (e.g. 20) when a sentinel element enters the viewport (IntersectionObserver).
- Growing the limit (instead of cursor pagination) keeps the list reactive when `updated_at` changes reorder items.
- List item: title (inline Markdown), description excerpt (2 lines), node count, relative `updated_at`.
- Actions: new timeline, import as new timeline.
- Nodes inside a timeline are rendered in full (no virtualization or infinite scroll); virtualization conflicts with drag and drop and is unnecessary at personal scale.

## Timeline view

- Header: title, orientation toggle (Toggle Group), actions menu (edit, export, import-replace, delete).
- Vertical: a vertical line with node cards stacked.
- Horizontal: horizontal scroll container with `snap-x`; cards have a fixed width.
- Node card: inline-rendered title + description excerpt clamped to ~3 lines + drag handle.
- "+ Node" button (floating action button on mobile).

## Markdown

- `MarkdownInline`: for titles. Allows only `strong`, `em`, `del`, `code`, `a` (`unwrapDisallowed`). The form field is a single-line Input.
- `MarkdownBlock`: for descriptions in detail views. GFM enabled (lists, tables, task lists, strikethrough). Links open in a new tab with `rel="noopener noreferrer"`.
- `MarkdownExcerpt`: for cards. Headings render as plain paragraphs, images are replaced by their alt text, clamped with `line-clamp-*`. Verify in phase 2 that `line-clamp` works on nested block children; if not, fall back to `max-height` + gradient mask.
- `MarkdownEditor`: Textarea with "Write" / "Preview" tabs. No heavy editor dependency.
- Safety: `react-markdown` without `rehype-raw` does not render raw HTML; its default URL transform blocks `javascript:` URLs. Never use `dangerouslySetInnerHTML`.

## Unsaved-changes guard

Shared hook `useUnsavedChangesGuard(isDirty)` used by the timeline form and the node form:

1. Dialog/Drawer close (X, Esc, overlay click): intercept `onOpenChange(false)`; if dirty, open the confirm AlertDialog.
2. In-app navigation and browser back: React Router `useBlocker(isDirty)`; show the same AlertDialog, then `proceed()` or `reset()`.
3. Tab close/reload: `beforeunload` listener while dirty (the browser shows its own generic message; text cannot be customized).
4. Cancel button: same confirmation.
5. After a successful save, the form resets its dirty state before navigating, so the guard does not fire.

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
