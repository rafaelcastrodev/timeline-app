# Architecture

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite + React + TypeScript (strict) | TypeScript pinned to 6.0.x until typescript-eslint supports 7 (D-010) |
| Styling | Tailwind CSS v4 | |
| Theme | `next-themes` | Light, dark or system; `dark` class on `<html>` (D-029) |
| Components | shadcn/ui (Radix base, Nova preset, Lucide icons) | Dialog, Drawer/Sheet, AlertDialog, Button, Card, Input, Textarea, Select, Tabs, Toggle Group, Dropdown Menu, Sonner (toasts), Skeleton, ScrollArea, Chart |
| Persistence | Dexie.js + `dexie-react-hooks` (`useLiveQuery`) | Reactive queries; schema versioning for migrations |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | Mouse, touch and keyboard sensors (D-023) |
| Charts | shadcn/ui `chart` (`src/components/ui/chart.tsx`) + Recharts 3 | Severity chart (D-042) |
| Routing | React Router 8, data router (`createBrowserRouter`) | Required for `useBlocker`. `RouterProvider` comes from `react-router/dom`, everything else from `react-router` |
| Forms | react-hook-form + `@hookform/resolvers` (zod) | zod schemas are shared with import validation. Fields use shadcn/ui `Field` |
| Markdown | `react-markdown` + `remark-gfm` | No `rehype-raw`: raw HTML is never rendered |
| IDs | `crypto.randomUUID()` | |
| Hosting | GitHub Pages, deployed by a GitHub Actions workflow | Project site under `/timeline-app/` (D-039) |
| PWA | `vite-plugin-pwa` (Workbox `generateSW`) + `@vite-pwa/assets-generator` | Precached app shell, installable (D-031) |
| Unit/integration tests | Vitest + Testing Library + `fake-indexeddb` | |
| E2E tests | Playwright (mobile and desktop viewports) + `@axe-core/playwright` | Projects: `mobile` 360×800 with touch, `desktop` 1280×800; Chromium |
| Lint / format | ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier (Tailwind class sorting) | |

Library versions: latest stable at setup time. Check each library's current docs during phase 0 (APIs differ across major versions, notably Tailwind v4 setup and shadcn/ui CLI).

## Folder structure (target)

```
src/
  app/              router, layouts, providers (theme, toaster)
  components/
    ui/             shadcn/ui generated components
    markdown/       Markdown renderers and editor
    common/         shared app components (ConfirmDialog, EmptyState, LoadMoreSentinel, RouteDialog, ThemeMenu)
  db/               Dexie instance, schema, repositories, migrations
  features/
    timelines/      dashboard list, timeline form, timeline view
    nodes/          node card, node detail, node form, sortable logic
    transfer/       import/export (parser, export download, import flow UI)
    chart/          severity chart page
  hooks/            useInfiniteLimit, useCloseRoute, useUnsavedChangesGuard, useReturnFocus
  lib/              dates, focus, slug, storage, utils
  types/            zod schemas: records and forms (models.ts), export file (transfer.ts)
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
  color: NodeColor | null    // card color (Tailwind hue name); null = default card
  layer: NodeLayer           // 1..5, default 1; the timeline view can focus one layer
  severity: NodeSeverity     // 1..5, default 1; stored only, no effect on the view
  position: number           // 0..n-1, manual order within the timeline
  created_at: string         // ISO 8601, set once, preserved by import
  updated_at: string         // ISO 8601
}
```

`NodeColor` is one of the chromatic Tailwind hues: `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose` (`NODE_COLORS`). Neutral palettes (slate, gray, zinc, …) are excluded (D-032).

`NodeLayer` is an integer from 1 to 5 (`NODE_LAYERS`, `DEFAULT_NODE_LAYER = 1`, D-037).

`NodeSeverity` is an integer from 1 to 5 (`NODE_SEVERITIES`, `DEFAULT_NODE_SEVERITY = 1`, D-041).

### Browser storage names

