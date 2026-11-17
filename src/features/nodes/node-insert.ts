/** Search param of the `nodes/new` route naming the node the new one is inserted before. */
export const INSERT_BEFORE_PARAM = 'before'

/** Route of the node form that inserts the new node before `beforeId`. */
export function nodeInsertPath(timelineId: string, beforeId: string): string {
  const params = new URLSearchParams({ [INSERT_BEFORE_PARAM]: beforeId })
  return `/timelines/${timelineId}/nodes/new?${params.toString()}`
}
