/** Current time as an ISO 8601 string (UTC). */
export function nowIso(): string {
  return new Date().toISOString()
}

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** Human-readable distance from `now`, e.g. "5 minutes ago", "yesterday", "now". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000)
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.trunc(seconds / size), unit)
  }
  return relativeFormat.format(0, 'second')
}

/** Locale date and time, for tooltips next to relative times. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}
