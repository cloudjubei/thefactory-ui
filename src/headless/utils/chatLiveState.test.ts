import { describe, expect, it } from 'vitest'
import { applyChatLiveStatePatch, chatStoppableRunId, mergeChatLiveState } from './chatLiveState'

type Live = { isSending: boolean; cliRunId: string | null; cliModel: string | null }

const EMPTY: Live = { isSending: false, cliRunId: null, cliModel: null }

describe('mergeChatLiveState', () => {
  it('returns the same object when every patched key already holds that value', () => {
    const current: Live = { ...EMPTY, cliRunId: 'run-1' }
    expect(mergeChatLiveState(current, { cliRunId: 'run-1' })).toBe(current)
  })

  it('returns the same object for an empty patch', () => {
    const current: Live = { ...EMPTY }
    expect(mergeChatLiveState(current, {})).toBe(current)
  })

  it('merges when one patched key differs', () => {
    const current: Live = { ...EMPTY, cliRunId: 'run-1' }
    expect(mergeChatLiveState(current, { cliRunId: 'run-2' })).toEqual({
      ...EMPTY,
      cliRunId: 'run-2',
    })
  })

  it('merges when a later key in the patch differs while the first matches', () => {
    const current: Live = { ...EMPTY, cliRunId: 'run-1' }
    const next = mergeChatLiveState(current, { cliRunId: 'run-1', isSending: true })
    expect(next).not.toBe(current)
    expect(next.isSending).toBe(true)
  })

  it('treats an explicit undefined as a change when the current value is not undefined', () => {
    const current = { note: 'x' } as { note?: string }
    expect(mergeChatLiveState(current, { note: undefined })).not.toBe(current)
  })

  it('keeps unpatched keys', () => {
    const current: Live = { isSending: true, cliRunId: 'run-1', cliModel: 'cli-agent/claude-code/' }
    expect(mergeChatLiveState(current, { cliRunId: 'run-2' }).cliModel).toBe(
      'cli-agent/claude-code/',
    )
  })
})

describe('applyChatLiveStatePatch', () => {
  it('returns the same map when the entry is unchanged', () => {
    const states = new Map<string, Live>([['a', { ...EMPTY, cliRunId: 'run-1' }]])
    expect(applyChatLiveStatePatch(states, 'a', EMPTY, { cliRunId: 'run-1' })).toBe(states)
  })

  it('writes a new map when the entry changes', () => {
    const states = new Map<string, Live>([['a', { ...EMPTY, cliRunId: 'run-1' }]])
    const next = applyChatLiveStatePatch(states, 'a', EMPTY, { cliRunId: 'run-2' })
    expect(next).not.toBe(states)
    expect(next.get('a')?.cliRunId).toBe('run-2')
  })

  it('creates a missing entry from the empty state even when the patch matches it', () => {
    const states = new Map<string, Live>()
    const next = applyChatLiveStatePatch(states, 'a', EMPTY, { cliRunId: null })
    expect(next).not.toBe(states)
    expect(next.get('a')).toEqual(EMPTY)
  })

  it('leaves another chat entry untouched', () => {
    const other: Live = { ...EMPTY, isSending: true }
    const states = new Map<string, Live>([
      ['a', { ...EMPTY }],
      ['b', other],
    ])
    const next = applyChatLiveStatePatch(states, 'a', EMPTY, { cliRunId: 'run-1' })
    expect(next.get('b')).toBe(other)
  })
})

describe('chatStoppableRunId', () => {
  it('stops the run live state holds while it is still going', () => {
    expect(chatStoppableRunId(['run-2', undefined], new Set(['run-1']))).toBe('run-2')
  })

  it('skips a finished run live state keeps for its transcript', () => {
    expect(chatStoppableRunId(['run-1', undefined], new Set(['run-1']))).toBeUndefined()
  })

  it('falls back to the run the backend reports when live state holds a finished one', () => {
    expect(chatStoppableRunId(['run-1', 'run-2'], new Set(['run-1']))).toBe('run-2')
  })

  it('returns nothing when no candidate is known', () => {
    expect(chatStoppableRunId([null, undefined], new Set())).toBeUndefined()
  })
})
