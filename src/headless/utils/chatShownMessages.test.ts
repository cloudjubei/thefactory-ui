import { describe, expect, it } from 'vitest'

import { chatShownMessages, withoutUndrawnTail } from './chatShownMessages'

const openChangesCard = {
  kind: 'waiting' as const,
  runId: 'r1',
  projectId: 'p',
  chatContextId: '/projects/p',
  since: 5,
  fileCount: 5,
}
const user = { role: 'user', content: 'Retry with story tools enabled' }
const failedTurn = { role: 'assistant', content: '', cliRunId: 'r0' }
const card = { role: 'assistant', content: 'waited', openChangesCard }
const raisedOnTurn = { role: 'assistant', content: '', cliRunId: 'r1', openChangesCard }

describe('chatShownMessages', () => {
  it('leaves out every message no client draws, wherever it sits', () => {
    expect(chatShownMessages([user, card, failedTurn, card])).toEqual([user, failedTurn])
  })

  it('keeps the turn a card was raised on', () => {
    expect(chatShownMessages([user, raisedOnTurn])).toEqual([user, raisedOnTurn])
  })

  it('is the same list when every message is drawn', () => {
    const messages = [user, failedTurn]
    expect(chatShownMessages(messages)).toBe(messages)
  })

  it('is empty when nothing is drawn', () => {
    expect(chatShownMessages([card])).toEqual([])
    expect(chatShownMessages([])).toEqual([])
  })
})

describe('withoutUndrawnTail', () => {
  it('reads past every trailing message no client draws', () => {
    expect(withoutUndrawnTail([user, failedTurn, card, card])).toEqual([user, failedTurn])
  })

  it('keeps an undrawn message the chat goes on after', () => {
    const messages = [user, card, failedTurn]
    expect(withoutUndrawnTail(messages)).toBe(messages)
  })

  it('is empty when no message is drawn', () => {
    expect(withoutUndrawnTail([card, card])).toEqual([])
  })
})
