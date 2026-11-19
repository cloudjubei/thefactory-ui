import { describe, expect, it } from 'vitest'
import {
  groupRunStartedWords,
  groupStoryTicketChip,
  groupStoryTicketRef,
  groupTicketStatuses,
  groupTicketsView,
  chatContextTickets,
  ticketChipView,
  ticketLink,
  ticketMoveDecisionOf,
  ticketMoveField,
} from './groupTickets'
import type { GroupTicketTab } from './groupTicketTabTypes'
import type {
  GroupTicket,
  GroupTicketList,
  GroupTicketSection,
  GroupTicketsState,
} from './groupTicketTypes'

const ticket = (key: string, over: Partial<GroupTicket> = {}): GroupTicket => ({
  key,
  summary: `Summary of ${key}`,
  url: `https://acme.atlassian.net/browse/${key}`,
  canTake: false,
  chatOpen: false,
  reviewOpen: false,
  ...over,
})

const NOT_READ: GroupTicketSection = { list: undefined, readError: null, loadingMore: false }

const TABS: GroupTicketTab[] = [
  {
    id: 'pending',
    name: 'Pending',
    statuses: ['To Do'],
    sprint: 'open',
    yours: ['take', 'discuss'],
    others: ['take', 'discuss'],
  },
  {
    id: 'review',
    name: 'In review',
    statuses: ['In Review'],
    sprint: 'open',
    yours: ['replies', 'approve-and-merge', 'discuss'],
    others: ['review', 'discuss'],
  },
]

const state = (over: Partial<GroupTicketsState> = {}): GroupTicketsState => ({
  mine: NOT_READ,
  tabs: { tabs: TABS, custom: true, readError: null },
  tab: undefined,
  byTab: {},
  tabCounts: {},
  search: { ...NOT_READ, query: '' },
  starting: undefined,
  startError: null,
  reviewing: {},
  offers: {},
  offerError: null,
  ...over,
})

describe('a ticket’s link', () => {
  it('keeps http and https links', () => {
    expect(ticketLink('https://acme.atlassian.net/browse/ENG-7')).toBe(
      'https://acme.atlassian.net/browse/ENG-7',
    )
    expect(ticketLink('http://jira.local/browse/ENG-7')).toBe('http://jira.local/browse/ENG-7')
  })

  it.each([['javascript:alert(1)'], ['data:text/html,x'], ['not a link'], [''], [undefined]])(
    'refuses %s',
    (url) => {
      expect(ticketLink(url)).toBeUndefined()
    },
  )
})

describe('a ticket’s chip', () => {
  it('says the key and the status, with the title in its hint', () => {
    expect(
      ticketChipView({
        key: 'ENG-7',
        status: 'In Progress',
        title: 'Fix rounding',
        url: 'https://acme.atlassian.net/browse/ENG-7',
      }),
    ).toEqual({
      key: 'ENG-7',
      status: 'In Progress',
      url: 'https://acme.atlassian.net/browse/ENG-7',
      label: 'ENG-7 · In Progress',
      hint: 'Fix rounding — Open in Jira',
    })
  })

  it('says the key alone when the status is not known', () => {
    expect(ticketChipView({ key: 'ENG-7' })).toEqual({
      key: 'ENG-7',
      label: 'ENG-7',
      hint: 'ENG-7',
    })
  })

  it('opens nothing for a link that is not a web page', () => {
    const chip = ticketChipView({ key: 'ENG-7', title: 'Fix', url: 'javascript:alert(1)' })
    expect(chip.url).toBeUndefined()
    expect(chip.hint).toBe('Fix')
  })
})

