# Timeline App

Personal, offline-first web app for building event timelines. React SPA, all data in the browser's IndexedDB. No backend, no auth, single user.

## Source of truth

- Requirements: @docs/REQUIREMENTS.md
- Architecture (stack, data model, routes, UX rules): @docs/ARCHITECTURE.md
- Execution plan and current status: @docs/PLAN.md
- Decision log: @docs/DECISIONS.md

## Session protocol

- Session start: read `docs/PLAN.md` "Current status" and continue from the first unchecked item of the active phase.
- After finishing a task: tick it in `docs/PLAN.md` and update "Current status".
- After any design decision: add an entry to `docs/DECISIONS.md` (next `D-xxx` id) and update the affected doc in the same edit.
- Docs hold only current facts. Remove superseded content instead of annotating it; history lives in `docs/DECISIONS.md`.

## Conventions

- Code, identifiers, comments, filenames, commits, docs: English. Conventional commits.
- TypeScript strict mode. No `any` without a comment justifying it.
- Persisted field names use `snake_case` (`created_at`, `timeline_id`) to match the JSON export format. TypeScript identifiers otherwise use `camelCase`.
- UI components come from shadcn/ui (`src/components/ui`). Do not hand-roll a component shadcn/ui already provides; extend it instead.
- Styling only through Tailwind utility classes and the shadcn/ui theme tokens. No ad hoc CSS files beyond `src/index.css`.
- Mobile first: write base classes for small screens, add `md:`/`lg:` overrides.
- All user-entered text fields are Markdown. Render only through the shared Markdown components (`src/components/markdown`). Never use `dangerouslySetInnerHTML`.
- Data access only through the repositories in `src/db`. Components never call Dexie directly.
- Multi-row writes (reorder, cascade delete, import) run inside a single Dexie transaction.

## Commands

Defined in phase 0 (see `docs/PLAN.md`). Update this section when `package.json` scripts exist.
