const MAX_SLUG_LENGTH = 50

/**
 * URL- and file-name-safe slug of a Markdown title: link targets dropped, diacritics removed,
 * lowercase ASCII letters and digits joined by `-`. Returns `fallback` when nothing is left.
 */
export function slugify(markdown: string, fallback = 'untitled'): string {
  const slug = markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}