describe('a group story’s ticket', () => {
  const jira = { provider: 'jira', externalId: 'ENG-7', title: 'Fix', url: 'https://j.example/7' }

  it('is its Jira link, whatever else it is linked to', () => {
    const github = { provider: 'github', externalId: '45' }
    expect(groupStoryTicketRef({ externalIds: [github, jira] })).toBe(jira)
    expect(groupStoryTicketRef({ externalIds: [github] })).toBeUndefined()
    expect(groupStoryTicketRef({ externalIds: [] })).toBeUndefined()
    expect(groupStoryTicketRef({})).toBeUndefined()
  })

  it('takes its status from the sprint list', () => {
    expect(
      groupStoryTicketChip({ externalIds: [jira] }, { 'ENG-7': 'In Review', 'ENG-8': 'To Do' }),
    ).toMatchObject({ key: 'ENG-7', status: 'In Review', label: 'ENG-7 · In Review' })
  })

  it('shows the key alone for a ticket outside the sprint list', () => {
    expect(groupStoryTicketChip({ externalIds: [jira] }, {})).toMatchObject({ label: 'ENG-7' })
  })

  it('has no chip with no ticket', () => {
    expect(groupStoryTicketChip({}, { 'ENG-7': 'To Do' })).toBeUndefined()
  })
})

describe('the sprint’s statuses', () => {
  it('are by key, leaving out a ticket with none', () => {
    expect(groupTicketStatuses([ticket('A-1', { status: 'To Do' }), ticket('A-2')])).toEqual({
      'A-1': 'To Do',
    })
    expect(groupTicketStatuses(undefined)).toEqual({})
  })
})

const read = (tickets: GroupTicket[], over: Partial<GroupTicketList> = {}): GroupTicketSection => ({
  list: { connected: true, reviewOfferCount: 0, tickets, ...over },
  readError: null,
  loadingMore: false,
})

const shown = (s: GroupTicketsState, now?: number) => {
  const view = groupTicketsView(s, now)
  if (view.kind !== 'tickets') throw new Error(view.kind)
  return view
}

const keys = (rows: readonly { key: string }[]) => rows.map((r) => r.key)

