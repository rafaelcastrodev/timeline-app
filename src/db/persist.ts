/**
 * Asks the browser to keep IndexedDB data out of automatic eviction.
 * Returns whether storage is persisted. Never throws.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = globalThis.navigator?.storage
  if (!storage?.persist) return false
  try {
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return false
  }
}
