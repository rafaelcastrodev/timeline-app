/**
 * Names of everything the app stores in the browser. Every key starts with the app prefix, because
 * all GitHub Pages project sites of one account share the `<user>.github.io` origin and its storage.
 */
export const STORAGE_PREFIX = 'timeline-app'

/** IndexedDB database name (Dexie). Already the bare prefix, so existing data keeps its name. */
export const DATABASE_NAME = STORAGE_PREFIX

/** `localStorage` key of the theme choice (next-themes). `index.html` reads it before the app loads. */
export const THEME_STORAGE_KEY = `${STORAGE_PREFIX}:theme`