describe('the Tickets tab', () => {
  it('waits for the tabs, and says why when they could not be read', () => {
    const unread = { tabs: undefined, custom: false, readError: null }
    expect(groupTicketsView(state({ tabs: unread }))).toEqual({ kind: 'loading' })
    expect(groupTicketsView(state({ tabs: { ...unread, readError: 'down' } }))).toEqual({
      kind: 'failed',
      error: 'down',
    })
  })

  it('says the group has no Jira', () => {
    const none: GroupTicketSection = {
      list: { connected: false, reviewOfferCount: 0, tickets: [] },
      readError: null,
      loadingMore: false,
    }
    expect(groupTicketsView(state({ byTab: { pending: none } }))).toEqual({ kind: 'no-jira' })
  })

  it('shows the tabs with their counts, on the first tab until one is picked', () => {
    const view = shown(state({ tabCounts: { pending: 4, review: 2 } }))
    expect(view.tabs).toEqual([
      { id: 'pending', label: 'Pending', count: 4 },
      { id: 'review', label: 'In review', count: 2 },
    ])
    expect(view.tab).toBe('pending')
    expect(shown(state({ tab: 'review' })).tab).toBe('review')
    expect(shown(state({ tab: 'gone' })).tab).toBe('pending')
  })

  it('is loading while the tab on screen is unread', () => {
    const view = shown(state())
    expect(view.mine.loading).toBe(true)
    expect(view.mine.rows).toEqual([])
    expect(view.others.rows).toEqual([])
  })

  it('splits the tab into the person’s tickets and everyone else’s, in board order', () => {
    const view = shown(
      state({
        byTab: {
          pending: read([
            ticket('A-1', { mine: false }),
            ticket('A-2', { mine: true }),
            ticket('A-3', { mine: true }),
          ]),
        },
      }),
    )
    expect(view.mine.loading).toBe(false)
    expect(keys(view.mine.rows)).toEqual(['A-2', 'A-3'])
    expect(keys(view.others.rows)).toEqual(['A-1'])
    expect(view.mine.line).toBe('2 tickets')
  })

  it('shows a tab read before at once when it is picked again', () => {
    const view = shown(
      state({
        tab: 'review',
        byTab: { pending: read([ticket('A-1')]), review: read([ticket('R-1')]) },
      }),
    )
    expect(keys(view.others.rows)).toEqual(['R-1'])
  })

  it('gives each row its tab’s actions for its side', () => {
    const view = shown(
      state({
        tab: 'review',
        byTab: {
          review: read([
            ticket('R-1', { mine: true, reviewOpen: true }),
            ticket('R-2', { mine: false, reviewOpen: true }),
          ]),
        },
      }),
    )
    expect(view.mine.rows[0]?.actions).toEqual(['replies', 'approve-and-merge', 'discuss'])
    expect(view.others.rows[0]?.actions).toEqual(['review', 'discuss'])
  })

  it('shows replies on the person’s rows of a tab that shows them', () => {
    const NOW = Date.parse('2026-11-19T12:00:00Z')
    const view = shown(
      state({
        tab: 'review',
        byTab: {
          review: read([
            ticket('R-1', {
              mine: true,
              replies: { slack: 2, github: 1, latest: '2026-11-19T11:00:00Z' },
            }),
          ]),
        },
      }),
      NOW,
    )
    expect(view.mine.rows[0]?.replies).toEqual({
      line: '2 Slack replies · 1 GitHub comment',
      when: '1 hour ago',
      none: false,
    })
  })

  it('shows no replies where the tab does not offer them', () => {
    const view = shown(
      state({
        byTab: { pending: read([ticket('A-1', { mine: true, replies: { slack: 1, github: 0 } })]) },
      }),
    )
    expect(view.mine.rows[0]).not.toHaveProperty('replies')
  })

  it('says once that a tab holds nothing, and each side that has none', () => {
    const empty = shown(state({ byTab: { pending: read([]) } }))
    expect(empty.emptyLine).toBe('No tickets in this tab.')
    expect(empty.mine.emptyLine).toBeUndefined()
    expect(empty.others.emptyLine).toBeUndefined()
    const onlyMine = shown(state({ byTab: { pending: read([ticket('A-1', { mine: true })]) } }))
    expect(onlyMine.emptyLine).toBeUndefined()
    expect(onlyMine.others.emptyLine).toBe('Nobody else has one here.')
    const onlyOthers = shown(state({ byTab: { pending: read([ticket('A-1')]) } }))
    expect(onlyOthers.mine.emptyLine).toBe('None of yours here.')
  })

  it('says why the tab could not be read, once, and keeps what it showed', () => {
    const view = shown(
      state({ byTab: { pending: { ...read([ticket('A-1')]), readError: 'Jira is down' } } }),
    )
    expect(view.readError).toBe('Jira is down')
    expect(keys(view.others.rows)).toEqual(['A-1'])
    expect(view.mine.readError).toBeUndefined()
  })

  it('offers more only while Jira has more of the tab, and says it is reading', () => {
    const more = { ...read([ticket('A-1')], { nextPageToken: 'p2' }), loadingMore: true }
    const view = shown(state({ byTab: { pending: more } }))
    expect(view.canLoadMore).toBe(true)
    expect(view.loadingMore).toBe(true)
    expect(shown(state({ byTab: { pending: read([]) } })).canLoadMore).toBe(false)
  })
})

describe('the next ticket', () => {
  it('is the person’s ticket Jira names, when the tab lets them take it', () => {
    const view = shown(
      state({
        byTab: {
          pending: read(
            [ticket('A-1', { mine: true }), ticket('A-2', { mine: true, canTake: true })],
            { nextTicketKey: 'A-2' },
          ),
        },
      }),
    )
    expect(view.next?.key).toBe('A-2')
    expect(keys(view.mine.rows)).toEqual(['A-1'])
  })

  it('is none for a ticket that cannot be taken, or in a tab that offers no Take', () => {
    const named = (canTake: boolean, tab?: string) =>
      shown(
        state({
          ...(tab ? { tab } : {}),
          byTab: {
            [tab ?? 'pending']: read([ticket('A-1', { mine: true, canTake })], {
              nextTicketKey: 'A-1',
            }),
          },
        }),
      ).next
    expect(named(false)).toBeUndefined()
    expect(named(true, 'review')).toBeUndefined()
    expect(named(true)).toBeDefined()
  })

  it('says nothing of an empty side when the next ticket is all there is', () => {
    const view = shown(
      state({
        byTab: {
          pending: read([ticket('A-1', { mine: true, canTake: true })], { nextTicketKey: 'A-1' }),
        },
      }),
    )
    expect(view.mine.emptyLine).toBeUndefined()
  })
})

