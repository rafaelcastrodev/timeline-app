import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { DATABASE_NAME, STORAGE_PREFIX, THEME_STORAGE_KEY } from './storage'

describe('storage names', () => {
  it('start with the app prefix', () => {
    expect(DATABASE_NAME.startsWith(STORAGE_PREFIX)).toBe(true)
    expect(THEME_STORAGE_KEY.startsWith(`${STORAGE_PREFIX}:`)).toBe(true)
  })

  it('the inline theme script in index.html reads the same key', () => {
    expect(indexHtml).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`)
  })
})
