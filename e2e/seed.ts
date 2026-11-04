import type { Page } from '@playwright/test'

/** Writes records straight into IndexedDB (wait until the app has opened the database first). */
export async function seedRecords(
  page: Page,
  records: { timelines?: object[]; nodes?: object[] },
): Promise<void> {
  await page.evaluate(async ({ timelines = [], nodes = [] }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('timeline-app')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction(['timelines', 'nodes'], 'readwrite')
    for (const timeline of timelines) tx.objectStore('timelines').put(timeline)
    for (const node of nodes) tx.objectStore('nodes').put(node)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, records)
}

/** Reads every record from IndexedDB. */
export async function readRecords(
  page: Page,
): Promise<{ timelines: Array<Record<string, unknown>>; nodes: Array<Record<string, unknown>> }> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('timeline-app')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const tx = db.transaction(['timelines', 'nodes'], 'readonly')
    const all = (store: string) =>
      new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const request = tx.objectStore(store).getAll()
        request.onsuccess = () => resolve(request.result as Array<Record<string, unknown>>)
        request.onerror = () => reject(request.error)
      })
    const [timelines, nodes] = await Promise.all([all('timelines'), all('nodes')])
    db.close()
    return { timelines, nodes }
  })
}
