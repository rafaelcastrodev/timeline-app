import type { NodeColor } from '@/types/models'

interface NodeColorClasses {
  label: string
  /**
   * Sets `--node-color` (the hue's 500 shade: picker swatch, dark card tint) and `--node-tint`
   * (the hue's 300 shade: light card background). Used with `swatchFillClasses`, `surfaceClasses`, `cardClasses` and `markerClasses`.
   */
  vars: string
}

/**
 * Tailwind classes per card color. Every class is a complete literal so Tailwind's scanner
 * generates it (and the theme variables it references); never build these names by concatenation.
 */
export const nodeColorClasses: Record<NodeColor, NodeColorClasses> = {
  red: {
    label: 'Red',
    vars: '[--node-color:var(--color-red-500)] [--node-tint:var(--color-red-300)]',
  },
  orange: {
    label: 'Orange',
    vars: '[--node-color:var(--color-orange-500)] [--node-tint:var(--color-orange-300)]',
  },
  amber: {
    label: 'Amber',
    vars: '[--node-color:var(--color-amber-500)] [--node-tint:var(--color-amber-300)]',
  },
  yellow: {
    label: 'Yellow',
    vars: '[--node-color:var(--color-yellow-500)] [--node-tint:var(--color-yellow-300)]',
  },
  lime: {
    label: 'Lime',
    vars: '[--node-color:var(--color-lime-500)] [--node-tint:var(--color-lime-300)]',
  },
  green: {
    label: 'Green',
    vars: '[--node-color:var(--color-green-500)] [--node-tint:var(--color-green-300)]',
  },
  emerald: {
    label: 'Emerald',
    vars: '[--node-color:var(--color-emerald-500)] [--node-tint:var(--color-emerald-300)]',
  },
  teal: {
    label: 'Teal',
    vars: '[--node-color:var(--color-teal-500)] [--node-tint:var(--color-teal-300)]',
  },
  cyan: {
    label: 'Cyan',
    vars: '[--node-color:var(--color-cyan-500)] [--node-tint:var(--color-cyan-300)]',
  },
  sky: {
    label: 'Sky',
    vars: '[--node-color:var(--color-sky-500)] [--node-tint:var(--color-sky-300)]',
  },
  blue: {
    label: 'Blue',
    vars: '[--node-color:var(--color-blue-500)] [--node-tint:var(--color-blue-300)]',
  },
  indigo: {
    label: 'Indigo',
    vars: '[--node-color:var(--color-indigo-500)] [--node-tint:var(--color-indigo-300)]',
  },
  violet: {
    label: 'Violet',
    vars: '[--node-color:var(--color-violet-500)] [--node-tint:var(--color-violet-300)]',
  },
  purple: {
    label: 'Purple',
    vars: '[--node-color:var(--color-purple-500)] [--node-tint:var(--color-purple-300)]',
  },
  fuchsia: {
    label: 'Fuchsia',
    vars: '[--node-color:var(--color-fuchsia-500)] [--node-tint:var(--color-fuchsia-300)]',
  },
  pink: {
    label: 'Pink',
    vars: '[--node-color:var(--color-pink-500)] [--node-tint:var(--color-pink-300)]',
  },
  rose: {
    label: 'Rose',
    vars: '[--node-color:var(--color-rose-500)] [--node-tint:var(--color-rose-300)]',
  },
}

/** Picker swatch fill, also for hover and selected (replaces the toggle's muted backgrounds). */
export const swatchFillClasses =
  'bg-(--node-color) hover:bg-(--node-color) data-[state=on]:bg-(--node-color)'

/**
 * Colored surface (card, node dialog header). Light: the 300 shade. Dark: 35% of the 500 shade
 * mixed into `--card`, so the tint matches the swatch with the same strength for every hue. The
 * mixes are opaque, so a dragged card does not show the cards below. Theme text colors keep AA on
 * every hue (lowest: foreground 8.43:1, links 6.99:1, dark yellow). The default
 * `--muted-foreground` does not, so it is overridden (lowest: light hover indigo 4.84:1, dark hover
 * yellow 4.91:1).
 */
export const surfaceClasses = [
  'bg-(--node-tint) dark:bg-[color-mix(in_oklab,var(--node-color)_35%,var(--card))]',
  '[--muted-foreground:oklch(0.35_0_0)] dark:[--muted-foreground:oklch(0.85_0_0)]',
].join(' ')

/** Colored card: the surface plus a hover state (20% more of the 500 in light, 40% mix in dark). */
export const cardClasses = [
  surfaceClasses,
  'hover:bg-[color-mix(in_oklab,var(--node-color)_20%,var(--node-tint))]',
  'dark:hover:bg-[color-mix(in_oklab,var(--node-color)_40%,var(--card))]',
].join(' ')

/**
 * Colored timeline marker: filled with the card background (same expressions as `surfaceClasses`)
 * and outlined with the 500 shade, so a light fill stays visible on the page background.
 */
export const markerClasses =
  'border-(--node-color) bg-(--node-tint) dark:bg-[color-mix(in_oklab,var(--node-color)_35%,var(--card))]'

/** Classes for a node dialog header in the node's color; none for the default color. */
export function nodeHeaderClasses(color: NodeColor | null): string | undefined {
  return color ? `${nodeColorClasses[color].vars} ${surfaceClasses}` : undefined
}