All names live in `src/lib/storage.ts` and start with the prefix `timeline-app` (`STORAGE_PREFIX`), because every GitHub Pages project site of one account shares the `<user>.github.io` origin and its storage (D-038). IndexedDB database: `timeline-app` (`DATABASE_NAME`). `localStorage`: `timeline-app:theme` (`THEME_STORAGE_KEY`); the inline script in `index.html` repeats the literal and a unit test checks they match. New keys use `timeline-app:<name>`.

### Dexie schema (v4)

```ts
const stores = {
  timelines: 'id, updated_at',
  nodes: 'id, timeline_id, [timeline_id+position]',
}
db.version(1).stores(stores)
db.version(2).stores(stores).upgrade(/* nodes without `color` get `color: null` */)
db.version(3).stores(stores).upgrade(/* nodes without `layer` get `layer: 1` */)
db.version(4).stores(stores).upgrade(/* nodes without `severity` get `severity: 1` */)
```

`color`, `layer` and `severity` are not indexed; v2 to v4 only migrate existing nodes.

### Rules

- Create/update/delete of a node bumps the parent timeline's `updated_at` in the same transaction (dashboard sorts by recent activity).
- Reorder: after a drop, renumber `position` for the timeline's nodes inside one transaction. Integer renumbering is enough for personal-scale data (hundreds of nodes). The repository takes the full ordered id list and rejects it unless it is a permutation of the timeline's node ids. Reorder bumps the timeline's `updated_at` but not the nodes' (order is not node content).
- New node: `position = max + 1` (appended at the end).
- Delete node: renumber the remaining nodes so positions stay `0..n-1`.
- Delete timeline: delete its nodes and the timeline in one transaction.
- Call `navigator.storage.persist()` on startup to reduce the risk of the browser evicting data.

### Code layout

