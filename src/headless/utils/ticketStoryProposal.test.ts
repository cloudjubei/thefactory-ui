import { describe, expect, it } from 'vitest'
import {
  isTicketStoryProposalTool,
  partsOrderLine,
  partsOrderSteps,
  ticketStoryFeaturesFold,
  ticketStoryProposalView,
} from './ticketStoryProposal'
import {
  TICKET_STORY_FEATURES_SHOWN,
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
  needs: { 'Show the renewal in admin': ['s-12'] },
}
const CREATED = {
  groupStoryId: 'gs-1',
  groupId: 'g1',
  title: 'Renew sessions before uploads',
  description: 'Renew the session first.',
  parts: [
    { projectId: 'adm', storyId: 's-90', storyTitle: 'Show the renewal in admin', needs: ['s-12'] },
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
  const p = (key: string, projectId = key) => ({ key, projectId, name: key })
  it.each([
    ['one part needing another', [p('adm'), p('be')], { adm: ['be'] }, [['be'], ['adm']]],
    [
      'two parts needing the same one',
      [p('adm'), p('be'), p('web')],
      { adm: ['be'], web: ['be'] },
      [['be'], ['adm', 'web']],
    ],
    [
      'a chain',
      [p('web'), p('adm'), p('be')],
      { adm: ['be'], web: ['adm'] },
      [['be'], ['adm'], ['web']],
    ],
    ['no needs at all', [p('adm'), p('be')], {}, [['adm', 'be']]],
    ['a need for a part that is not there', [p('adm'), p('be')], { adm: ['ops'] }, [['adm', 'be']]],
    ['a part needing itself', [p('adm'), p('be')], { adm: ['adm'] }, [['adm', 'be']]],
    ['needs that are not lists', [p('adm'), p('be')], { adm: 'be' }, [['adm', 'be']]],
    ['needs that are no object', [p('adm'), p('be')], ['be'], [['adm', 'be']]],
    [
      'one project’s parts, each after the one before it',
      [p('a1', 'adm'), p('be'), p('a2', 'adm')],
      {},
      [['a1', 'be'], ['a2']],
    ],
  ])('reads %s', (_name, parts, needs, steps) => {
    expect(partsOrderSteps(parts, needs)).toEqual(steps)
  })

  it('reads a part named by its name, not its key', () => {
    expect(
      partsOrderSteps(
        [
          { key: 'k1', projectId: 'adm', name: 'Admin story' },
          { key: 'k2', projectId: 'be', name: 's-12' },
        ],
        { 'Admin story': ['s-12'] },
      ),
    ).toEqual([['k2'], ['k1']])
  })

  it('puts parts that need each other in a circle together, last', () => {
    expect(partsOrderSteps([p('adm'), p('be'), p('web')], { adm: ['be'], be: ['adm'] })).toEqual([
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
          key: 'part-0',
          projectId: 'adm',
          projectTitle: 'Admin',
          story: { kind: 'new', title: 'Show the renewal in admin' },
          step: 2,
          features: [],
        },
        {
          key: 'part-1',
          projectId: 'be',
          projectTitle: 'Backend',
          story: { kind: 'existing', storyId: 's-12' },
          step: 1,
          features: [],
        },
      ],
      steps: [['part-1'], ['part-0']],
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
      {
        key: 'part-0',
        projectId: 'be',
        projectTitle: 'Backend',
        story: { kind: 'new' },
        step: 1,
        features: [],
      },
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
    expect(view.steps).toEqual([['part-1'], ['part-0']])
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

const RENEW = {
  title: 'Renewal call',
  description: 'A **POST** that renews the session.',
  acceptance: '- Renews a live session\n- Refuses an expired one',
  context: ['src/session.ts'],
}
const SHOW = {
  title: 'Last renewal column',
  description: '',
  acceptance: 'The column shows the time.',
}
const WAIT = { label: 'ZNR-781', branch: 'znr-781-limits' }
const PLANNED = {
  ...ARGS,
  parts: [
    { projectId: 'adm', newStoryTitle: 'Show the renewal in admin', features: [SHOW] },
    { projectId: 'be', storyId: 's-12', features: [RENEW, SHOW], waitsFor: [WAIT] },
  ],
}

describe('ticketStoryProposalView: features and waits', () => {
  it('gives each part its features in the order given: title, description and what makes it done', () => {
    const view = ticketStoryProposalView({ args: PLANNED, projects: PROJECTS })
    expect(view.parts.map((p) => p.features)).toStrictEqual([
      [{ title: 'Last renewal column', criteria: ['The column shows the time.'] }],
      [
        {
          title: 'Renewal call',
          description: 'A **POST** that renews the session.',
          criteria: ['Renews a live session', 'Refuses an expired one'],
        },
        { title: 'Last renewal column', criteria: ['The column shows the time.'] },
      ],
    ])
  })

  it('shows a part that waits for other work as a run’s wait card would, and no wait on a part with none', () => {
    const [adm, be] = ticketStoryProposalView({ args: PLANNED, projects: PROJECTS }).parts
    expect(adm!.wait).toBeUndefined()
    expect(be!.wait).toMatchObject({
      state: 'ahead',
      headline: 'Waits for ZNR-781 to reach the base branch before its proof',
      entries: [{ label: 'ZNR-781', onBase: false, line: 'branch znr-781-limits' }],
      actions: [],
    })
  })

  it.each([
    ['a list that is no list', 'Renewal call'],
    ['entries that are no feature', [null, 'x', 7, { description: 'no title' }, { title: '  ' }]],
  ])('draws no features from %s', (_name, features) => {
    const view = ticketStoryProposalView({
      args: { ...ARGS, parts: [{ projectId: 'be', features }] },
    })
    expect(view.parts[0]!.features).toEqual([])
  })

  it('reads a feature with only a title, and an acceptance that is no text, as a title alone', () => {
    const view = ticketStoryProposalView({
      args: {
        ...ARGS,
        parts: [{ projectId: 'be', features: [{ title: ' Renewal call ', acceptance: 3 }] }],
      },
    })
    expect(view.parts[0]!.features).toEqual([{ title: 'Renewal call', criteria: [] }])
  })

  it('plans a project once: the first part given for it', () => {
    const view = ticketStoryProposalView({
      args: {
        ...ARGS,
        parts: [
          { projectId: 'be', features: [RENEW] },
          { projectId: 'be', features: [SHOW], waitsFor: [WAIT] },
        ],
      },
    })
    expect(view.parts.map((p) => [p.features.map((f) => f.title), p.wait])).toEqual([
      [['Renewal call'], undefined],
      [['Renewal call'], undefined],
    ])
  })

  it('shows no wait the backend would refuse', () => {
    const view = ticketStoryProposalView({
      args: { ...ARGS, parts: [{ projectId: 'be', waitsFor: [{ label: 'ZNR-781' }] }] },
    })
    expect(view.parts[0]!.wait).toBeUndefined()
  })

  it('keeps the planned features and waits once made, matched to each made part by its project', () => {
    const view = ticketStoryProposalView({
      args: PLANNED,
      result: {
        ...CREATED,
        parts: [
          ...CREATED.parts.map((p) => ({ ...p, features: '0/2 done' })),
          { projectId: 'web', storyId: 's-5', storyTitle: 'Web part', features: '0/0 done' },
        ],
      },
      resultType: 'success',
      projects: PROJECTS,
    })
    expect(view.parts.map((p) => [p.projectId, p.features.map((f) => f.title)])).toEqual([
      ['adm', ['Last renewal column']],
      ['be', ['Renewal call', 'Last renewal column']],
      ['web', []],
    ])
    expect(view.parts.map((p) => p.wait?.headline)).toEqual([
      undefined,
      'Waits for ZNR-781 to reach the base branch before its proof',
      undefined,
    ])
  })

  it('says a made story is ready to run in the first sentence of the backend’s message', () => {
    const view = ticketStoryProposalView({
      args: PLANNED,
      result: {
        ...CREATED,
        message:
          'Made and linked to ZNR-780, every part’s story with its features: it is ready to run. Add nothing to it. When the person says start, call `startGroupWork`.',
      },
      resultType: 'success',
    })
    expect(view.ready).toBe(
      'Made and linked to ZNR-780, every part’s story with its features: it is ready to run.',
    )
  })

  it('says the whole message when it is one sentence with no stop', () => {
    const view = ticketStoryProposalView({
      args: PLANNED,
      result: { ...CREATED, message: '  Ready to run  ' },
      resultType: 'success',
    })
    expect(view.ready).toBe('Ready to run')
  })

  it.each([
    ['still asking', undefined, 'require_confirmation'],
    ['refused', { error: 'No.', message: 'Ready to run.' }, 'success'],
    ['made with no message', CREATED, 'success'],
    ['made with a message that is no text', { ...CREATED, message: 3 }, 'success'],
  ])('says nothing of being ready when %s', (_name, result, resultType) => {
    const view = ticketStoryProposalView({ args: PLANNED, result, resultType })
    expect(view.ready).toBeUndefined()
  })
})

describe('ticketStoryFeaturesFold', () => {
  const max = TICKET_STORY_FEATURES_SHOWN

  it('shows every feature of a short list', () => {
    expect(ticketStoryFeaturesFold(0, false)).toEqual({ shown: 0, more: 0 })
    expect(ticketStoryFeaturesFold(max, false)).toEqual({ shown: max, more: 0 })
  })

  it('never folds away a single feature behind "1 more"', () => {
    expect(ticketStoryFeaturesFold(max + 1, false)).toEqual({ shown: max + 1, more: 0 })
  })

  it('folds a long list past the first few, and shows it whole once opened', () => {
    expect(ticketStoryFeaturesFold(max + 2, false)).toEqual({ shown: max, more: 2 })
    expect(ticketStoryFeaturesFold(12, false)).toEqual({ shown: max, more: 12 - max })
    expect(ticketStoryFeaturesFold(12, true)).toEqual({ shown: 12, more: 0 })
  })
})
