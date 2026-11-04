import Markdown, { type Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import { MarkdownImageAlt, MarkdownPlainLink } from './markdown-link'
import { remarkPlugins } from './plugins'

const Paragraph: Components['p'] = ({ node, ...props }) => <p {...props} />

const components: Components = {
  h1: Paragraph,
  h2: Paragraph,
  h3: Paragraph,
  h4: Paragraph,
  h5: Paragraph,
  h6: Paragraph,
  // Excerpts sit inside clickable cards and list items: no nested links, no images.
  a: MarkdownPlainLink,
  img: MarkdownImageAlt,
  ul: ({ node, ...props }) => <ul {...props} className="list-inside list-disc" />,
  ol: ({ node, ...props }) => <ol {...props} className="list-inside list-decimal" />,
  input: ({ node, ...props }) => <input {...props} disabled className="mr-1 align-middle" />,
  code: ({ node, ...props }) => <code {...props} className="font-mono text-[0.9em]" />,
  pre: ({ node, ...props }) => <pre {...props} className="font-mono whitespace-pre-wrap" />,
}

const clampClass = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
} as const

interface MarkdownExcerptProps {
  children: string
  /** Number of visible lines. */
  lines?: keyof typeof clampClass
  className?: string
}

/**
 * Description excerpt for cards and list items, clamped to a few lines. Headings render as
 * paragraphs, images as their alt text, links as plain text.
 */
export function MarkdownExcerpt({ children, lines = 3, className }: MarkdownExcerptProps) {
  return (
    <div
      className={cn('text-sm break-words text-muted-foreground', clampClass[lines], className)}
      data-slot="markdown-excerpt"
    >
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </Markdown>
    </div>
  )
}
