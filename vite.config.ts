import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Public path of the build. `/` locally; the GitHub Pages workflow sets `BASE_PATH=/timeline-app/`
  // because a project site is served from `https://<user>.github.io/<repo>/`.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    // Installable app with every built asset precached, so it works offline. A new version is
    // installed in the background and used on the next load (no forced reload mid-edit).
    // Icons come from `npm run generate-pwa-assets`. The service worker is off in `npm run dev`.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Timeline App',
        short_name: 'Timelines',
        description: 'Personal, offline-first app for building event timelines.',
        // `start_url` and `scope` are left out: vite-plugin-pwa sets both to `base`.
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Client-side routes (/timelines/…) are served the app shell offline.
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Tests start from an empty database; `src/db/demo-timeline.test.ts` covers the demo seed.
    env: { VITE_DEMO_TIMELINE: 'off' },
  },
})