- zod schemas and inferred types: `src/types/models.ts`. `NODE_COLORS` / `nodeColorSchema` (type `NodeColor`); `NODE_LAYERS` / `nodeLayerSchema` (type `NodeLayer`); `NODE_SEVERITIES` / `nodeSeveritySchema` (type `NodeSeverity`); record schemas (`timelineSchema`, `timelineNodeSchema`), creation input schemas with defaults (`timelineInputSchema`, `nodeInputSchema`; node `color` defaults to `null`, `layer` and `severity` to `1`), partial update schemas without defaults (`timelineChangesSchema`, `nodeChangesSchema`) and form schemas with every field required (`timelineFormSchema`, `nodeFormSchema`). Titles are trimmed and required.
- Export file schema: `src/types/transfer.ts` (`timelineFileSchema`, type `TimelineFile`), built from the shared field schemas in `models.ts`.
- Repositories: `src/db/timelines.ts`, `src/db/nodes.ts`, `src/db/transfer.ts` (`exportTimeline`, `importTimeline`, `replaceTimeline`), re-exported from `src/db/index.ts`. They validate input with the zod schemas and throw `RecordNotFoundError` / `InvalidReorderError` (`src/db/errors.ts`). Error names must not match DOMException names, because Dexie rewraps those.
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
/timelines/:timelineId/chart       severity chart page
/timelines/:timelineId/chart/nodes/:nodeId   node detail over the chart
```

- Route tree: `src/app/routes.tsx`; `App.tsx` creates the browser router inside `AppProviders` (`src/app/providers.tsx`: theme provider and toaster). `AppLayout` (`src/app/app-layout.tsx`) renders a visually hidden `<h1>` ("Timeline App"), the list pane (`<aside>`) and the detail pane (`<main>`, the outlet). A pathless child route renders the "no timeline selected" empty state with `timelines/new` nested under it; `timelines/:timelineId` renders the timeline view, which passes the loaded timeline to its child routes (`edit`, `nodes/new`, `nodes/:nodeId`) as outlet context. The sibling route `timelines/:timelineId/chart` renders the severity chart page, which passes the timeline the same way to its child `nodes/:nodeId`; it is a `lazy` route, so Recharts loads on demand in its own chunk (still precached by the service worker). Unknown URLs render a top-level `NotFound`; render errors go to `RouteError`.
- Mobile (< `lg`): each route is a full screen; the list and the timeline are separate screens with a back action. The layout hides the list while a `:timelineId` param is matched (CSS `hidden` + `lg:` overrides, no media-query hook). `<main>` is always rendered so the page keeps its main landmark; without a selection it holds only the desktop empty state (hidden below `lg`) and portaled dialogs.
- Desktop (≥ `lg`): two panes, each scrolling on its own. The list stays visible on the left; the selected timeline renders on the right. With no selection, the right pane shows an empty state.
- Forms and node detail are route dialogs (`RouteDialog`): a shadcn/ui Dialog that is open while its route is mounted, full screen below `lg` and a centered modal from `lg` up (D-016). Its title is a `ReactNode`, so node titles render as inline Markdown. The title (and optional description) and the close button sit in a header bar that is `sticky` at the top of the dialog while the content scrolls; `headerClassName` styles it (D-036).
- Closing a route dialog (X, Esc, overlay, Cancel, after save) goes back in history when it was opened inside the app, and replaces it with the parent route when it was opened by direct URL (`useCloseRoute`, D-017). The node detail's fallback is the relative route `..`, so it closes to the timeline view or to the chart page, whichever it is nested in. Creating a timeline replaces `/timelines/new` with the new timeline's route.
- Detail views are routes (not only component state), so the browser back button closes them and the unsaved-changes guard can intercept it.

## Dashboard (master-detail, infinite scroll)

- Query: `useTimelines(limit)` (`orderBy('updated_at').reverse().limit(n)` via `useLiveQuery`); `useInfiniteLimit(20)` holds `n`.
- `LoadMoreSentinel` sits after the last item and observes the viewport (IntersectionObserver, 200 px margin). It calls `loadMore` while visible and enabled; it is enabled only when more timelines exist and the page for the current limit has arrived, so each page loads once and a short page that leaves the sentinel on screen keeps loading.
- Growing the limit (instead of cursor pagination) keeps the list reactive when `updated_at` changes reorder items. `useLiveQuery` keeps the previous result while the query for a new limit runs, so the list does not flash.
- States: skeleton rows while loading; empty state when there are no timelines.
- List item: a `NavLink` (highlighted while its timeline or a child route is open) with title (inline Markdown, links as text), description excerpt (2 lines), node count, relative `updated_at` (`formatRelativeTime`, absolute date in the tooltip).
- Header: `h2` "Timelines", theme menu, import as new timeline (icon button "Import timeline", see Import / Export), new timeline.
- Nodes inside a timeline are rendered in full (no virtualization or infinite scroll); virtualization conflicts with drag and drop and is unnecessary at personal scale.

## Timeline view

- Header: back action (mobile), title (`h2`), layer focus button (only while the nodes use more than one layer), severity chart link (outline icon button, Lucide `ChartSpline`, `aria-label` "Severity chart", always shown), orientation toggle, "+ Node" action, actions menu (Edit, Export, Replace from file, Delete).
- Layer focus (D-037): `LayerFocusButton` (outline button, Lucide `Layers` icon + the focused layer number, `aria-label` "Focused layer N", tooltip "Switch to layer M") moves the focus to the next layer in use, ascending, wrapping around. The focus is component state of the timeline view (`useLayerFocus`), not persisted: it starts at the lowest layer in use, falls back to it when no node uses the focused layer anymore, and starts over when another timeline is selected. In `NodeList`, each `<li>` (card and marker) of another layer gets `data-dimmed` and `opacity-40`; it returns to full opacity while hovered, while it contains focus and while dragged. Dimmed cards are below WCAG AA text contrast by design (light excerpt 1.67:1, dark 2.41:1), so the axe spec scans a timeline with a single layer.
- Orientation toggle: icon-only single-select Toggle Group (`OrientationToggle`, radio semantics, labels "Vertical"/"Horizontal"). Selecting the active item again keeps it. A change is saved immediately with `updateTimeline`, which bumps `updated_at` like any timeline write (D-019); the view re-renders from the live query. A failed write shows an error toast.
- "+ Node": one link to `nodes/new`, a floating action button (bottom-right, icon only) below `lg` and a regular header button from `lg` up. The node area has bottom padding below `lg` so the last card stays clear of it.
- Delete asks for confirmation (`ConfirmDialog`, which stays open until the action settles and shows its error if it fails; optional `children` render between the description and the actions), then replaces the route with `/`.
- Below the header: description (full Markdown), then the nodes (`NodeList`, `src/features/nodes`): skeleton while loading, empty state with an "Add first node" action when there are none.
- Vertical: an ordered list with a vertical line on the left and a marker per card; cards stacked, max width `2xl`.
- Horizontal: the list sits in its own horizontal scroll container (`snap-x snap-mandatory`, cards `snap-start`) under a horizontal line with a marker per card; cards have a fixed width (`w-64`, `md:w-72`). The page itself never scrolls horizontally.
- Node card (`NodeCard`, shadcn/ui `Card`): inline title (`h3`) + description excerpt clamped to 3 lines + grip icon. A node color sets the card background from the picker's `500` shade (D-034). Each color sets two CSS variables on the card (`--node-color`: the hue's `500`; `--node-tint`: its `300`), and shared classes use them. Light: `--node-tint`, hover mixes in 20% of `--node-color`. Dark: `--node-color` mixed into `--card` at 35%, 40% on hover (`color-mix` in oklab, opaque). The default card keeps `bg-card`. Colored cards override `--muted-foreground` (`oklch(0.35 0 0)` light, `oklch(0.85 0 0)` dark) so the excerpt stays at 4.5:1 or more on every color, hover included. The node's marker on the timeline line (`NodeMarker`) takes the same fill as the card with a `--node-color` outline; uncolored nodes keep the `primary` outline on `bg-background`. Classes live in `node-colors.ts` as complete literals per color, so Tailwind's scanner generates them and emits the theme variables they reference. The title is a link to the node detail whose `::after` overlay covers the whole card (stretched link, D-022); Markdown links in the title and excerpt render as text. The grip is the drag handle: a ghost icon Button stacked above the link overlay, named "Reorder" + the rendered title (`aria-labelledby`).

## Severity chart

Components live in `src/features/chart` (D-042).

- Page (`TimelineChartView`, `timelines/:timelineId/chart`): sticky header with a "Back to timeline" icon link (every screen size), `h2` "Severity chart" and the timeline title (inline Markdown, links as text) below it. Below the header: skeleton while loading, "No nodes yet" empty state with a "Back to timeline" action, else the chart. "Timeline not found" when the timeline does not exist. It renders the node detail as a child route.
- Chart (`SeverityChart`): shadcn/ui `ChartContainer` with a Recharts `LineChart`. One point per node (`toSeverityPoints`, `severity-points.ts`): x is the 1-based place in the timeline order (nodes have no dates, D-003), y is the severity with fixed ticks 1 to 5. The line is `type="monotone"`, which never overshoots 1..5 between points; no animation. Line and point outlines use `--primary`, point fill `--background`, axis labels `--muted-foreground`. Height `h-72`, `lg:h-96`. The chart keeps 3 rem per point (plus 3 rem for the axis) as minimum width and scrolls horizontally inside its own container on long timelines; the page itself never scrolls horizontally.
- Tooltip: `ChartTooltipContent` with the node title (inline Markdown, links as text) as label, plus the severity value.
- Points: a custom `dot` renders each point as `<g role="link" tabIndex={0}>` with a transparent 24 px hit area, the visible point (r 5) and a `--ring` circle shown on hover and keyboard focus. Click or Enter navigates to `nodes/:nodeId` under the chart. The accessible name ("<title> Severity <n>") comes from hidden elements via `aria-labelledby`, because titles are Markdown. Recharts' `accessibilityLayer` is off (the points are the keyboard targets) and so is `activeDot` (it would cover the clickable point).
- Recharts compares object and array props by reference and recreates the points when they change, which drops the focused point. Props of the chart are module constants or memoized (`data`, `dot`, tooltip content). Each point also carries `data-focus-id`, so focus can return to a recreated point (see Accessibility).
- The chart config has no `color` entries, so the generated `ChartStyle` (which writes CSS variables through `dangerouslySetInnerHTML`) renders nothing.

## Node detail and forms

Components live in `src/features/nodes`.

- Create (`NodeCreateDialog`, `nodes/new`): `NodeForm` (fields in this order: title, card color, layer and severity side by side, description; the same form is used in edit mode). Saving appends the node at the end and closes the route back to the timeline.
- Detail (`NodeDetailDialog`, `nodes/:nodeId`): read mode shows the title (inline Markdown, as the dialog title), the description (`MarkdownBlock`) and the "Edit" and "Delete" actions. While the node loads the dialog shows skeletons; a node that does not exist or belongs to another timeline shows "Node not found".
- Layer and severity: two shadcn/ui Selects in a two-column row (on every screen size), each with the options 1 to 5 (stored as a number). "Layer" has the hint "The timeline can focus one layer and dim the others."; "Severity" has no hint.
- Card color (`NodeColorPicker`): a fieldset "Card color" with a single-select Toggle Group of round swatches (radio semantics): "Default" (card background) followed by the `500` shade of each `NodeColor` (`--node-color`), labeled with the color name. The selected swatch shows a check icon (`neutral-950`, at least 4.3:1 on every `500` shade) and an outer ring. Selecting the active swatch again keeps it.
- Header color (D-036): in read mode the dialog header uses the node's card surface (`nodeHeaderClasses`: the card background without hover, with the colored-card `--muted-foreground`); uncolored nodes keep `bg-popover`. In the create and edit forms the header previews the color picked in the form (`NodeForm` `onColorChange`); leaving the edit form returns to the stored color. Theme text colors stay legible on every hue (lowest: title 8.43:1, links 6.99:1, both dark yellow).
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

Lives in `NodeList` (`src/features/nodes/node-list.tsx`) and `useNodeOrder` (`use-node-order.ts`).

- `DndContext` (`closestCenter`) + `SortableContext` with `verticalListSortingStrategy` or `horizontalListSortingStrategy` by orientation. Each `<li>` is a `useSortable` item moved with `CSS.Translate` (no scaling: cards differ in height); a modifier locks movement to the list's axis.
- Sensors (D-023): `MouseSensor` (activation distance 5 px), `TouchSensor` (delay 250 ms, tolerance 5 px, so a swipe that starts on the handle does not start a drag), `KeyboardSensor` with `sortableKeyboardCoordinates` (Space/Enter picks up and drops, arrows move, Esc cancels).
- Dragging starts only from the card's drag handle (`setActivatorNodeRef`); tapping elsewhere on the card opens the detail. The handle has `touch-action: manipulation` and no text selection or touch callout.
- Auto-scroll near container edges is dnd-kit's built-in. The horizontal scroller turns snapping off while a drag is active.
- Screen reader announcements use positions ("Picked up node at position 2 of 4"), not titles (titles are Markdown). A move is announced only when the target position changes.
- Optimistic UI (D-024): on drop, `useNodeOrder` shows the new order at once and calls `reorderNodes` with the full id list. The optimistic order is dropped when the live query delivers the same order, or when nodes are added or removed meanwhile. If the write fails, the stored order is shown again with an error toast ("Could not save the new order").

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
    { "id": "…", "title": "…", "description": "…", "color": "blue", "layer": 1, "severity": 1, "position": 0, "created_at": "…", "updated_at": "…" }
  ]
}
```

