import { describe, expect, it } from 'vitest'
import { groupTicketPageView, groupTicketUpdateLinks } from './groupTicketPage'
import type { GroupTicketOverview, GroupTicketUpdate } from './groupTicketPageTypes'
import type { GroupTicketTab } from './groupTicketTabTypes'

const NOW = Date.parse('2026-11-19T12:00:00Z')
const HOURS_AGO = (n: number) => new Date(NOW - n * 3_600_000).toISOString()

const offer = (id: string, over: Partial<GroupTicketUpdate> = {}): GroupTicketUpdate => ({
  id,
  permalink: 'https://acme.slack.com/archives/C1/p1',
  author: 'Ana',
  postedAt: HOURS_AGO(2),
  text: 'Ready: https://github.com/acme/coach-be/pull/418',
  files: 0,
  fileNames: [],
  kind: 'first-round',
  state: 'new',
  ...over,
})

const overview = (over: Partial<GroupTicketOverview> = {}): GroupTicketOverview => ({
  ticket: {
    key: 'ZNR-1',
    url: 'https://acme.atlassian.net/browse/ZNR-1',
    summary: 'Sign in with a code',
    status: 'In Review',
    statusCategory: 'indeterminate',
    priority: 'High',
    assignee: 'Kamil',
    sprint: { name: 'Sprint 14', open: true },
    description: 'People sign in with a code.',
    updatedAt: HOURS_AGO(1),
    mine: true,
  },
  tabId: 'review',
  actions: ['review', 'discuss'],
  updates: [],
  pullRequests: [],
  chats: [],
  ...over,
})

const TABS: GroupTicketTab[] = [
  {
    id: 'review',
    name: 'In review',
    statuses: ['In Review'],
    sprint: 'open',
    yours: ['replies'],
    others: ['review'],
  },
]

describe('groupTicketPageView', () => {
  it('shows the ticket with its facts, its chip and the tab it falls in', () => {
    const page = groupTicketPageView('ZNR-1', overview(), TABS, NOW)
    expect(page.key).toBe('ZNR-1')
    expect(page.summary).toBe('Sign in with a code')
    expect(page.url).toBe('https://acme.atlassian.net/browse/ZNR-1')
    expect(page.chip).toMatchObject({ label: 'ZNR-1 · In Review', statusTone: 'progress' })
    expect(page.tabName).toBe('In review')
    expect(page.facts).toEqual([
      { label: 'Status', value: 'In Review' },
      { label: 'Priority', value: 'High' },
      { label: 'Assignee', value: 'Kamil' },
      { label: 'Sprint', value: 'Sprint 14' },
      { label: 'Updated', value: '1 hour ago' },
    ])
    expect(page.description).toBe('People sign in with a code.')
    expect(page.actions).toEqual(['review', 'discuss'])
  })

  it('says who has no one, which sprint is closed or none, and a missing description', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        ticket: {
          ...overview().ticket!,
          priority: undefined,
          assignee: undefined,
          sprint: { name: 'Sprint 13', open: false },
          description: '  ',
        },
      } as Partial<GroupTicketOverview>),
      TABS,
      NOW,
    )
    expect(page.facts).toEqual([
      { label: 'Status', value: 'In Review' },
      { label: 'Assignee', value: 'Unassigned' },
      { label: 'Sprint', value: 'Sprint 13 (closed)' },
      { label: 'Updated', value: '1 hour ago' },
    ])
    expect(page.description).toBe('No description.')
    const none = groupTicketPageView(
      'ZNR-1',
      overview({ ticket: { ...overview().ticket!, sprint: undefined } }),
      TABS,
      NOW,
    )
    expect(none.facts.find((f) => f.label === 'Sprint')?.value).toBe('No sprint')
  })

  it('leaves out a Jira link that is not a web page, and a tab the group no longer has', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({ ticket: { ...overview().ticket!, url: 'javascript:alert(1)' }, tabId: 'gone' }),
      TABS,
      NOW,
    )
    expect(page.url).toBeUndefined()
    expect(page.tabName).toBeUndefined()
  })

  it('lists each update with its state, files, links and message', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        updates: [
          offer('o2', {
            kind: 'next-round',
            state: 'dismissed',
            files: 1,
            fileNames: ['shot.png'],
          }),
          offer('o1', { state: 'started', permalink: 'slack://bad' }),
        ],
      }),
      TABS,
      NOW,
    )
    expect(page.updates).toEqual([
      {
        id: 'o2',
        label: 'New update from Ana',
        when: '2 hours ago',
        state: { label: 'Dismissed', tone: 'empty' },
        files: ['shot.png'],
        links: ['https://github.com/acme/coach-be/pull/418'],
        permalink: 'https://acme.slack.com/archives/C1/p1',
      },
      {
        id: 'o1',
        label: 'Update from Ana',
        when: '2 hours ago',
        state: { label: 'Reviewed', tone: 'done' },
        files: [],
        links: ['https://github.com/acme/coach-be/pull/418'],
      },
    ])
  })

  it('shows the review’s rounds, newest first, with verdicts, replies and runs', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        review: {
          rounds: [
            {
              n: 1,
              verdict: 'changes-requested',
              startedAt: HOURS_AGO(5),
              recordedAt: HOURS_AGO(4),
              postedReply: {
                permalink: 'https://acme.slack.com/archives/C1/p2',
                postedAt: HOURS_AGO(4),
              },
            },
            { n: 2, startedAt: HOURS_AGO(1), mergedMessage: 'Merged coach-be #418' },
          ],
          openFindings: 1,
          runs: [{ id: 'r1', status: 'succeeded', round: 1, projectId: 'coach-be' }],
        },
      }),
      TABS,
      NOW,
    )
    expect(page.review).toEqual({
      rounds: [
        { n: 2, label: 'Round 2', when: 'Started 1 hour ago', merged: 'Merged coach-be #418' },
        {
          n: 1,
          label: 'Round 1',
          verdict: { label: 'Changes requested', tone: 'working' },
          when: 'Recorded 4 hours ago',
          reply: { label: 'Reply posted', permalink: 'https://acme.slack.com/archives/C1/p2' },
        },
      ],
      findings: '1 open finding',
      runs: [
        {
          id: 'r1',
          projectId: 'coach-be',
          label: 'Round 1 run',
          status: { label: 'Done', tone: 'done' },
        },
      ],
    })
  })

  it('shows each pull request by repository and number, its state and checks', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        pullRequests: [
          {
            url: 'https://github.com/acme/coach-be/pull/418',
            repo: 'coach-be',
            number: 418,
            title: 'Codes',
            state: 'open',
            checks: 'failing',
          },
          {
            url: 'https://github.com/acme/coach-web/pull/9',
            repo: 'coach-web',
            number: 9,
            title: 'Code screen',
            state: 'merged',
          },
        ],
      }),
      TABS,
      NOW,
    )
    expect(page.pullRequests).toEqual([
      {
        url: 'https://github.com/acme/coach-be/pull/418',
        name: 'coach-be #418',
        title: 'Codes',
        state: { label: 'Open', tone: 'working' },
        checks: { label: 'Checks fail', tone: 'stuck' },
      },
      {
        url: 'https://github.com/acme/coach-web/pull/9',
        name: 'coach-web #9',
        title: 'Code screen',
        state: { label: 'Merged', tone: 'done' },
      },
    ])
  })

  it('shows its story and chats, newest chat first', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        story: {
          id: 'g1',
          title: 'Codes',
          parts: [
            { projectId: 'coach-be', storyId: 's1', title: 'Codes API', status: 'in_progress' },
          ],
        },
        chats: [
          {
            context: { type: 'GROUP', groupId: 'osc' } as never,
            chatContextId: 'c1',
            title: 'Discuss',
            updatedAt: HOURS_AGO(3),
          },
          {
            context: { type: 'GROUP', groupId: 'osc' } as never,
            chatContextId: 'c2',
            title: 'Review',
            updatedAt: HOURS_AGO(1),
          },
        ],
      }),
      TABS,
      NOW,
    )
    expect(page.story).toEqual({
      id: 'g1',
      title: 'Codes',
      parts: [{ projectId: 'coach-be', storyId: 's1', title: 'Codes API', status: 'in_progress' }],
    })
    expect(page.chats.map((c) => [c.title, c.when])).toEqual([
      ['Review', '1 hour ago'],
      ['Discuss', '3 hours ago'],
    ])
  })

  it('names the parts that could not be read, and shows the rest', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({ problems: ['pullRequests', 'chats'] }),
      TABS,
      NOW,
    )
    expect(page.problems).toEqual([
      'Could not read every pull request.',
      'Could not read its chats.',
    ])
    expect(page.summary).toBe('Sign in with a code')
    expect(groupTicketPageView('ZNR-1', overview(), TABS, NOW).problems).toEqual([])
  })
})

