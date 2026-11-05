import { describe, expect, it } from 'vitest'

import type { ChatContextReadout, ContextFillReadout } from '../api/generated'
import {
  chatCompactLine,
  chatContextFillChip,
  chatContextReadoutOfEvent,
  chatContextCheckpointOfEvent,
  contextBoundaryIndex,
  shownContextCutoff,
  rowHoldsMessage,
} from './chatContextFill'
import { CHAT_COMPACT_COPY, CHAT_CONTEXT_FILL_COPY } from './chatContextFillConstants'

const fill = (over: Partial<ContextFillReadout> = {}): ContextFillReadout => ({
  tokensUsed: 84_000,
  windowTokens: 200_000,
  fillFraction: 0.42,
  windowSource: 'catalogue',
  source: 'recorded-usage',
  turnsSinceLastContextUpdate: 1,
  ...over,
})

const readout = (contextFill?: ContextFillReadout): ChatContextReadout => ({
  turnsSinceLastContextUpdate: 1,
  ...(contextFill ? { contextFill } : {}),
})

describe('chatContextFillChip', () => {
  it('shows nothing before a turn has finished: there is no fill to say', () => {
    expect(chatContextFillChip(readout())).toBeUndefined()
    expect(chatContextFillChip(undefined)).toBeUndefined()
  })

  it('says the fill as a share of the window, with the tokens behind it', () => {
    expect(chatContextFillChip(readout(fill()))).toMatchObject({
      label: '42%',
      percent: 42,
      level: 'roomy',
      tokens: '84k of 200k tokens',
    })
  })

  it('marks a share read against a window it had to guess', () => {
    const chip = chatContextFillChip(readout(fill({ windowSource: 'fallback' })))
    expect(chip?.label).toBe('~42%')
    expect(chip?.note).toBe(CHAT_CONTEXT_FILL_COPY.windowGuessed)
  })

  it('never says 0% of a window once anything is in it', () => {
    expect(
      chatContextFillChip(readout(fill({ tokensUsed: 900, fillFraction: 0.0045 })))?.label,
    ).toBe('<1%')
  })

  it('reads no share at all when the window is unknown, and still says the tokens', () => {
    const chip = chatContextFillChip(readout(fill({ windowTokens: 0, fillFraction: 0 })))
    expect(chip?.label).toBe(CHAT_CONTEXT_FILL_COPY.unknownWindow)
    expect(chip?.percent).toBeUndefined()
    expect(chip?.tokens).toBe('84k tokens')
  })

  it.each([
    [0.69, 'roomy'],
    [0.7, 'filling'],
    [0.89, 'filling'],
    [0.9, 'nearly-full'],
    [1.2, 'nearly-full'],
  ] as const)('reads %s of the window as %s', (fillFraction, level) => {
    expect(chatContextFillChip(readout(fill({ fillFraction })))?.level).toBe(level)
  })

  it('holds the meter at a full window, and the label at what was measured', () => {
    expect(chatContextFillChip(readout(fill({ fillFraction: 1.2 })))).toMatchObject({
      label: '120%',
      percent: 100,
    })
  })

  it('leaves transport words out of everything it says', () => {
    for (const source of ['recorded-usage', 'assembled-request', 'compact-boundary'] as const) {
      const said = JSON.stringify(chatContextFillChip(readout(fill({ source }))))
      expect(said).not.toMatch(/\b(cli|api|resident|session|native|reseed)\b/i)
    }
  })
})

describe('chatCompactLine', () => {
  it.each([
    ['nothing-needed', CHAT_COMPACT_COPY.nothingNeeded, 'neutral'],
    ['busy', CHAT_COMPACT_COPY.busy, 'neutral'],
    ['cancelled', CHAT_COMPACT_COPY.cancelled, 'neutral'],
    ['failed', CHAT_COMPACT_COPY.failed, 'failed'],
  ] as const)('says %s in plain words', (outcome, text, tone) => {
    expect(chatCompactLine({ outcome })).toEqual({ text, tone })
  })

  it('says what the next turn starts from once compacted', () => {
    expect(
      chatCompactLine({ outcome: 'compacted', readout: fill({ fillFraction: 0.12 }) }),
    ).toEqual({ text: 'Compacted. Now 12% full.', tone: 'done' })
  })

  it('still says compacted when the new fill is not known', () => {
    expect(chatCompactLine({ outcome: 'compacted' })).toEqual({
      text: CHAT_COMPACT_COPY.compacted,
      tone: 'done',
    })
  })

  it('says the same for a guessed window as the chip does', () => {
    expect(
      chatCompactLine({
        outcome: 'compacted',
        readout: fill({ fillFraction: 0.12, windowSource: 'fallback' }),
      }).text,
    ).toBe('Compacted. Now ~12% full.')
  })
})

describe('chatContextReadoutOfEvent', () => {
  const key = 'projects/p/GENERAL'

  it('takes the readout of this chat', () => {
    const next = readout(fill())
    expect(chatContextReadoutOfEvent({ chatContextId: key, readout: next }, key)).toBe(next)
  })

  it('leaves another chat’s readout alone', () => {
    expect(
      chatContextReadoutOfEvent({ chatContextId: 'projects/q/GENERAL', readout: readout() }, key),
    ).toBeUndefined()
  })

  it.each([[null], ['x'], [{ chatContextId: key }], [{ chatContextId: key, readout: 'x' }]])(
    'ignores what is not a readout: %j',
    (data) => {
      expect(chatContextReadoutOfEvent(data, key)).toBeUndefined()
    },
  )
})