- Export: one timeline per file; nodes sorted by `position`, without `timeline_id`. `exportTimeline` reads the timeline and its nodes in one read transaction. File name: `timeline-<slug>-<yyyymmdd>.json` (`exportFileName`, local date of `exported_at`; `slugify` in `src/lib/slug.ts` keeps link text, drops link targets and diacritics, caps at 50 chars, falls back to `untitled`). The JSON is indented and saved through an object URL and a temporary `<a download>` (`downloadTimeline`, `src/features/transfer/export.ts`).
- Validation (`parseTimelineFile`, `src/features/transfer/parse.ts`): files over 10 MB are rejected before reading; then JSON parse, `format`, supported `schema_version`, and the zod schema (required fields, UUID ids, ISO dates, `orientation` enum, titles trimmed and non-empty, `position` a non-negative integer). Unknown fields are stripped. Failures throw `InvalidImportFileError` with a user-facing message; schema errors list up to 3 issues as `path: message` (e.g. `nodes[1].title: Title is required`) and a count of the rest.
- Node order on import comes from the array order; the `position` values are validated but not used.
- Node `color` is optional in the file: absent means `null` (files exported before card colors), otherwise it must be `null` or a `NodeColor`. Node `layer` and `severity` are optional too: absent means `1` (files exported before those fields), otherwise an integer from 1 to 5. Export always writes all three. Import as new and replace keep them.
- The import repository functions re-validate their input with `timelineFileSchema`; all writes run in one transaction, so on any error nothing is written.

