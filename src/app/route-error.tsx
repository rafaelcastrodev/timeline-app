import { TriangleAlertIcon } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'

function ErrorScreen({ title, description }: { title: string; description?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <EmptyState
        icon={TriangleAlertIcon}
        title={title}
        description={description}
        action={
          <Button asChild variant="outline">
            <Link to="/">Back to timelines</Link>
          </Button>
        }
      />
    </main>
  )
}

/** Catch-all route for unknown URLs. */
export function NotFound() {
  return <ErrorScreen title="Page not found" />
}

/** Route error boundary. */
export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />
  return (
    <ErrorScreen
      title="Something went wrong"
      description={error instanceof Error ? error.message : undefined}
    />
  )
}