describe('a ticket’s row', () => {
  const rowOf = (t: GroupTicket, over: Partial<GroupTicketsState> = {}) =>
    shown(state({ byTab: { pending: read([t]) }, ...over })).others.rows[0]!

  it('carries its chip, priority and summary, and says a press opens it', () => {
    const row = rowOf(ticket('A-1', { priority: 'High', status: 'To Do' }))
    expect(row.chip.label).toBe('A-1 · To Do')
    expect(row.priority).toBe('High')
    expect(row.summary).toBe('Summary of A-1')
    expect(row.hint).toBe('Open A-1')
  })

  it('offers Take only on a ticket that can be taken', () => {
    expect(rowOf(ticket('A-1', { canTake: true })).actions).toEqual(['take', 'discuss'])
    expect(rowOf(ticket('A-1')).actions).toEqual(['discuss'])
  })

  it('says it has work, a chat and a review, each on its own', () => {
    const row = rowOf(
      ticket('A-1', {
        groupStory: { id: 'g1', title: 'Sign in' },
        chatOpen: true,
        reviewOpen: true,
      }),
    )
    expect(row.work).toEqual({ id: 'g1', title: 'Sign in' })
    expect([row.chatOpen, row.reviewOpen]).toEqual([true, true])
  })

  it('marks what is starting, and a round starting, on its own ticket alone', () => {
    const view = shown(
      state({
        byTab: { pending: read([ticket('A-1'), ticket('A-2')]) },
        starting: { key: 'A-1', action: 'discuss' },
        reviewing: { 'A-2': { step: 'starting' } },
      }),
    )
    const [a1, a2] = view.others.rows
    expect(a1?.starting).toBe('discuss')
    expect(a2?.starting).toBeUndefined()
    expect(a2?.reviewing).toBeDefined()
    expect(view.starting).toBe(true)
  })

  it('says why a chat did not open', () => {
    expect(shown(state({ startError: 'No agent' })).startError).toBe('No agent')
  })
})

describe('a search', () => {
  const searching = (over: Partial<GroupTicketsState['search']>) =>
    state({ search: { ...NOT_READ, query: 'code', ...over } })

  it('is absent with nothing typed', () => {
    expect(shown(state()).search).toBeUndefined()
  })

  it('is being read until it answers', () => {
    expect(shown(searching({})).search?.loading).toBe(true)
  })

  it('gives each row the actions of the tab it falls in, and Discuss alone in none', () => {
    const view = shown(
      searching(
        read([ticket('R-1', { tabId: 'review', mine: false }), ticket('X-1', { canTake: true })]),
      ),
    )
    expect(view.search?.rows.map((r) => r.actions)).toEqual([['review', 'discuss'], ['discuss']])
  })

  it('says so when nothing matches, in the person’s own words', () => {
    expect(shown(searching(read([]))).search?.emptyLine).toBe('No ticket matches “code”.')
  })

  it('says why it failed, and can read more of a long answer', () => {
    expect(shown(searching({ readError: 'down' })).search?.readError).toBe('down')
    expect(
      shown(searching(read([ticket('A-1')], { nextPageToken: 'p2' }))).search?.canLoadMore,
    ).toBe(true)
  })
})

