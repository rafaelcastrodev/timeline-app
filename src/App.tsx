import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

// The basename follows Vite's `base`, so routes also match under a subpath (GitHub Pages).
const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
