import { describe, expect, it } from 'vitest'
import {
  groupRunStartedWords,
  groupStoryTicketChip,
  groupStoryTicketRef,
  groupTicketStatuses,
  groupTicketsView,
  ticketChipView,
  ticketLink,
  ticketMoveDecisionOf,
  ticketMoveField,
} from './groupTickets'
import type {
  GroupTicket,
  GroupTicketList,
  GroupTicketSearch,
  GroupTicketSection,
  GroupTicketsState,
} from './groupTicketTypes'

const ticket = (key: string, over: Partial<GroupTicket> = {}): GroupTicket => ({
  key,
  summary: `Summary of ${key}`,
  url: `https://acme.atlassian.net/browse/${key}`,
  canTake: false,
  chatOpen: false,
  ...over,
})

const NOT_READ: GroupTicketSection = { list: undefined, readError: null, loadingMore: false }

const state = (over: Partial<GroupTicketsState> = {}): GroupTicketsState => ({
  mine: NOT_READ,
  sprint: NOT_READ,
  search: { ...NOT_READ, query: '' },
  starting: undefined,
  startError: null,
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
  ...NOT_READ,
  list: { connected: true, tickets, ...over },
})

const shown = (s: GroupTicketsState) => {
  const view = groupTicketsView(s)
  if (view.kind !== 'tickets') throw new Error(`expected tickets, got ${view.kind}`)
  return view
}

describe('the Tickets tab', () => {
  it('waits for the first answer, and for neither list to have one', () => {
    expect(groupTicketsView(state()).kind).toBe('loading')
  })

  it('shows the lists as soon as either one answers', () => {
    const view = shown(state({ mine: read([ticket('A-1')]) }))
    expect(view.mine.rows.map((r) => r.key)).toEqual(['A-1'])
    expect(view.others.loading).toBe(true)
    expect(view.others.rows).toEqual([])
  })

  it.each([
    ['mine', { mine: { ...NOT_READ, list: { connected: false, tickets: [] } } }],
    ['sprint', { sprint: { ...NOT_READ, list: { connected: false, tickets: [] } } }],
  ])('says a group has no Jira from the %s list alone', (_name, over) => {
    expect(groupTicketsView(state(over)).kind).toBe('no-jira')
  })

  it('says why once, when both lists failed the same way', () => {
    const failed = { ...NOT_READ, readError: 'Jira is down' }
    const view = shown(state({ mine: failed, sprint: failed }))
    expect(view.readError).toBe('Jira is down')
    expect(view.mine.readError).toBeUndefined()
    expect(view.others.readError).toBeUndefined()
    expect(view.mine.loading).toBe(false)
  })

  it('says why on the list that failed, and keeps the other', () => {
    const view = shown(
      state({ mine: read([ticket('A-1')]), sprint: { ...NOT_READ, readError: 'No board' } }),
    )
    expect(view.readError).toBeUndefined()
    expect(view.others.readError).toBe('No board')
    expect(view.mine.readError).toBeUndefined()
    expect(view.mine.rows).toHaveLength(1)
  })

  it('keeps a list on screen when a later read fails', () => {
    const view = shown(state({ mine: { ...read([ticket('A-1')]), readError: 'Jira is down' } }))
    expect(view.mine.rows).toHaveLength(1)
    expect(view.mine.readError).toBe('Jira is down')
  })

  it('counts a list in plain words, the next ticket among them', () => {
    const one = shown(state({ sprint: read([ticket('A-1')]) }))
    expect(one.others.line).toBe('1 ticket')
    const worked = { groupStory: { id: 'g', title: 'G' } }
    const three = shown(
      state({
        mine: read([ticket('A-1', { canTake: true }), ticket('A-2', worked), ticket('A-3')], {
          nextTicketKey: 'A-1',
        }),
      }),
    )
    expect(three.mine.line).toBe('3 tickets · 1 has work')
    const both = shown(state({ sprint: read([ticket('A-1', worked), ticket('A-2', worked)]) }))
    expect(both.others.line).toBe('2 tickets · 2 have work')
  })

  it('says so when a list is empty, and not while it is read', () => {
    const view = shown(state({ mine: read([]), sprint: read([]) }))
    expect(view.mine.emptyLine).toBe('Nothing is assigned to you in the open sprint.')
    expect(view.others.emptyLine).toBe('Nobody else has tickets in the open sprint.')
    expect(view.mine.line).toBe('')
    expect(shown(state({ mine: read([]) })).others.emptyLine).toBeUndefined()
  })

  it('says nothing of an empty list when the next ticket is all there is', () => {
    const view = shown(
      state({ mine: read([ticket('A-1', { canTake: true })], { nextTicketKey: 'A-1' }) }),
    )
    expect(view.next?.key).toBe('A-1')
    expect(view.mine.rows).toEqual([])
    expect(view.mine.emptyLine).toBeUndefined()
  })

  it('offers more only while Jira has more, per list, and says which is reading', () => {
    const view = shown(
      state({
        mine: { ...read([ticket('A-1')], { nextPageToken: 'p2' }), loadingMore: true },
        sprint: read([ticket('B-1')]),
      }),
    )
    expect(view.mine).toMatchObject({ canLoadMore: true, loadingMore: true })
    expect(view.others).toMatchObject({ canLoadMore: false, loadingMore: false })
  })
})