describe('the move on a launch card', () => {
  const offered = {
    ticketKey: 'ENG-7',
    ticketTitle: 'Fix rounding',
    ticketUrl: 'https://j.example/ENG-7',
    ticketStatus: 'To Do',
    change: 'ENG-7 → In Progress',
    transitionId: '31',
    toStatus: 'In Progress',
  }

  it('is nothing for a story with no ticket', () => {
    expect(ticketMoveField(undefined)).toBeUndefined()
  })

  it('offers the change, with the ticket as it stands', () => {
    expect(ticketMoveField(offered)).toMatchObject({
      kind: 'offer',
      title: 'Fix rounding',
      change: 'ENG-7 → In Progress',
      decision: { ticketKey: 'ENG-7', transitionId: '31' },
      chip: { label: 'ENG-7 · To Do', url: 'https://j.example/ENG-7' },
    })
  })

  it('says why when there is no move, and offers no tick box', () => {
    expect(
      ticketMoveField({
        ticketKey: 'ENG-7',
        unavailable: 'Jira is read-only here, so the ticket stays as it is.',
      }),
    ).toMatchObject({
      kind: 'unavailable',
      text: 'Jira is read-only here, so the ticket stays as it is.',
      chip: { label: 'ENG-7' },
    })
  })

  it('never offers a move that also says it is unavailable', () => {
    expect(ticketMoveField({ ...offered, unavailable: 'Not now.' })?.kind).toBe('unavailable')
  })

  it.each([
    [{ ticketKey: 'ENG-7' }],
    [{ ticketKey: 'ENG-7', change: 'x' }],
    [{ ticketKey: 'ENG-7', transitionId: '1' }],
  ])('draws nothing with neither a whole move nor a reason: %j', (move) => {
    expect(ticketMoveField(move)).toBeUndefined()
  })

  it('sends the move only while it is ticked', () => {
    const field = ticketMoveField(offered)
    expect(ticketMoveDecisionOf(field, true)).toEqual({ ticketKey: 'ENG-7', transitionId: '31' })
    expect(ticketMoveDecisionOf(field, false)).toBeUndefined()
  })

  it('sends nothing when there is no move to send', () => {
    expect(ticketMoveDecisionOf(undefined, true)).toBeUndefined()
    expect(
      ticketMoveDecisionOf(ticketMoveField({ ticketKey: 'A-1', unavailable: 'No.' }), true),
    ).toBeUndefined()
  })
})

describe('what a started run says of its ticket', () => {
  it('leaves a run with no ticket as it is', () => {
    expect(groupRunStartedWords({ message: 'Started.' })).toEqual({ message: 'Started.' })
  })

  it('leaves a moved ticket in the sentence', () => {
    expect(
      groupRunStartedWords({
        message: 'Started. ENG-7 moved to In Progress.',
        ticketMove: { ticketKey: 'ENG-7', moved: true, message: 'ENG-7 moved to In Progress.' },
      }),
    ).toEqual({ message: 'Started. ENG-7 moved to In Progress.' })
  })

  it('lifts a move that failed out of the sentence, said once', () => {
    expect(
      groupRunStartedWords({
        message: 'Started. ENG-7 was not moved: gone. The run carries on.',
        ticketMove: {
          ticketKey: 'ENG-7',
          moved: false,
          message: 'ENG-7 was not moved: gone. The run carries on.',
        },
      }),
    ).toEqual({ message: 'Started.', notMoved: 'ENG-7 was not moved: gone. The run carries on.' })
  })

  it('still shows a failed move the sentence does not end on', () => {
    expect(
      groupRunStartedWords({
        message: 'Started.',
        ticketMove: { ticketKey: 'ENG-7', moved: false, message: 'Not moved.' },
      }),
    ).toEqual({ message: 'Started.', notMoved: 'Not moved.' })
  })
})

