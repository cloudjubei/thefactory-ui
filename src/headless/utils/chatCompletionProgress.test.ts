import { describe, expect, it } from 'vitest'

import { parseCompletionProgressEvent, routeCompletionProgress } from './chatCompletionProgress'

describe('parseCompletionProgressEvent', () => {
  it('reads a turn with its chat, its turn id and what the agent said so far', () => {
    expect(
      parseCompletionProgressEvent({
        chatContextId: 'PROJECT/p',
        turnId: 't1',
        turn: 2,
        assistantMessage: { content: 'Reading' },
      }),
    ).toEqual({
      chatContextId: 'PROJECT/p',
      turnId: 't1',
      kind: 'turn',
      turn: 2,
      content: 'Reading',
    })
  })

  it('reads a turn that said nothing yet as empty words', () => {
    expect(
      parseCompletionProgressEvent({ chatContextId: 'c', turnId: 't', turn: 1 }),
    ).toMatchObject({ kind: 'turn', content: '' })
  })

  it('reads the end of a turn', () => {
    expect(parseCompletionProgressEvent({ chatContextId: 'c', turnId: 't', done: true })).toEqual({
      chatContextId: 'c',
      turnId: 't',
      kind: 'done',
    })
  })

  it('drops an event that names no chat or no turn, which no chat can own', () => {
    expect(parseCompletionProgressEvent({ turnId: 't', done: true })).toBeUndefined()
    expect(parseCompletionProgressEvent({ chatContextId: 'c', turn: 1 })).toBeUndefined()
    expect(
      parseCompletionProgressEvent({ chatContextId: 'c', turnId: '', done: true }),
    ).toBeUndefined()
  })

  it('drops an event that is neither a turn nor an end', () => {
    expect(parseCompletionProgressEvent({ chatContextId: 'c', turnId: 't' })).toBeUndefined()
    expect(parseCompletionProgressEvent(null)).toBeUndefined()
    expect(parseCompletionProgressEvent('x')).toBeUndefined()
  })
})

describe('routeCompletionProgress', () => {
  const turn = (turnId: string, content = 'hi') =>
    ({ chatContextId: 'c', turnId, kind: 'turn', turn: 1, content }) as const
  const done = (turnId: string) => ({ chatContextId: 'c', turnId, kind: 'done' }) as const

  it('goes nowhere for a chat with no send in flight here', () => {
    expect(routeCompletionProgress(undefined, turn('t1'))).toBeUndefined()
  })

  it('shows the first turn’s words and pins the chat to that turn', () => {
    expect(routeCompletionProgress({}, turn('t1', 'Reading'))).toEqual({
      claim: { turnId: 't1' },
      pendingAssistant: { turn: 1, content: 'Reading' },
    })
  })

  it('clears the preview at the end of the pinned turn', () => {
    expect(routeCompletionProgress({ turnId: 't1' }, done('t1'))).toEqual({
      claim: { turnId: 't1' },
      pendingAssistant: null,
    })
  })

  it('ignores another turn of the same chat once pinned, its end included', () => {
    expect(routeCompletionProgress({ turnId: 't1' }, turn('t2'))).toBeUndefined()
    expect(routeCompletionProgress({ turnId: 't1' }, done('t2'))).toBeUndefined()
  })
})
