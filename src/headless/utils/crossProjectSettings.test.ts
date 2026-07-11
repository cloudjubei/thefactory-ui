import { describe, expect, it } from 'vitest'
import { isAcceptanceMode, readAcceptanceLayer, resolveAcceptance } from './crossProjectSettings'

describe('isAcceptanceMode', () => {
  it.each(['off', 'manual', 'autonomous'])('accepts the known mode %s', (m) => {
    expect(isAcceptanceMode(m)).toBe(true)
  })
  it('rejects unknown / non-string', () => {
    expect(isAcceptanceMode('sometimes')).toBe(false)
    expect(isAcceptanceMode(42)).toBe(false)
  })
})

describe('readAcceptanceLayer', () => {
  it('reads a valid mode off the record content', () => {
    expect(readAcceptanceLayer({ mode: 'off' })).toBe('off')
  })
  it('returns undefined for a malformed / absent / non-object layer', () => {
    expect(readAcceptanceLayer({ mode: 'nope' })).toBeUndefined()
    expect(readAcceptanceLayer({})).toBeUndefined()
    expect(readAcceptanceLayer(undefined)).toBeUndefined()
    expect(readAcceptanceLayer('off')).toBeUndefined()
  })
})

describe('resolveAcceptance', () => {
  it('defaults to manual when neither layer is set', () => {
    expect(resolveAcceptance(undefined, undefined)).toBe('manual')
  })
  it('uses the global default when there is no per-project override', () => {
    expect(resolveAcceptance(undefined, { mode: 'off' })).toBe('off')
  })
  it('prefers the per-project override over the global default', () => {
    expect(resolveAcceptance({ mode: 'autonomous' }, { mode: 'off' })).toBe('autonomous')
  })
  it('ignores a malformed per-project mode and falls through to global', () => {
    expect(resolveAcceptance({ mode: 'bogus' }, { mode: 'off' })).toBe('off')
  })
  it('ignores a malformed global mode and falls through to the default', () => {
    expect(resolveAcceptance(undefined, { mode: 7 })).toBe('manual')
  })
})