describe('chatContextTickets', () => {
  const ref = (key: string) => ({
    provider: 'jira',
    externalId: key,
    url: `https://acme.atlassian.net/browse/${key}`,
  })

  it('reads the ticket a ticket’s chat keeps', () => {
    expect(chatContextTickets({ metadata: { ticket: ref('ENG-1') } })).toEqual([
      ticketChipView({ key: 'ENG-1', url: ref('ENG-1').url }),
    ])
  })

  it('reads the ticket of the group story a chat’s story is a part of', () => {
    const memberships = [{ title: 'Faster', externalIds: [ref('ENG-2')] }]
    expect(chatContextTickets({ memberships })).toEqual([
      ticketChipView({ key: 'ENG-2', title: 'Faster', url: ref('ENG-2').url }),
    ])
  })

  it('puts the chat’s own first and shows a ticket once', () => {
    const memberships = [
      { title: 'A', externalIds: [ref('ENG-1')] },
      { title: 'B', externalIds: [ref('ENG-2')] },
    ]
    const keys = chatContextTickets({ metadata: { ticket: ref('ENG-1') }, memberships })
    expect(keys.map((t) => t.key)).toEqual(['ENG-1', 'ENG-2'])
  })

  it('leaves out a group story with no Jira ticket', () => {
    const memberships = [
      { title: 'A' },
      { title: 'B', externalIds: [{ provider: 'github', externalId: '45' }] },
    ]
    expect(chatContextTickets({ memberships })).toEqual([])
  })

  it.each([
    ['nothing', undefined],
    ['no ticket', {}],
    ['a ticket of another shape', { ticket: 'ENG-1' }],
    ['a ticket with no key', { ticket: { provider: 'jira' } }],
  ])('reads none from metadata holding %s', (_name, metadata) => {
    expect(chatContextTickets({ metadata })).toEqual([])
  })

  it('opens nothing for a link that is no web page', () => {
    const ticket = { ...ref('ENG-1'), url: 'javascript:alert(1)' }
    expect(chatContextTickets({ metadata: { ticket } })[0]?.url).toBeUndefined()
  })
})

describe('ticketChipView — the status lozenge', () => {
  it('colours the status by its Jira category', () => {
    expect(
      ticketChipView({ key: 'ENG-1', status: 'In Review', statusCategory: 'indeterminate' })
        .statusTone,
    ).toBe('progress')
    expect(
      ticketChipView({ key: 'ENG-1', status: 'Done', statusCategory: 'done' }).statusTone,
    ).toBe('done')
  })

  it.each([
    ['no category', { key: 'ENG-1', status: 'Triage' }],
    ['a category Jira does not name', { key: 'ENG-1', status: 'Triage', statusCategory: 'other' }],
    ['no status to colour', { key: 'ENG-1', statusCategory: 'done' }],
  ])('keeps the chip as it was with %s', (_name, ticket) => {
    expect(ticketChipView(ticket)).not.toHaveProperty('statusTone')
  })
})

describe('updates from Slack on the Tickets tab', () => {
  const NOW = Date.parse('2026-11-17T12:00:00.000Z')
  const offer = {
    id: 'o1',
    kind: 'first-round' as const,
    author: 'Ana',
    postedAt: '2026-11-17T11:00:00.000Z',
    permalink: 'https://acme.slack.com/archives/C1/p1763380000123456',
    state: 'new' as const,
    files: 0,
  }

  it('marks the row an update waits on, and counts them across the group', () => {
    const view = shown(
      state({
        byTab: {
          pending: read([ticket('A-1', { reviewOffer: offer }), ticket('A-2')], {
            reviewOfferCount: 3,
          }),
        },
      }),
      NOW,
    )
    expect(view.offerCount).toBe(3)
    const [a1, a2] = view.others.rows
    expect(a1?.offer).toEqual({
      id: 'o1',
      kind: 'first-round',
      author: 'Ana',
      label: 'Update from Ana',
      when: '1 hour ago',
      permalink: offer.permalink,
      dismissed: false,
    })
    expect(a2?.offer).toBeUndefined()
  })

  it('counts none until the tab is read, and says why a dismiss failed', () => {
    const view = shown(state({ offerError: 'Gone already.' }))
    expect(view.offerCount).toBe(0)
    expect(view.offerError).toBe('Gone already.')
  })
})
