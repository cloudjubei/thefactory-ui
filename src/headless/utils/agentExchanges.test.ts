import { describe, expect, it } from 'vitest'
import {
  agentExchangeLayout,
  agentExchangeLine,
  agentExchangeRowEnd,
  agentExchangeStartOf,
  agentExchangeWindowStart,
} from './agentExchanges'
import type { ChatMessageLike } from './chatTypes'

const person = (n: number): ChatMessageLike => ({ role: 'user', content: `ask ${n}` })
const reply = (n: number): ChatMessageLike => ({ role: 'assistant', content: `reply ${n}` })
const brief: ChatMessageLike = {
  role: 'user',
  content: 'You are this run’s agent manager.\n\n## What stopped',
  handoffFrom: 'manager',
  managerCard: { kind: 'brief' } as never,
  startedAt: '2026-10-12T10:00:00Z',
}
const managerTool: ChatMessageLike = {
  role: 'tool',
  content: '',
  answersHandoffFrom: 'manager',
  toolCall: { toolCallId: 't', name: 'answerRunPark' },
}
const managerReply: ChatMessageLike = {
  role: 'assistant',
  content: 'I retried it with a note.',
  answersHandoffFrom: 'manager',
  completedAt: '2026-10-12T10:02:00Z',
}
const emptyReply: ChatMessageLike = {
  role: 'assistant',
  content: '  ',
  answersHandoffFrom: 'manager',
}
const handled: ChatMessageLike = {
  role: 'assistant',
  content: '**Manager: Retried**',
  managerCard: { kind: 'intervention', intervention: { what: 'Retried' } } as never,
  completedAt: '2026-10-12T10:01:00Z',
}
const escalation: ChatMessageLike = {
  role: 'assistant',
  content: 'The run needs you',
  managerCard: { kind: 'escalation', escalation: { why: 'scope' } } as never,
  completedAt: '2026-10-12T10:03:00Z',
}
const verifier: ChatMessageLike = {
  role: 'user',
  content: '### Not signed off\n\nThe screen still shows the old label.',
  handoffFrom: 'verifier',
}
const developerReply: ChatMessageLike = {
  role: 'assistant',
  content: 'Fixed the label.',
  answersHandoffFrom: 'verifier',
}

describe('agentExchangeLayout — collapsed', () => {
  const messages = [person(0), brief, managerTool, handled, managerReply, reply(1)]

  it('draws a run of the agents’ messages as one exchange at its first message', () => {
    const layout = agentExchangeLayout(messages, 'collapsed')
    expect([...layout.starts.keys()]).toEqual([1])
    expect([...layout.hidden]).toEqual([2, 3, 4])
  })

  it('keeps the hand-off, the reply it ended on, and the host’s cards', () => {
    const exchange = agentExchangeLayout(messages, 'collapsed').starts.get(1)!
    expect(exchange).toMatchObject({
      start: 1,
      end: 5,
      from: 'manager',
      handoff: brief,
      reply: managerReply,
      cards: [handled],
      at: '2026-10-12T10:02:00Z',
    })
  })

  it('takes the last reply with words, skipping an empty one', () => {
    const exchange = agentExchangeLayout([brief, managerReply, emptyReply], 'collapsed').starts.get(
      0,
    )!
    expect(exchange.reply).toBe(managerReply)
  })

  it('keeps an escalation the host wrote inside the exchange among its cards', () => {
    const exchange = agentExchangeLayout([brief, escalation, managerReply], 'collapsed').starts.get(
      0,
    )!
    expect(exchange.cards).toEqual([escalation])
    expect(exchange.end).toBe(3)
  })

  it('makes two exchanges of two runs the person’s messages split', () => {
    const layout = agentExchangeLayout(
      [verifier, developerReply, person(1), brief, managerReply],
      'collapsed',
    )
    expect([...layout.starts.keys()]).toEqual([0, 3])
    expect(layout.starts.get(0)).toMatchObject({ from: 'verifier', reply: developerReply })
  })

  it('makes an exchange of cards the host wrote with no turn of the agents', () => {
    const exchange = agentExchangeLayout([person(0), escalation], 'collapsed').starts.get(1)!
    expect(exchange.cards).toEqual([escalation])
    expect(exchange.from).toBeUndefined()
    expect(exchange.handoff).toBeUndefined()
  })

  it('leaves the last exchange open while it is still under way', () => {
    const layout = agentExchangeLayout([person(0), brief, managerTool], 'collapsed', {
      openTail: true,
    })
    expect(layout.starts.size).toBe(0)
    expect(layout.hidden.size).toBe(0)
  })

  it('still folds an earlier exchange while the last is under way', () => {
    const layout = agentExchangeLayout([brief, managerReply, person(1), verifier], 'collapsed', {
      openTail: true,
    })
    expect([...layout.starts.keys()]).toEqual([0])
  })

  it('folds the last exchange when it is not at the end', () => {
    const layout = agentExchangeLayout([brief, managerReply, reply(1)], 'collapsed', {
      openTail: true,
    })
    expect([...layout.starts.keys()]).toEqual([0])
  })

  it('draws a conversation without the agents’ exchange as it is', () => {
    const layout = agentExchangeLayout([person(0), reply(0)], 'collapsed')
    expect(layout.starts.size).toBe(0)
    expect(layout.hidden.size).toBe(0)
  })
})

