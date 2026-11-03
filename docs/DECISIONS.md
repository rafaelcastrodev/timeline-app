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