describe('the next ticket', () => {
  it('comes out of the rows, which keep board order', () => {
    const view = shown(
      state({
        mine: read(
          [ticket('A-1'), ticket('A-2', { canTake: true }), ticket('A-3', { canTake: true })],
          { nextTicketKey: 'A-2' },
        ),
      }),
    )
    expect(view.next?.key).toBe('A-2')
    expect(view.mine.rows.map((r) => r.key)).toEqual(['A-1', 'A-3'])
  })

  it('is none when Jira names none', () => {
    const view = shown(state({ mine: read([ticket('A-1', { canTake: true })]) }))
    expect(view.next).toBeUndefined()
    expect(view.mine.rows).toHaveLength(1)
  })

  it('is none for a ticket that cannot be taken, which stays a row', () => {
    const view = shown(state({ mine: read([ticket('A-1')], { nextTicketKey: 'A-1' }) }))
    expect(view.next).toBeUndefined()
    expect(view.mine.rows.map((r) => r.key)).toEqual(['A-1'])
  })

  it('is none for a ticket not on the pages read yet', () => {
    const view = shown(state({ mine: read([ticket('A-1')], { nextTicketKey: 'A-9' }) }))
    expect(view.next).toBeUndefined()
  })
})

describe('a ticket’s row', () => {
  const row = (over: Partial<GroupTicket>, starting?: GroupTicketsState['starting']) =>
    shown(state({ sprint: read([ticket('A-1', over)]), starting })).others.rows[0]!

  it('carries its chip, priority and summary', () => {
    const { chip, priority, summary } = row({ status: 'In QA', priority: 'High' })
    expect(chip.label).toBe('A-1 · In QA')
    expect(priority).toBe('High')
    expect(summary).toBe('Summary of A-1')
  })

  it('leaves out what Jira did not say', () => {
    expect(row({})).not.toHaveProperty('priority')
    expect(row({})).not.toHaveProperty('work')
    expect(row({})).not.toHaveProperty('starting')
  })

  it('can be taken only when the ticket says so', () => {
    expect(row({ canTake: true }).canTake).toBe(true)
    expect(row({ canTake: false, status: 'To Do' }).canTake).toBe(false)
    expect(row({ canTake: false, status: 'In Progress' }).canTake).toBe(false)
  })

  it('says it has work, and a chat, each on its own', () => {
    const story = { id: 'g', title: 'G' }
    expect(row({ groupStory: story })).toMatchObject({ work: story, chatOpen: false })
    expect(row({ chatOpen: true })).toMatchObject({ chatOpen: true })
    expect(row({ chatOpen: true })).not.toHaveProperty('work')
    expect(row({ groupStory: story, chatOpen: true })).toMatchObject({
      work: story,
      chatOpen: true,
    })
  })

  it('says what a press does', () => {
    expect(row({}).hint).toBe('Discuss A-1')
    expect(row({ chatOpen: true }).hint).toBe('Open the chat on A-1')
  })

  it('marks what is starting on its own ticket alone', () => {
    const opening = shown(
      state({
        sprint: read([ticket('A-1'), ticket('A-2')]),
        starting: { key: 'A-1', action: 'discuss' },
      }),
    )
    expect(opening.starting).toBe(true)
    expect(opening.others.rows[0]?.starting).toBe('discuss')
    expect(opening.others.rows[1]).not.toHaveProperty('starting')
    expect(row({}, { key: 'A-1', action: 'plan' }).starting).toBe('plan')
  })

  it('marks the next ticket as it starts too', () => {
    const view = shown(
      state({
        mine: read([ticket('A-1', { canTake: true })], { nextTicketKey: 'A-1' }),
        starting: { key: 'A-1', action: 'plan' },
      }),
    )
    expect(view.next?.starting).toBe('plan')
  })

  it('says why a chat did not open', () => {
    const view = shown(state({ sprint: read([]), startError: 'A-1 is In Progress.' }))
    expect(view.startError).toBe('A-1 is In Progress.')
    expect(view.starting).toBe(false)
    expect(shown(state({ sprint: read([]) }))).not.toHaveProperty('startError')
  })
})

describe('a search', () => {
  const searching = (over: Partial<GroupTicketSearch>): GroupTicketsState =>
    state({
      mine: read([ticket('A-1')]),
      search: { ...NOT_READ, query: 'znr-780', ...over },
    })

  it('is absent with nothing typed', () => {
    expect(shown(state({ mine: read([]) })).search).toBeUndefined()
  })

  it('is being read until it answers', () => {
    const { search } = shown(searching({}))
    expect(search).toMatchObject({ query: 'znr-780', loading: true, rows: [] })
    expect(search?.emptyLine).toBeUndefined()
  })

  it('lists what it found, Done ones included, with no next ticket among them', () => {
    const { search, next } = shown(
      searching({
        list: { connected: true, tickets: [ticket('ZNR-780', { status: 'Done' })] },
      }),
    )
    expect(search?.rows.map((r) => r.chip.label)).toEqual(['ZNR-780 · Done'])
    expect(search?.line).toBe('1 ticket')
    expect(next).toBeUndefined()
  })

  it('says so when nothing matches, in the person’s own words', () => {
    const { search } = shown(searching({ list: { connected: true, tickets: [] } }))
    expect(search?.emptyLine).toBe('No ticket matches “znr-780”.')
  })

  it('says why it failed, with no empty line, and is not being read', () => {
    const { search } = shown(searching({ readError: 'Jira is down' }))
    expect(search).toMatchObject({ readError: 'Jira is down', loading: false })
    expect(search?.emptyLine).toBeUndefined()
  })

  it('can read more of a long answer', () => {
    const { search } = shown(
      searching({ list: { connected: true, tickets: [ticket('A-1')], nextPageToken: 'p2' } }),
    )
    expect(search?.canLoadMore).toBe(true)
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