describe('agentExchangeLayout — shown in full', () => {
  it('draws every message on its own', () => {
    const layout = agentExchangeLayout([brief, managerReply, handled], 'full')
    expect(layout.starts.size).toBe(0)
    expect(layout.hidden.size).toBe(0)
  })
})

describe('agentExchangeLayout — hidden', () => {
  it('draws none of the agents’ messages, but every card that needs the person', () => {
    const layout = agentExchangeLayout(
      [person(0), brief, handled, escalation, managerReply, reply(1)],
      'hidden',
    )
    expect(layout.starts.size).toBe(0)
    expect([...layout.hidden]).toEqual([1, 2, 4])
  })

  it('still draws the last exchange in full while it is under way', () => {
    const layout = agentExchangeLayout([person(0), brief, managerTool], 'hidden', {
      openTail: true,
    })
    expect(layout.hidden.size).toBe(0)
  })

  it('draws an exchange that ends the chat in full, so its last message can be deleted', () => {
    const messages = [person(0), brief, handled, managerReply]
    const layout = agentExchangeLayout(messages, 'hidden')
    expect(layout.hidden.size).toBe(0)
    expect(agentExchangeRowEnd(layout, messages.length - 1)).toBe(messages.length)
  })

  it('still hides an earlier exchange when the one ending the chat is drawn', () => {
    const layout = agentExchangeLayout(
      [person(0), brief, handled, person(1), brief, managerReply],
      'hidden',
    )
    expect([...layout.hidden]).toEqual([1, 2])
  })
})

describe('agentExchangeLine', () => {
  it('heads a hand-back by who sent it, with the first words it said', () => {
    const exchange = agentExchangeLayout([verifier, developerReply], 'collapsed').starts.get(0)!
    expect(agentExchangeLine(exchange)).toEqual({
      head: 'Verifier sent it back',
      line: 'Not signed off',
      toAgent: {
        label: 'Verifier → agent',
        text: 'Not signed off The screen still shows the old label.',
      },
      fromAgent: { label: 'Agent → verifier', text: 'Fixed the label.' },
    })
  })

  it('names an agent it has no head for', () => {
    expect(agentExchangeLine({ start: 0, end: 1, from: 'tester', cards: [] }).head).toBe(
      'Tester handed it back',
    )
  })

  it('cuts a long one-liner short', () => {
    const long = { ...verifier, content: 'word '.repeat(80) }
    const exchange = agentExchangeLayout([long], 'collapsed').starts.get(0)!
    const { line } = agentExchangeLine(exchange)
    expect(line.length).toBeLessThanOrEqual(141)
    expect(line.endsWith('…')).toBe(true)
  })

  it('reads an exchange whose hand-off was not kept by its reply alone', () => {
    const exchange = agentExchangeLayout([managerReply], 'collapsed').starts.get(0)!
    expect(agentExchangeLine(exchange)).toEqual({
      head: 'Manager briefed the agent',
      line: 'I retried it with a note.',
      fromAgent: { label: 'Agent → manager', text: 'I retried it with a note.' },
    })
  })

  it('has no line for an exchange without words', () => {
    const exchange = agentExchangeLayout([handled], 'collapsed').starts.get(0)!
    expect(agentExchangeLine(exchange)).toEqual({ head: 'The agents worked on it', line: '' })
  })
})

