import { describe, expect, it } from 'vitest'
import { chatClosure } from './chatClosure'
import type { Chat } from '../api/generated'

const chat = (over: Partial<Chat>): Chat => over as Chat

describe('chatClosure', () => {
  it('is open for an ordinary chat', () => {
    expect(chatClosure(chat({ state: 'running' }))).toMatchObject({ locked: false, closed: false })
    expect(chatClosure(undefined)).toMatchObject({ locked: false, closed: false })
    // The context hands back `null` for an unknown chat, not undefined.
    expect(chatClosure(null)).toMatchObject({ locked: false, closed: false })
  })

  it('LOCKS an archived chat — archiving is the deliberate close-down', () => {
    const c = chatClosure(chat({ archivedAt: '2026-01-01T00:00:00Z' }))
    expect(c.locked).toBe(true)
    expect(c.closed).toBe(true)
    expect(c.detail).toMatch(/history is kept/i)
  })

  it('reports a completed chat as closed but does NOT lock it', () => {
    // Finishing is not the same as being consolidated: until the user closes it
    // down, they can still delete a turn and try again.
    const c = chatClosure(chat({ state: 'completed' }))
    expect(c.closed).toBe(true)
    expect(c.locked).toBe(false)
  })

  it('never locks an errored or cancelled chat', () => {
    // A failed run is finished, not sacred — its turn must stay removable so the
    // user can retry.
    for (const state of ['error', 'cancelled'] as const) {
      const c = chatClosure(chat({ state }))
      expect(c.locked).toBe(false)
      expect(c.closed).toBe(true)
    }
  })

  it('archiving outranks a terminal state', () => {
    expect(chatClosure(chat({ state: 'error', archivedAt: '2026-01-01T00:00:00Z' })).locked).toBe(
      true,
    )
  })

  it('always gives a label for a closed chat, so the state is never silent', () => {
    for (const c of [
      chat({ archivedAt: '2026-01-01T00:00:00Z' }),
      chat({ state: 'completed' }),
      chat({ state: 'cancelled' }),
      chat({ state: 'error' }),
    ]) {
      expect(chatClosure(c).label).toBeTruthy()
    }
  })
})
