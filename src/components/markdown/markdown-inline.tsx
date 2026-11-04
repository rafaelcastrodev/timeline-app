import Markdown, { type Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import { MarkdownImageAlt, MarkdownLink, MarkdownPlainLink } from './markdown-link'
import { inlineElements, remarkPlugins } from './plugins'

const inlineCode: Components['code'] = ({ node, ...props }) => (
  <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]" />
)

const components: Components = {
  a: MarkdownLink,
  code: inlineCode,
  img: MarkdownImageAlt,
}

const componentsWithoutLinks: Components = { ...components, a: MarkdownPlainLink }

interface MarkdownInlineProps {
  children: string
  className?: string
  /** Render links as plain text. Use inside links, buttons and other interactive elements. */
  disableLinks?: boolean
}

/**
 * Inline-only Markdown for titles: `strong`, `em`, `del`, `code` and links. Block syntax
 * (headings, lists, paragraphs) is unwrapped to its text; images become their alt text.
 */
export function MarkdownInline({ children, className, disableLinks = false }: MarkdownInlineProps) {
  return (
    <span className={cn('break-words', className)}>
      <Markdown
        remarkPlugins={remarkPlugins}
        allowedElements={inlineElements}
        unwrapDisallowed
        components={disableLinks ? componentsWithoutLinks : components}
      >
        {children}
      </Markdown>
    </span>
  )
}