describe('chatContextCheckpointOfEvent', () => {
  const event = {
    phase: 'finished',
    chatContextId: 'projects/p/GENERAL',
    reason: 'end-of-turn',
    outcome: 'finished',
    at: '2026-11-05T10:00:00.000Z',
  }

  it('takes a checkpoint event as it came', () => {
    expect(chatContextCheckpointOfEvent(event)).toEqual(event)
  })

  it.each([
    [null],
    [{ ...event, phase: 'later' }],
    [{ ...event, chatContextId: 3 }],
    [{ ...event, at: undefined }],
    [{ ...event, reason: undefined }],
  ])('ignores what is not one: %j', (data) => {
    expect(chatContextCheckpointOfEvent(data)).toBeUndefined()
  })
})

describe('contextBoundaryIndex', () => {
  const messages = [
    { id: 'a', role: 'user', content: 'one' },
    { id: 'b', role: 'assistant', content: 'two' },
    { id: 'c', role: 'user', content: 'three' },
  ]
  const at = '2026-11-05T10:00:00.000Z'

  it('has no line without a boundary', () => {
    expect(contextBoundaryIndex(messages, undefined)).toBeUndefined()
  })

  it('finds the first message still sent', () => {
    expect(contextBoundaryIndex(messages, { messageId: 'b', at })).toBe(1)
  })

  it('draws no line above the first message: nothing is cut', () => {
    expect(contextBoundaryIndex(messages, { messageId: 'a', at })).toBeUndefined()
  })

  it('draws no line for a message that is gone: nothing is cut', () => {
    expect(contextBoundaryIndex(messages, { messageId: 'gone', at })).toBeUndefined()
  })

  it('counts past the system bubble a client leads with, for a message with no id', () => {
    const stored = [
      { role: 'user', content: 'one', startedAt: 's1' },
      { role: 'assistant', content: 'two', startedAt: 's2' },
    ]
    const shown = [{ role: 'system', content: 'prompt', startedAt: '' }, ...stored]
    const messageId = `m1:assistant:s2:${hash('two')}`
    expect(contextBoundaryIndex(stored, { messageId, at })).toBe(1)
    expect(contextBoundaryIndex(shown, { messageId, at })).toBe(1)
  })

  it('counts only the rows a client draws above the line', () => {
    const undrawn = { id: 'card', role: 'assistant', content: '', openChangesCard: { runId: 'r' } }
    const list = [messages[0]!, undrawn, messages[1]!, messages[2]!]
    expect(contextBoundaryIndex(list, { messageId: 'b', at })).toBe(1)
  })

  it('has no line when nothing drawn sits above it', () => {
    const undrawn = { id: 'card', role: 'assistant', content: '', openChangesCard: { runId: 'r' } }
    expect(contextBoundaryIndex([undrawn, messages[1]!], { messageId: 'b', at })).toBeUndefined()
  })
})

function hash(text: string): string {
  let value = 5381
  for (let i = 0; i < text.length; i++) value = ((value << 5) + value + text.charCodeAt(i)) | 0
  return (value >>> 0).toString(36)
}

describe('shownContextCutoff', () => {
  it('keeps the cutoff when no boundary is drawn', () => {
    expect(shownContextCutoff(4, undefined)).toBe(4)
  })

  it('keeps the cutoff below the boundary: it still decides what is sent', () => {
    expect(shownContextCutoff(6, 4)).toBe(6)
  })

  it('drops a cutoff at or above the boundary: nothing above it is sent anyway', () => {
    expect(shownContextCutoff(4, 4)).toBeNull()
    expect(shownContextCutoff(2, 4)).toBeNull()
  })

  it('has nothing to show for no cutoff', () => {
    expect(shownContextCutoff(null, 4)).toBeNull()
  })
})

describe('rowHoldsMessage', () => {
  it('is the row of that message', () => {
    expect(rowHoldsMessage({ line: 3, rowStart: 3, windowStart: 0 })).toBe(true)
  })

  it('is a folded row the message sits inside', () => {
    expect(rowHoldsMessage({ line: 4, rowStart: 3, rowEnd: 6, windowStart: 0 })).toBe(true)
  })

  it('is not a row past the message, or the end of a fold', () => {
    expect(rowHoldsMessage({ line: 3, rowStart: 4, windowStart: 0 })).toBe(false)
    expect(rowHoldsMessage({ line: 6, rowStart: 3, rowEnd: 6, windowStart: 0 })).toBe(false)
  })

  it('draws nothing for a message scrolled out of the window', () => {
    expect(rowHoldsMessage({ line: 3, rowStart: 3, windowStart: 5 })).toBe(false)
  })

  it('has nothing to draw without a line', () => {
    expect(rowHoldsMessage({ line: null, rowStart: 3, windowStart: 0 })).toBe(false)
    expect(rowHoldsMessage({ line: undefined, rowStart: 3, windowStart: 0 })).toBe(false)
  })
})