### Import flow (UI)

`useTimelineImport(target, onImported?)` (`src/features/transfer/use-timeline-import.tsx`) returns `chooseFile()` and a `dialog` element (hidden file input + dialog). D-025.

1. `chooseFile()` opens the browser's file picker directly from the click/menu select (dashboard "Import timeline" button, timeline menu "Replace from file"). The input is cleared first so the same file can be picked again. The two inputs are labeled "File to import" and "File to replace with".
2. The file is parsed. Nothing is written before the user confirms.
3. Valid file: a `ConfirmDialog` with the preview (`ImportPreview`: inline title, node count, export date). Import as new: "Import this timeline?" / "Import", then navigates to the new timeline. Replace: "Replace this timeline?" / destructive "Replace", stating that the change cannot be undone; this dialog is the replace confirmation. A failed write keeps the dialog open with the error.
4. Invalid file: "Could not import the file" with the parser message, actions "Close" and "Choose another file" (reopens the picker from the click).

### Modes

| Mode | Where | Timeline record | Nodes |
|---|---|---|---|
| Import as new | Dashboard | New `id`, `created_at = now`; title/description/orientation from file | New `id`s; `created_at`/`updated_at` from file; `position` from array order |
| Replace | Timeline actions menu (requires confirmation) | Keeps target `id` and `created_at`; title/description/orientation from file; `updated_at = now` | Existing nodes deleted; imported nodes get new `id`s (avoids collisions with other timelines); `created_at`/`updated_at` from file |

