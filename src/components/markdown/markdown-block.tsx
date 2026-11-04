import Markdown, { type Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import { MarkdownLink } from './markdown-link'
import { remarkPlugins } from './plugins'

const components: Components = {
  a: MarkdownLink,
  h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-semibold" />,
  h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-semibold" />,
  h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-semibold" />,
  h4: ({ node, ...props }) => <h4 {...props} className="text-base font-semibold" />,
  h5: ({ node, ...props }) => <h5 {...props} className="text-sm font-semibold" />,
  h6: ({ node, ...props }) => (
    <h6 {...props} className="text-sm font-semibold text-muted-foreground" />
  ),
  ul: ({ node, className, ...props }) => (
    <ul
      {...props}
      className={cn(
        'list-disc space-y-1 pl-6',
        // GFM task lists carry `contains-task-list`; their items show checkboxes instead of bullets.
        className?.includes('contains-task-list') && 'list-none pl-1',
      )}
    />
  ),
  ol: ({ node, ...props }) => <ol {...props} className="list-decimal space-y-1 pl-6" />,
  li: ({ node, ...props }) => <li {...props} className="[&>ol]:mt-1 [&>ul]:mt-1" />,
  input: ({ node, ...props }) => (
    <input {...props} disabled className="mr-2 align-middle accent-primary" />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote {...props} className="border-l-2 border-border pl-4 text-muted-foreground" />
  ),
  hr: ({ node, ...props }) => <hr {...props} className="border-border" />,
  code: ({ node, ...props }) => (
    <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]" />
  ),
  pre: ({ node, ...props }) => (
    <pre
      {...props}
      className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm [&>code]:bg-transparent [&>code]:p-0"
    />
  ),
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} className="w-full border-collapse text-sm" />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th {...props} className="border border-border px-2 py-1 text-left font-semibold" />
  ),
  td: ({ node, ...props }) => <td {...props} className="border border-border px-2 py-1" />,
  img: ({ node, ...props }) => <img {...props} loading="lazy" className="max-w-full rounded-lg" />,
}

interface MarkdownBlockProps {
  children: string
  className?: string
}

/** Full GFM Markdown for descriptions in detail views. Raw HTML is shown as text, never rendered. */
export function MarkdownBlock({ children, className }: MarkdownBlockProps) {
  return (
    <div className={cn('space-y-3 text-sm leading-relaxed break-words', className)}>
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </Markdown>
    </div>
  )
}
