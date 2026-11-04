import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('drops Markdown syntax, diacritics and punctuation', () => {
    expect(slugify('**Viagem** à _Bahia_, 2026!')).toBe('viagem-a-bahia-2026')
  })

  it('keeps link text and drops link targets', () => {
    expect(slugify('See [the plan](https://example.com/x) ![pic](a.png)')).toBe('see-the-plan-pic')
  })

  it('caps the length without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(49)} b`)
    expect(slug).toBe('a'.repeat(49))
  })

  it('falls back when nothing is left', () => {
    expect(slugify('***')).toBe('untitled')
    expect(slugify('日本', 'timeline')).toBe('timeline')
  })
})
