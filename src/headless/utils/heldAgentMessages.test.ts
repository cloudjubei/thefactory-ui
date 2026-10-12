import { describe, expect, it } from 'vitest'
import {
  HELD_AGENT_MESSAGE_WAITING_FOR,
  HELD_AGENT_MESSAGES_METADATA_KEY,
} from './heldAgentMessagesConstants'
import { heldAgentMessageViews } from './heldAgentMessages'

const stored = (over: Record<string, unknown> = {}) => ({
  id: 'h1',
  content:
    '📨 **Message from the agent in chat "Feature"** (chat id `/projects/p/topics/a`)\n\nLook up the branch.\n\nIt is read-only.\n\n_The sending agent is waiting for your answer: your final reply this turn goes back to it._',
  handoffFrom: 'chat "Feature"',
  fromChatId: '/projects/p/topics/a',
  awaitReply: true,
  hop: 1,
  heldAt: '2026-10-12T09:04:13.000Z',
  heldFor: 'ask',
  ...over,
})

describe('heldAgentMessageViews', () => {
  it('shows who sent it, what it says and what it waits for, oldest first', () => {
    const views = heldAgentMessageViews({
      [HELD_AGENT_MESSAGES_METADATA_KEY]: [stored(), stored({ id: 'h2', heldFor: 'turn' })],
    })
    expect(views).toEqual([
      {
        id: 'h1',
        from: 'chat "Feature"',
        body: 'Look up the branch.\n\nIt is read-only.',
        waitingFor: HELD_AGENT_MESSAGE_WAITING_FOR.ask,
        heldAt: '2026-10-12T09:04:13.000Z',
      },
      expect.objectContaining({ id: 'h2', waitingFor: HELD_AGENT_MESSAGE_WAITING_FOR.turn }),
    ])
  })

  it('keeps a message sent without waiting for a reply whole after its heading', () => {
    const content = '📨 **Message from the agent in x** (chat id `y`)\n\nJust so you know.'
    expect(
      heldAgentMessageViews({ [HELD_AGENT_MESSAGES_METADATA_KEY]: [stored({ content })] })[0]?.body,
    ).toBe('Just so you know.')
  })

  it.each([
    ['no metadata', undefined],
    ['nothing held', { other: true }],
    ['not a list', { [HELD_AGENT_MESSAGES_METADATA_KEY]: {} }],
  ])('is empty for %s', (_name, metadata) => {
    expect(heldAgentMessageViews(metadata)).toEqual([])
  })

  it('leaves out an entry it cannot read', () => {
    expect(
      heldAgentMessageViews({
        [HELD_AGENT_MESSAGES_METADATA_KEY]: [{ id: 'x' }, stored({ heldFor: 'later' }), stored()],
      }).map((v) => v.id),
    ).toEqual(['h1'])
  })
})
