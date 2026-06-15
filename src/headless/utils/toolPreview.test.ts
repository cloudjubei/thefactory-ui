import { describe, expect, it } from 'vitest'
import { MAX_TOOL_PREVIEW_CHARS, safePreviewString } from './toolPreview'

describe('safePreviewString', () => {
  it('passes a short string through unchanged', () => {
    expect(safePreviewString('hello')).toEqual({ text: 'hello', truncated: false, omittedChars: 0 })
  })

  it('pretty-prints a short object', () => {
    expect(safePreviewString({ a: 1 }).text).toBe('{\n  "a": 1\n}')
  })

  it('serialises nullish to an empty string', () => {
    expect(safePreviewString(undefined)).toEqual({ text: '', truncated: false, omittedChars: 0 })
    expect(safePreviewString(null).text).toBe('')
  })

  it('caps an over-long string and reports the omission', () => {
    const big = 'x'.repeat(MAX_TOOL_PREVIEW_CHARS + 5000)
    const out = safePreviewString(big)
    expect(out.truncated).toBe(true)
    expect(out.omittedChars).toBe(5000)
    expect(out.text.length).toBeLessThan(big.length)
    expect(out.text).toContain('truncated')
  })

  it('honours an explicit smaller cap', () => {
    const out = safePreviewString('abcdefghij', 4)
    expect(out.text.startsWith('abcd')).toBe(true)
    expect(out.truncated).toBe(true)
    expect(out.omittedChars).toBe(6)
  })

  it('does not throw on a circular structure', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => safePreviewString(circular)).not.toThrow()
  })
})
