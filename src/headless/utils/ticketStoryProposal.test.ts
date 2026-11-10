import { describe, expect, it } from 'vitest'
import {
  isTicketStoryProposalTool,
  partsOrderLine,
  partsOrderSteps,
  ticketStoryProposalView,
} from './ticketStoryProposal'
import {
  TICKET_STORY_PROPOSAL_OUTCOME,
  TICKET_STORY_PROPOSAL_TEXT,
} from './ticketStoryProposalConstants'

const PROJECTS = [
  { id: 'be', title: 'Backend' },
  { id: 'adm', title: 'Admin' },
  { id: 'web', title: 'Web' },
]
const ARGS = {
  groupId: 'g1',
  ticketKey: 'ZNR-780',
  title: 'Renew sessions before uploads',
  description: 'Renew the session first.',
  parts: [
    { projectId: 'adm', newStoryTitle: 'Show the renewal in admin' },
    { projectId: 'be', storyId: 's-12' },
  ],
  needs: { adm: ['be'] },
}
const CREATED = {
  groupStoryId: 'gs-1',
  groupId: 'g1',
  title: 'Renew sessions before uploads',
  description: 'Renew the session first.',
  parts: [
    { projectId: 'adm', storyId: 's-90', storyTitle: 'Show the renewal in admin', needs: ['be'] },
    { projectId: 'be', storyId: 's-12', storyTitle: 'Session renewal', needs: [] },
  ],
}

describe('isTicketStoryProposalTool', () => {
  it.each([
    ['proposeTicketGroupStory', true],
    ['mcp__thefactory__proposeTicketGroupStory', true],
    ['createGroupStory', false],
    ['proposeTicketGroupStoryNow', false],
    [undefined, false],
  ])('%s → %s', (name, expected) => {
    expect(isTicketStoryProposalTool(name)).toBe(expected)
  })
})

describe('partsOrderSteps', () => {
  it.each([
    ['one part needing another', ['adm', 'be'], { adm: ['be'] }, [['be'], ['adm']]],
    [
      'two parts needing the same one',
      ['adm', 'be', 'web'],
      { adm: ['be'], web: ['be'] },
      [['be'], ['adm', 'web']],
    ],
    ['a chain', ['web', 'adm', 'be'], { adm: ['be'], web: ['adm'] }, [['be'], ['adm'], ['web']]],
    ['no needs at all', ['adm', 'be'], {}, [['adm', 'be']]],
    ['a need for a project that is no part', ['adm', 'be'], { adm: ['ops'] }, [['adm', 'be']]],
    ['a part needing itself', ['adm', 'be'], { adm: ['adm'] }, [['adm', 'be']]],
    ['needs that are not lists', ['adm', 'be'], { adm: 'be' }, [['adm', 'be']]],
    ['needs that are no object', ['adm', 'be'], ['be'], [['adm', 'be']]],
  ])('reads %s', (_name, parts, needs, steps) => {
    expect(partsOrderSteps(parts, needs)).toEqual(steps)
  })

  it('puts parts that need each other in a circle together, last', () => {
    expect(partsOrderSteps(['adm', 'be', 'web'], { adm: ['be'], be: ['adm'] })).toEqual([
      ['web'],
      ['adm', 'be'],
    ])
  })

  it('has no steps for no parts', () => {
    expect(partsOrderSteps([], { adm: ['be'] })).toEqual([])
  })
})

describe('partsOrderLine', () => {
  const name = (id: string) => PROJECTS.find((p) => p.id === id)?.title ?? id

  it('says which goes first, then what follows', () => {
    expect(partsOrderLine([['be'], ['adm']], name)).toBe('Backend first, then Admin')
    expect(partsOrderLine([['be'], ['adm', 'web']], name)).toBe('Backend first, then Admin and Web')
    expect(partsOrderLine([['be'], ['adm'], ['web']], name)).toBe(
      'Backend first, then Admin, then Web',
    )
    expect(partsOrderLine([['be', 'adm', 'web'], ['ops']], name)).toBe(
      'Backend, Admin and Web first, then ops',
    )
  })

  it('says parts with no order go in any order', () => {
    expect(partsOrderLine([['be', 'adm']], name)).toBe(TICKET_STORY_PROPOSAL_TEXT.anyOrder)
  })

  it('says nothing of order for one part or none', () => {
    expect(partsOrderLine([['be']], name)).toBeUndefined()
    expect(partsOrderLine([], name)).toBeUndefined()
  })
})

