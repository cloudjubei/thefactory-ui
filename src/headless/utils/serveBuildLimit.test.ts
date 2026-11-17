import { describe, expect, it } from 'vitest'

import {
  SERVE_BUILD_LIMIT_COPY,
  SERVE_BUILD_LIMIT_DEFAULT_MS,
  SERVE_BUILD_LIMIT_METADATA_KEY,
  SERVE_BUILD_LIMIT_MINUTE_MS,
} from './serveBuildLimitConstants'
import {
  readServeBuildTimeoutMs,
  serveBuildLimitField,
  serveBuildLimitMinutesText,
  withServeBuildTimeout,
} from './serveBuildLimit'

const FORTY_FIVE_MS = 45 * SERVE_BUILD_LIMIT_MINUTE_MS

describe('readServeBuildTimeoutMs', () => {
  it('reads a positive whole number of milliseconds', () => {
    expect(readServeBuildTimeoutMs({ [SERVE_BUILD_LIMIT_METADATA_KEY]: FORTY_FIVE_MS })).toBe(
      FORTY_FIVE_MS,
    )
  })

  it('treats an absent or unusable value as unset, so the default applies', () => {
    expect(readServeBuildTimeoutMs(undefined)).toBeUndefined()
    expect(readServeBuildTimeoutMs(null)).toBeUndefined()
    expect(readServeBuildTimeoutMs({})).toBeUndefined()
    for (const value of ['45', 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(readServeBuildTimeoutMs({ [SERVE_BUILD_LIMIT_METADATA_KEY]: value })).toBeUndefined()
    }
  })
})

describe('serveBuildLimitField', () => {
  it('shows an empty field and the default when the project sets nothing', () => {
    const field = serveBuildLimitField(undefined, undefined)
    expect(field.text).toBe('')
    expect(field.placeholder).toBe('30')
    expect(field.hint).toBe(SERVE_BUILD_LIMIT_COPY.hint('30'))
    expect(field.error).toBeUndefined()
    expect(field.dirty).toBe(false)
    expect(SERVE_BUILD_LIMIT_DEFAULT_MS).toBe(30 * SERVE_BUILD_LIMIT_MINUTE_MS)
  })

  it('shows a stored limit in minutes, and a save of the same number changes nothing', () => {
    expect(serveBuildLimitMinutesText(FORTY_FIVE_MS)).toBe('45')
    expect(serveBuildLimitMinutesText(90_000)).toBe('1.5')
    const shown = serveBuildLimitField(FORTY_FIVE_MS, undefined)
    expect(shown.text).toBe('45')
    expect(shown.dirty).toBe(false)
    expect(serveBuildLimitField(FORTY_FIVE_MS, '45.0').dirty).toBe(false)
  })

  it('marks a different limit ready to save, and refuses one that is not above 0', () => {
    const edited = serveBuildLimitField(FORTY_FIVE_MS, '60')
    expect(edited.dirty).toBe(true)
    expect(edited.error).toBeUndefined()
    const cleared = serveBuildLimitField(FORTY_FIVE_MS, '')
    expect(cleared.dirty).toBe(true)
    expect(cleared.error).toBeUndefined()
    for (const text of ['0', '-2', 'no', '  ']) {
      const field = serveBuildLimitField(undefined, text === '  ' ? '  ' : text)
      if (text.trim() === '') {
        expect(field.error).toBeUndefined()
        expect(field.dirty).toBe(false)
      } else {
        expect(field.error).toBe(SERVE_BUILD_LIMIT_COPY.invalid)
        expect(field.dirty).toBe(false)
      }
    }
  })
})

describe('withServeBuildTimeout', () => {
  const metadata = { icon: 'folder', [SERVE_BUILD_LIMIT_METADATA_KEY]: FORTY_FIVE_MS }

  it('stores minutes as milliseconds and keeps every other key', () => {
    expect(withServeBuildTimeout({ icon: 'folder' }, '45')).toEqual({
      icon: 'folder',
      [SERVE_BUILD_LIMIT_METADATA_KEY]: FORTY_FIVE_MS,
    })
  })

  it('drops the key when the field is blank, so the default applies', () => {
    expect(withServeBuildTimeout(metadata, '  ')).toEqual({ icon: 'folder' })
  })

  it('leaves the metadata as it was when the text cannot be saved', () => {
    expect(withServeBuildTimeout(metadata, '0')).toEqual(metadata)
    expect(withServeBuildTimeout(undefined, 'no')).toEqual({})
  })
})
