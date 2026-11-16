/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `off` skips the demo timeline written when the database is created. */
  readonly VITE_DEMO_TIMELINE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
