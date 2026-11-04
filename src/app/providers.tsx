import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

/**
 * App-wide providers: theme (light, dark or system; the `dark` class on `<html>`, stored in
 * `localStorage` under `theme`, which the inline script in `index.html` also reads) and toasts.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // next-themes renders an inline script meant for server rendering; on the client React never
      // runs it (the script in `index.html` does that job). Typing it as a data block says so and
      // avoids React's warning about script tags.
      scriptProps={{ type: 'application/json' }}
    >
      {children}
      {/* Bottom center, raised on small screens to stay clear of the floating "Add node" button. */}
      <Toaster position="bottom-center" mobileOffset={{ bottom: '5.5rem' }} />
    </ThemeProvider>
  )
}
