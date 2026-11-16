# Requirements

## Context

Personal application. No backend: all data stays in the browser (IndexedDB). JSON export is the backup mechanism.

## Functional

| ID | Requirement | Details |
|---|---|---|
| F1 | Multiple timelines | Create, view, edit and delete timelines. |
| F2 | Dashboard (master-detail) | Timeline list (master) with infinite scroll; selecting one opens the timeline (detail). Two panes on desktop, stacked navigation on mobile. |
| F3 | Node CRUD | Create, view, edit and delete nodes inside a timeline. |
| F4 | Orientation | Each timeline can be displayed horizontally or vertically. The choice is saved per timeline. |
| F5 | Compact node card | On the timeline a node shows only its title and the first lines (~3) of its description. |
| F6 | Node detail | Clicking a node opens its detail: full screen on mobile, modal on desktop. Opens in read mode; an "Edit" action switches to the form. |
| F7 | Manual ordering | Nodes are reordered by drag and drop. Order is manual, not derived from dates. |
| F8 | Unsaved-changes guard | Leaving a form with unsaved changes asks for confirmation. Covers: modal close (X, Esc, overlay), Cancel, in-app navigation, browser back, tab close/reload. |
| F9 | Delete confirmation | Deleting a node or a timeline always asks for confirmation. Deleting a timeline deletes its nodes. |
| F10 | JSON export | Export one timeline (metadata + nodes) as a versioned JSON file. |
| F11 | JSON import | Two modes: "import as new timeline" and "replace an existing timeline" (destructive, requires confirmation). Input is validated; invalid files are rejected with a clear error and nothing is written. |
| F12 | Timestamps | Timelines and nodes have `created_at` (set once) and `updated_at`. Node `created_at` is preserved by import. |
| F13 | Markdown | Every user-entered text field (titles and descriptions) is Markdown. Titles render inline formatting only. |
| F14 | Node card color | The node form has a color picker showing the 500 shade of each chromatic Tailwind color, plus a default (no color). On the timeline the card background uses a lighter tone of the chosen color in light mode and a dark tint of it in dark mode. The node's marker on the timeline line uses the same color. In the node detail and its forms, the title sits in a header bar that stays at the top while scrolling and uses the card color. |
| F15 | Node layers | Each node has a layer from 1 to 5 (default 1), chosen with a select in the node form. The timeline view has a button that switches the focused layer; nodes of the other layers are shown with reduced opacity. Visual only: layers do not change order, filtering or export content beyond the field itself. |
| F16 | Node severity | Each node has a severity from 1 to 5 (default 1), chosen with a select next to the layer select in the node form. Stored and exported; it does not change the timeline view. |
| F17 | Severity chart | Each timeline has a chart page, opened from a button next to the layer button in the timeline view. Every node is a point on a curve, in timeline order; the higher the severity, the higher the point. Hovering a point shows the node title; clicking it opens the node detail. Card color and layer are not shown in the chart. |
| F18 | Demo timeline | On first launch (the browser has no app data yet) the app contains a demo timeline: "Lorem ipsum demo" with 15 nodes of random colors, layers and severities, lorem ipsum titles and descriptions of at most 50 characters. It is an ordinary timeline: it can be edited or deleted, and once deleted it does not come back. |

## Non-functional

- Mobile first, responsive up to desktop.
- Works offline (service worker) and is installable as a PWA.
- Consistent UI: Tailwind CSS + shadcn/ui.
- Accessible: keyboard drag and drop, focus management in dialogs, visible focus states.
- Safe Markdown rendering: no raw HTML, no script URLs.

## Out of scope

Backend, sync between devices, authentication, multiple users, attachments/uploads, node search/filter (not requested).