describe('ticketStoryProposalView', () => {
  it('shows an ask: the ticket, the title, the description, each part and the order', () => {
    expect(
      ticketStoryProposalView({
        args: ARGS,
        resultType: 'require_confirmation',
        projects: PROJECTS,
        siteUrl: 'https://acme.atlassian.net',
      }),
    ).toEqual({
      ticketKey: 'ZNR-780',
      ticketUrl: 'https://acme.atlassian.net/browse/ZNR-780',
      title: 'Renew sessions before uploads',
      description: 'Renew the session first.',
      parts: [
        {
          projectId: 'adm',
          projectTitle: 'Admin',
          story: { kind: 'new', title: 'Show the renewal in admin' },
          step: 2,
        },
        {
          projectId: 'be',
          projectTitle: 'Backend',
          story: { kind: 'existing', storyId: 's-12' },
          step: 1,
        },
      ],
      steps: [['be'], ['adm']],
      order: 'Backend first, then Admin',
      outcome: 'asking',
      note: TICKET_STORY_PROPOSAL_OUTCOME.asking,
    })
  })

  it('names a new part story after the group story when it has no title of its own', () => {
    const view = ticketStoryProposalView({
      args: { ...ARGS, parts: [{ projectId: 'be' }], needs: undefined },
      projects: PROJECTS,
    })
    expect(view.parts).toEqual([
      { projectId: 'be', projectTitle: 'Backend', story: { kind: 'new' }, step: 1 },
    ])
    expect(view.order).toBeUndefined()
  })

  it('names a project it does not know by its id, and links no ticket with no site', () => {
    const view = ticketStoryProposalView({ args: ARGS })
    expect(view.parts.map((p) => p.projectTitle)).toEqual(['adm', 'be'])
    expect(view.order).toBe('be first, then adm')
    expect(view.ticketUrl).toBeUndefined()
  })

  it('shows a created group story with the way to it, and the part stories by the titles made', () => {
    const view = ticketStoryProposalView({
      args: ARGS,
      result: CREATED,
      resultType: 'success',
      projects: PROJECTS,
    })
    expect(view.outcome).toBe('created')
    expect(view.note).toBe(TICKET_STORY_PROPOSAL_OUTCOME.created)
    expect(view.groupStory).toEqual({
      groupId: 'g1',
      groupStoryId: 'gs-1',
      title: 'Renew sessions before uploads',
    })
    expect(view.parts.map((p) => p.story)).toEqual([
      { kind: 'existing', storyId: 's-90', title: 'Show the renewal in admin' },
      { kind: 'existing', storyId: 's-12', title: 'Session renewal' },
    ])
    expect(view.order).toBe('Backend first, then Admin')
  })

  it('reads the order of a created story from what was made, over what was asked', () => {
    const view = ticketStoryProposalView({
      args: { ...ARGS, needs: undefined },
      result: CREATED,
      resultType: 'success',
      projects: PROJECTS,
    })
    expect(view.steps).toEqual([['be'], ['adm']])
  })

  it.each([
    [
      'a refusal answered as a result',
      'success',
      { error: 'ZNR-780 is In Progress and not assigned to you.' },
    ],
    ['an errored call', 'errored', 'ZNR-780 is In Progress and not assigned to you.'],
  ])('shows %s as one plain error line, with no way to a story', (_name, resultType, result) => {
    const view = ticketStoryProposalView({ args: ARGS, result, resultType, projects: PROJECTS })
    expect(view.outcome).toBe('refused')
    expect(view.note).toBe(TICKET_STORY_PROPOSAL_OUTCOME.refused)
    expect(view.error).toBe('ZNR-780 is In Progress and not assigned to you.')
    expect(view.groupStory).toBeUndefined()
    expect(view.title).toBe('Renew sessions before uploads')
  })

  it('never offers a way to a story from an answer that also carries an error', () => {
    const view = ticketStoryProposalView({
      args: ARGS,
      result: { ...CREATED, error: 'It was not linked.' },
      resultType: 'success',
    })
    expect(view.groupStory).toBeUndefined()
    expect(view.outcome).toBe('refused')
  })

  it('offers no way to a story from a result that names none', () => {
    const view = ticketStoryProposalView({
      args: ARGS,
      result: { ok: true },
      resultType: 'success',
    })
    expect(view.outcome).toBe('created')
    expect(view.groupStory).toBeUndefined()
  })

  it.each([
    ['not_allowed', 'declined'],
    ['aborted', 'cancelled'],
    ['running', 'creating'],
    ['pending', 'asking'],
    [undefined, 'asking'],
  ] as const)('reads result type %s as %s', (resultType, outcome) => {
    const view = ticketStoryProposalView({ args: ARGS, ...(resultType ? { resultType } : {}) })
    expect(view.outcome).toBe(outcome)
    expect(view.note).toBe(TICKET_STORY_PROPOSAL_OUTCOME[outcome])
  })

  it.each([
    ['no arguments', undefined],
    ['arguments that are text', 'ZNR-780'],
    ['parts that are no list', { ticketKey: 'ZNR-780', title: 'T', parts: 'be' }],
    ['parts with no project', { ticketKey: 'ZNR-780', title: 'T', parts: [{}, 'x', null] }],
  ])('draws what it can from %s', (_name, args) => {
    const view = ticketStoryProposalView({ args })
    expect(view.parts).toEqual([])
    expect(view.steps).toEqual([])
    expect(view.order).toBeUndefined()
  })

  it('says the title and ticket are missing when the agent gave none', () => {
    const view = ticketStoryProposalView({ args: {} })
    expect(view.title).toBe(TICKET_STORY_PROPOSAL_TEXT.untitled)
    expect(view.ticketKey).toBeUndefined()
    expect(view.description).toBeUndefined()
  })

  it('links nothing for a ticket key that is no key', () => {
    const view = ticketStoryProposalView({
      args: { ...ARGS, ticketKey: '../admin' },
      siteUrl: 'https://acme.atlassian.net',
    })
    expect(view.ticketKey).toBe('../admin')
    expect(view.ticketUrl).toBeUndefined()
  })
})
