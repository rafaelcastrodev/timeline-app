# Timeline App

Personal, offline-first web app for building event timelines. Everything stays in your browser (IndexedDB): there is no account, no server and no sync. JSON export is the backup.

## Using the app

- **Demo.** On first launch the app contains a "Lorem ipsum demo" timeline with 15 sample nodes. Delete it whenever you like; it does not come back.
- **Timelines.** Create one with **New timeline**. The list shows the most recently changed first; select one to open it. On a phone, the list and the timeline are separate screens.
- **Nodes.** Add events with **+ Node** (the round button at the bottom right on a phone). Click a card to read it; **Edit** in the detail switches to the form. Pick a **card color** in the form to tint the card on the timeline, a **layer** (1 to 5, default 1) to group story threads, and a **severity** (1 to 5, default 1). Once a timeline uses more than one layer, the layer button in its header switches the focused layer: nodes of the other layers are dimmed.
- **Severity chart.** The chart button next to the layer button opens a page that plots every node as a point on a curve, in timeline order: the higher the severity, the higher the point. Hover a point to see the node title; click it (or press Enter) to open the node.
- **Order.** Drag a card by its grip handle. On a touch screen, press and hold the grip briefly, then drag. With a keyboard, focus the grip, press Space or Enter, move with the arrow keys, and press Space or Enter again to drop (Escape cancels).
- **Orientation.** The toggle in the timeline header switches between vertical and horizontal. It is saved per timeline.
- **Markdown.** Titles and descriptions accept Markdown. Titles support bold, italic, strikethrough, code and links; descriptions also support lists, tables, task lists and headings. Raw HTML is shown as text.
- **Theme.** Light, dark or system, from the theme button next to the list title.
- **Install.** The app works offline once it has been loaded. Browsers that support it offer to install it (for example "Install app" in the address bar on desktop Chrome or "Add to Home Screen" on iOS Safari).

Unsaved changes in a form are never discarded without asking. Deleting a timeline or a node always asks for confirmation.

## Backups

Your data lives only in this browser, on this device. It is lost if you clear the site data, uninstall the browser or use a private window, and some browsers (notably Safari) can delete it after a period without visiting the site when it is not installed.

- **Export regularly.** In a timeline, open the actions menu (⋮) and choose **Export**. You get one JSON file per timeline (`timeline-<title>-<date>.json`). Keep the files somewhere outside the browser (a synced folder, a USB drive).
- **Restore.** Use **Import timeline** (the upload button in the list header) to add a file as a new timeline, or **Replace from file** in a timeline's actions menu to overwrite that timeline with the file's content. Replacing cannot be undone. Files are checked before anything is written; an invalid file changes nothing.
- **Move to another device or browser.** Export on one, import on the other.
- **Install the app.** An installed app is less likely to have its storage cleared. The app also asks the browser for persistent storage on startup.

## Development

Requirements: Node.js 20.19+ or 22.12+ (Vite 8) and npm.

```sh
npm install
npm run dev          # dev server
npm run build        # type check + production build (with the service worker)
npm run preview      # serve the production build
npm test             # unit and integration tests (Vitest)
npm run e2e          # end-to-end tests (Playwright, mobile and desktop)
npm run lint
npm run format:check
```

The first `npm run e2e` needs the Playwright browser: `npx playwright install chromium`.

Tests run with `VITE_DEMO_TIMELINE=off`, so they start from an empty database instead of the demo timeline. Set it for `npm run dev` too to start without the demo (it only matters when the browser has no app data yet).

Deployment: every push to `main` builds the app and publishes it to GitHub Pages (`.github/workflows/deploy.yml`; in the repository settings, Pages → Source must be **GitHub Actions**). To build for a subpath locally: `BASE_PATH=/timeline-app/ npm run build`.

Project docs: [requirements](docs/REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [plan and status](docs/PLAN.md), [decision log](docs/DECISIONS.md).
