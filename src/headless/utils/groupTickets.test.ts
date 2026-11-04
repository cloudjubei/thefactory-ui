import { describe, expect, it, vi } from 'vitest'
import {
  groupRunStartedWords,
  groupStoryTicketChip,
  groupStoryTicketRef,
  groupTicketStatuses,
  pressTicketRow,
  takeNextTicketView,
  ticketChipView,
  ticketLink,
  ticketMoveDecisionOf,
  ticketMoveField,
} from './groupTickets'
import type { GroupTicket, GroupTicketsState } from './groupTicketTypes'

const ticket = (key: string, over: Partial<GroupTicket> = {}): GroupTicket => ({
  key,
  summary: `Summary of ${key}`,
  url: `https://acme.atlassian.net/browse/${key}`,
  ...over,
})

const state = (over: Partial<GroupTicketsState> = {}): GroupTicketsState => ({
  list: undefined,
  readError: null,
  loadingMore: false,
  planning: undefined,
  planError: null,
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

describe('Take next ticket', () => {
  it('shows nothing until the first read answers', () => {
    expect(takeNextTicketView(state())).toBeUndefined()
  })

  it('shows nothing for a group with no Jira', () => {
    expect(takeNextTicketView(state({ list: { connected: false, tickets: [] } }))).toBeUndefined()
  })

  it('says why when the first read failed', () => {
    expect(takeNextTicketView(state({ readError: 'Jira said no' }))).toMatchObject({
      rows: [],
      readError: 'Jira said no',
    })
    expect(takeNextTicketView(state({ readError: 'Jira said no' }))?.noNextLine).toBeUndefined()
  })

  it('names the next ticket and keeps board order, with what already has work', () => {
    const view = takeNextTicketView(
      state({
        list: {
          connected: true,
          nextTicketKey: 'ENG-8',
          tickets: [
            ticket('ENG-7', { status: 'In Progress', groupStory: { id: 'gs1', title: 'Totals' } }),
            ticket('ENG-8', { status: 'To Do', priority: 'High' }),
            ticket('ENG-9'),
          ],
        },
      }),
    )
    expect(view?.rows.map((r) => r.key)).toEqual(['ENG-7', 'ENG-8', 'ENG-9'])
    expect(view?.next).toMatchObject({
      key: 'ENG-8',
      summary: 'Summary of ENG-8',
      priority: 'High',
      hint: 'Plan ENG-8',
    })
    expect(view?.rows[0]).toMatchObject({
      work: { id: 'gs1', title: 'Totals' },
      hint: 'Open “Totals”',
    })
    expect(view?.sprintLine).toBe('3 tickets · 1 has work')
    expect(view?.noNextLine).toBeUndefined()
  })

  it('counts one ticket, and more with work, in plain words', () => {
    const one = takeNextTicketView(
      state({ list: { connected: true, nextTicketKey: 'A-1', tickets: [ticket('A-1')] } }),
    )
    expect(one?.sprintLine).toBe('1 ticket')
    const two = takeNextTicketView(
      state({
        list: {
          connected: true,
          tickets: [
            ticket('A-1', { groupStory: { id: 'a', title: 'A' } }),
            ticket('A-2', { groupStory: { id: 'b', title: 'B' } }),
          ],
        },
      }),
    )
    expect(two?.sprintLine).toBe('2 tickets · 2 have work')
  })

  it('says every ticket has work when none is next', () => {
    const view = takeNextTicketView(
      state({
        list: {
          connected: true,
          tickets: [ticket('A-1', { groupStory: { id: 'a', title: 'A' } })],
        },
      }),
    )
    expect(view?.next).toBeUndefined()
    expect(view?.noNextLine).toBe('Every ticket in your sprint has work.')
  })

  it('says so when nothing is assigned', () => {
    const view = takeNextTicketView(state({ list: { connected: true, tickets: [] } }))
    expect(view?.rows).toEqual([])
    expect(view?.sprintLine).toBe('')
    expect(view?.noNextLine).toBe('Nothing is assigned to you in the open sprint.')
  })

  it('offers more only while Jira has more, and says when it is reading them', () => {
    const list = { connected: true, tickets: [ticket('A-1')], nextPageToken: 'p2' }
    expect(takeNextTicketView(state({ list }))).toMatchObject({
      canLoadMore: true,
      loadingMore: false,
    })
    expect(takeNextTicketView(state({ list, loadingMore: true }))?.loadingMore).toBe(true)
    expect(
      takeNextTicketView(state({ list: { connected: true, tickets: [ticket('A-1')] } }))
        ?.canLoadMore,
    ).toBe(false)
  })

  it('marks the ticket being planned and says why a plan did not start', () => {
    const view = takeNextTicketView(
      state({
        list: { connected: true, nextTicketKey: 'A-1', tickets: [ticket('A-1'), ticket('A-2')] },
        planning: 'A-1',
        planError: 'Already linked',
      }),
    )
    expect(view?.planning).toBe(true)
    expect(view?.next?.planning).toBe(true)
    expect(view?.rows[1]?.planning).toBe(false)
    expect(view?.planError).toBe('Already linked')
  })

  it('keeps the list on screen when a later read fails', () => {
    const view = takeNextTicketView(
      state({ list: { connected: true, tickets: [ticket('A-1')] }, readError: 'Jira is down' }),
    )
    expect(view?.rows).toHaveLength(1)
    expect(view?.readError).toBe('Jira is down')
  })
})

describe('pressing a sprint row', () => {
  const handlers = () => ({ onOpenStory: vi.fn(), onPlan: vi.fn() })

  it('opens the group story of a row with work', () => {
    const on = handlers()
    pressTicketRow({ key: 'A-1', work: { id: 'gs1', title: 'A' } }, false, on)
    expect(on.onOpenStory).toHaveBeenCalledWith('gs1')
    expect(on.onPlan).not.toHaveBeenCalled()
  })

  it('still opens one while a plan is starting', () => {
    const on = handlers()
    pressTicketRow({ key: 'A-1', work: { id: 'gs1', title: 'A' } }, true, on)
    expect(on.onOpenStory).toHaveBeenCalledWith('gs1')
  })

  it('starts the plan of a row with none', () => {
    const on = handlers()
    pressTicketRow({ key: 'A-1' }, false, on)
    expect(on.onPlan).toHaveBeenCalledWith('A-1')
    expect(on.onOpenStory).not.toHaveBeenCalled()
  })

  it('starts no second plan while one is starting', () => {
    const on = handlers()
    pressTicketRow({ key: 'A-1' }, true, on)
    expect(on.onPlan).not.toHaveBeenCalled()
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