describe('agentExchangeStartOf', () => {
  const layout = agentExchangeLayout(
    [person(0), brief, managerReply, escalation, reply(1)],
    'collapsed',
  )

  it('reads a message drawn within an exchange as the exchange’s first', () => {
    expect(agentExchangeStartOf(layout, 3)).toBe(1)
    expect(agentExchangeStartOf(layout, 1)).toBe(1)
  })

  it('keeps a message drawn on its own, and nothing as nothing', () => {
    expect(agentExchangeStartOf(layout, 4)).toBe(4)
    expect(agentExchangeStartOf(layout, null)).toBeNull()
  })
})

describe('agentExchangeRowEnd', () => {
  it('ends a folded exchange’s row after its last message, so the row ending the chat is last', () => {
    const messages = [person(0), reply(1), brief, managerReply, handled]
    const layout = agentExchangeLayout(messages, 'collapsed')
    expect(agentExchangeRowEnd(layout, 2)).toBe(messages.length)
  })

  it('ends a folded exchange the person answered after at the exchange, not the chat', () => {
    const layout = agentExchangeLayout([person(0), brief, managerReply, reply(1)], 'collapsed')
    expect(agentExchangeRowEnd(layout, 1)).toBe(3)
    expect(agentExchangeRowEnd(layout, 3)).toBe(4)
  })

  it('ends a row drawn on its own after itself, whatever the display', () => {
    const messages = [person(0), brief, managerReply]
    for (const display of ['full', 'hidden'] as const) {
      const layout = agentExchangeLayout(messages, display)
      expect(agentExchangeRowEnd(layout, 0), display).toBe(1)
    }
    expect(agentExchangeRowEnd(agentExchangeLayout(messages, 'full'), 2)).toBe(3)
  })
})

describe('agentExchangeWindowStart', () => {
  const managerTurns = (n: number): ChatMessageLike[] =>
    Array.from({ length: n }, () => [brief, managerReply, handled]).flat()

  it('shows the last rows of a conversation the agents never spoke in', () => {
    const messages = Array.from({ length: 10 }, (_, i) => (i % 2 ? reply(i) : person(i)))
    const layout = agentExchangeLayout(messages, 'collapsed')
    expect(agentExchangeWindowStart(layout, messages.length, 4)).toBe(6)
    expect(agentExchangeWindowStart(layout, messages.length, 50)).toBe(0)
  })

  it('opens at an exchange that began above the window, not inside it with nothing drawn', () => {
    const messages = [person(0), reply(1), ...managerTurns(20)]
    const layout = agentExchangeLayout(messages, 'collapsed')
    expect(agentExchangeWindowStart(layout, messages.length, 1)).toBe(2)
    expect(agentExchangeWindowStart(layout, messages.length, 2)).toBe(1)
  })

  it('reaches back past messages that are not drawn until enough rows show', () => {
    const messages = [person(0), ...managerTurns(10), escalation, person(1)]
    const layout = agentExchangeLayout(messages, 'hidden')
    expect(agentExchangeWindowStart(layout, messages.length, 2)).toBe(31)
    expect(agentExchangeWindowStart(layout, messages.length, 3)).toBe(0)
  })

  it('shows everything when it asks for more rows than there are', () => {
    const messages = [person(0), ...managerTurns(3)]
    const layout = agentExchangeLayout(messages, 'full')
    expect(agentExchangeWindowStart(layout, messages.length, 50)).toBe(0)
    expect(agentExchangeWindowStart(layout, 0, 50)).toBe(0)
  })
})