## Theme

- `next-themes` with `attribute="class"`, `defaultTheme="system"`; the choice is stored in `localStorage` under `timeline-app:theme` (`storageKey`). `ThemeMenu` (list pane header, icon button "Theme") is a Dropdown Menu radio group: Light, Dark, System.
- An inline script in `index.html` applies the stored theme (class and `color-scheme`) before the app loads, so a dark theme does not flash light. next-themes' own script is rendered as a data block (`type="application/json"`); it never runs in a client-only render.
- UI colors come only from the shadcn/ui tokens in `src/index.css` (`:root` and `.dark`); node card colors come from the Tailwind palette (see Timeline view). Tokens changed from the Nova preset for WCAG AA contrast (D-027): light `--muted-foreground` and `--destructive` are darker, dark `--destructive` is lighter.

## Feedback (toasts)

Sonner `Toaster` (`src/components/ui/sonner.tsx`), mounted once in `AppProviders`, bottom center, raised to `5.5rem` on small screens so it stays clear of the floating "Add node" button. D-030.

- Success: timeline created / saved / deleted, node created / saved / deleted, timeline exported / imported / replaced.
- Error: export, orientation change and reorder failures (actions without a form or dialog to show them).
- Form save errors stay inline in the form; confirmation and import errors stay in their dialog (`ConfirmDialog` error, "Could not import the file").

