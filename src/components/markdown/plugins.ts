import remarkGfm from 'remark-gfm'
import type { Options } from 'react-markdown'

/** Remark plugins shared by every Markdown variant. Raw HTML is never enabled (no `rehype-raw`). */
export const remarkPlugins: Options['remarkPlugins'] = [remarkGfm]

/** Elements kept by `MarkdownInline`; everything else is unwrapped to its children. */
export const inlineElements = ['strong', 'em', 'del', 'code', 'a', 'img'] as const
