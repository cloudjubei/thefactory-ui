import { describe, expect, it } from 'vitest'
import { SECRET_REVEAL_CLOSED, secretRevealReducer, shownSecret } from './secretRevealUtils'
import type { SecretRevealEvent, SecretRevealState } from './secretRevealTypes'

const run = (events: SecretRevealEvent[], from: SecretRevealState = SECRET_REVEAL_CLOSED) =>
  events.reduce(secretRevealReducer, from)

const STORED = { type: 'toggle', typed: false, canFetch: true, confirmTyped: true } as const
const TYPED = { type: 'toggle', typed: true, canFetch: true, confirmTyped: true } as const

describe('secretRevealReducer — a stored secret the field does not hold', () => {
  it('asks first, fetches once confirmed, then shows what came back', () => {
    const asked = run([STORED])
    expect(asked.phase).toBe('confirming')
    const fetching = run([{ type: 'confirm' }], asked)
    expect(fetching.phase).toBe('fetching')
    const shown = run([{ type: 'fetched', value: 'sk-1' }], fetching)
    expect(shown).toMatchObject({ phase: 'shown', stored: 'sk-1', failed: false })
    expect(shownSecret(shown, '')).toEqual({ value: 'sk-1', masked: false })
  })

  it('fetches nothing when the person cancels', () => {
    expect(run([STORED, { type: 'cancel' }])).toEqual(SECRET_REVEAL_CLOSED)
  })

  it('stays hidden and says it failed when the fetch fails', () => {
    const failed = run([STORED, { type: 'confirm' }, { type: 'fetchFailed' }])
    expect(failed).toMatchObject({ phase: 'hidden', failed: true })
    expect(shownSecret(failed, '')).toEqual({ value: '', masked: true })
  })

  it('ignores a fetch that comes back after the person hid it', () => {
    const hidden = run([STORED, { type: 'confirm' }, TYPED])
    expect(run([{ type: 'fetched', value: 'sk-1' }], hidden).stored).toBeUndefined()
    expect(run([{ type: 'fetchFailed' }], hidden).failed).toBe(false)
  })

  it('forgets the shown secret when hidden again, so the field is empty as before', () => {
    const shown = run([STORED, { type: 'confirm' }, { type: 'fetched', value: 'sk-1' }])
    const hidden = run([STORED], shown)
    expect(hidden).toEqual(SECRET_REVEAL_CLOSED)
    expect(shownSecret(hidden, '')).toEqual({ value: '', masked: true })
  })

  it('lets typing take over: what is typed shows, and clearing it does not bring the secret back', () => {
    const shown = run([STORED, { type: 'confirm' }, { type: 'fetched', value: 'sk-1' }])
    const typing = run([{ type: 'typed' }], shown)
    expect(shownSecret(typing, 'sk-12')).toEqual({ value: 'sk-12', masked: false })
    expect(shownSecret(typing, '')).toEqual({ value: '', masked: false })
  })

  it('never fetches for a field with nothing stored', () => {
    const toggled = run([{ type: 'toggle', typed: false, canFetch: false, confirmTyped: true }])
    expect(toggled.phase).toBe('shown')
    expect(run([{ type: 'confirm' }], toggled).phase).toBe('shown')
  })
})

describe('secretRevealReducer — what the person typed', () => {
  it('asks before showing it where the field confirms typed secrets', () => {
    const asked = run([TYPED])
    expect(asked.phase).toBe('confirming')
    expect(run([{ type: 'confirm' }], asked).phase).toBe('shown')
  })

  it('shows it at once where the field does not', () => {
    expect(run([{ ...TYPED, confirmTyped: false }]).phase).toBe('shown')
  })

  it('shows the typed text over a stored secret', () => {
    const shown = run([STORED, { type: 'confirm' }, { type: 'fetched', value: 'sk-1' }])
    expect(shownSecret(shown, 'new')).toEqual({ value: 'new', masked: false })
  })

  it('clears a failure once the person types', () => {
    const failed = run([STORED, { type: 'confirm' }, { type: 'fetchFailed' }])
    expect(run([{ type: 'typed' }], failed).failed).toBe(false)
  })
})