## Accessibility

- Landmarks: `<header>` with the visually hidden `<h1>`, `<aside aria-label="Timelines">`, `<main>`. Headings: `h1` app, `h2` per pane (list, timeline), `h3` node cards. Every icon-only control has an `aria-label`; icons are `aria-hidden`.
- Focus after dialogs (`useReturnFocus`, `src/hooks/use-return-focus.ts`, used by `RouteDialog` and `ConfirmDialog`): these dialogs have no Radix `Trigger`, so Radix would leave focus on `<body>`. The hook records the focused element (HTML or SVG) when the dialog opens (for a dropdown menu item, the menu's trigger) and focuses it again on close. When it was removed, the element with the same `data-focus-id` (`focusIdAttribute`, `src/lib/focus.ts`) takes its place; when there is none or it is hidden (deleted card, list pane hidden on mobile), focus goes to the page heading. D-028, D-042.
- Focus after navigation (`AppLayout`): when a navigation leaves focus nowhere (on `<body>` or on an element that is gone or hidden, e.g. the list link on mobile), focus moves to the page heading of the view now shown, waiting up to 2 s for a view that is still loading. It runs after dialogs closed by the same navigation have restored their focus.
- Page headings carry `pageHeadingProps` (`src/lib/focus.ts`: `tabIndex={-1}`, `data-page-heading`); the last visible one wins, so the timeline heading is preferred over the list heading on desktop.
- Automated checks: `e2e/a11y.spec.ts` runs axe (WCAG 2.0/2.1/2.2 A and AA + best practices) on the main screens (including the severity chart with a tooltip open) in light and dark themes, on both viewports. While a modal menu or dialog is open, the rules about content Radix hides on purpose are skipped (`aria-hidden-focus`, `landmark-one-main`, `page-has-heading-one`, `region`). `e2e/focus.spec.ts` covers focus return.

## PWA and offline

`vite-plugin-pwa` in `vite.config.ts` (D-031):

- `generateSW` precaches every built asset (JS, CSS, HTML, fonts, icons); navigations fall back to `index.html`, so deep links load offline.
- `registerType: 'autoUpdate'` with the injected register script: a new version installs in the background and is used on the next load; the page is never reloaded automatically (no lost edits).
- Manifest: "Timeline App" / "Timelines", `display: standalone`, `start_url` and `scope` set by the plugin to Vite's `base`, icons 64/192/512 and a maskable 512. Icons, `favicon.ico` and the Apple touch icon are generated from `public/favicon.svg` with `npm run generate-pwa-assets` (`pwa-assets.config.ts`) and committed.
- The service worker is built only by `npm run build` (not active in `npm run dev`, so E2E runs against the dev server without it).

## Deployment

GitHub Pages project site at `https://rafaelcastrodev.github.io/timeline-app/`, deployed by `.github/workflows/deploy.yml` on every push to `main` (Pages source: GitHub Actions). D-039.

- The workflow runs `npm ci`, `lint`, `test`, then `npm run build` with `BASE_PATH=/<repo>/`, copies `dist/index.html` to `dist/404.html` and deploys `dist`.
- `vite.config.ts` sets `base` from `BASE_PATH` (default `/`, so dev, preview and E2E run at the root). The router's `basename` is `import.meta.env.BASE_URL`; asset links in `index.html`, the manifest and the service worker scope follow `base`.
- Pages has no rewrites: a deep link (`/timeline-app/timelines/<id>`) without the service worker gets `404.html`, the app shell, and the router renders the route. Once the service worker is installed it serves the shell for navigations itself.
- Storage is shared with the account's other Pages sites on the same origin; storage names carry the app prefix (D-038).

## Risks

- IndexedDB eviction (notably Safari for non-installed web apps after a period of no use). Mitigation: `navigator.storage.persist()`, PWA install, regular JSON exports.
- Drag vs. scroll on touch devices. Mitigation: drag handle + activation delay; test on a real device.
- `beforeunload` text cannot be customized.
