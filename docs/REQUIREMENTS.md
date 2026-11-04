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

## Non-functional

- Mobile first, responsive up to desktop.
- Works offline (service worker) and is installable as a PWA.
- Consistent UI: Tailwind CSS + shadcn/ui.
- Accessible: keyboard drag and drop, focus management in dialogs, visible focus states.
- Safe Markdown rendering: no raw HTML, no script URLs.

## Out of scope

Backend, sync between devices, authentication, multiple users, attachments/uploads, node search/filter (not requested).
