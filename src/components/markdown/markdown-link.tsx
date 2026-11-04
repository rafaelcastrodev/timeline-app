import type { ComponentProps } from 'react'
import type { ExtraProps } from 'react-markdown'

type MarkdownLinkProps = ComponentProps<'a'> & ExtraProps

/**
 * Link rendered from Markdown. Opens in a new tab. When the URL transform blanks the href
 * (e.g. `javascript:`), the link degrades to plain text.
 */
export function MarkdownLink({ href, children, node, ...props }: MarkdownLinkProps) {
  if (!href) return <span>{children}</span>
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-4"
    >
      {children}
    </a>
  )
}

/** Link rendered as plain text, for Markdown inside interactive containers (no nested links). */
export function MarkdownPlainLink({ children }: MarkdownLinkProps) {
  return <span>{children}</span>
}

/** Image replaced by its alt text, for variants that must stay text-only. */
export function MarkdownImageAlt({ alt }: ComponentProps<'img'> & ExtraProps) {
  return alt ? <span>{alt}</span> : null
}
