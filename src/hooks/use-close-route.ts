import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

/**
 * Closes a route-based view (dialog, form). Goes back in history when the view was opened
 * from inside the app, so the closed view does not stay in the history stack. When the view
 * was the first entry (direct URL), replaces it with `fallback`.
 */
export function useCloseRoute(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(() => {
    if (location.key === 'default') void navigate(fallback, { replace: true })
    else void navigate(-1)
  }, [fallback, location.key, navigate])
}