describe('groupTicketPageView empty parts', () => {
  it('says each part it read and found empty, and nothing of a part that failed', () => {
    expect(groupTicketPageView('ZNR-1', overview(), TABS, NOW).emptyLines).toEqual({
      updates: 'No update from Slack.',
      review: 'Not reviewed yet.',
      pullRequests: 'No pull request.',
      story: 'No story yet.',
      chats: 'No chat yet.',
    })
    const failed = groupTicketPageView(
      'ZNR-1',
      overview({ problems: ['pullRequests', 'review', 'chats', 'updates', 'story'] }),
      TABS,
      NOW,
    )
    expect(failed.emptyLines).toEqual({})
  })
})

describe('groupTicketPageView without the ticket', () => {
  it('names the ticket by its key, with no facts and no description, and says why', () => {
    const { ticket: _gone, ...rest } = overview()
    const page = groupTicketPageView('ZNR-9', { ...rest, problems: ['ticket'] }, TABS, NOW)
    expect(page.key).toBe('ZNR-9')
    expect(page.summary).toBe('')
    expect(page.chip.label).toBe('ZNR-9')
    expect(page.facts).toEqual([])
    expect(page).not.toHaveProperty('description')
    expect(page.problems).toEqual(['Could not read the ticket from Jira.'])
  })

  it('leaves out when it was updated when Jira did not say', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({ ticket: { ...overview().ticket!, updatedAt: undefined } }),
      TABS,
      NOW,
    )
    expect(page.facts.map((f) => f.label)).not.toContain('Updated')
  })
})

describe('groupTicketUpdateLinks', () => {
  it('finds each web link once, without the punctuation after it', () => {
    expect(
      groupTicketUpdateLinks(
        'BE https://github.com/a/b/pull/1, FE (https://github.com/a/c/pull/2). Again https://github.com/a/b/pull/1',
      ),
    ).toEqual(['https://github.com/a/b/pull/1', 'https://github.com/a/c/pull/2'])
  })

  it('reads Slack’s <link|label> form, and finds no other kind of link', () => {
    expect(
      groupTicketUpdateLinks('see <https://x.dev/a|the PR> and ftp://x and javascript:1'),
    ).toEqual(['https://x.dev/a'])
  })

  it('keeps at most six', () => {
    const text = Array.from({ length: 9 }, (_, i) => `https://x.dev/${i}`).join(' ')
    expect(groupTicketUpdateLinks(text)).toHaveLength(6)
  })
})
