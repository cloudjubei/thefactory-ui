import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'
import { groupTicketPageView, groupTicketUpdateLinks } from './groupTicketPage'
import { ticketRunIndex } from './ticketRunState'
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

  it('shows a pull request not read from GitHub as a plain link, and never says there is none', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        pullRequests: [
          { url: 'https://github.com/acme/coach-be/pull/418', repo: 'acme/coach-be', number: 418 },
        ],
      }),
      TABS,
      NOW,
    )
    expect(page.pullRequests).toStrictEqual([
      { url: 'https://github.com/acme/coach-be/pull/418', name: 'acme/coach-be #418' },
    ])
    expect(page.emptyLines).not.toHaveProperty('pullRequests')
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

describe('groupTicketPageView: a reply waiting on the review', () => {
  const REVIEW_CHAT = { type: 'GROUP_TOPIC', groupId: 'g1', topicId: 'review-ZNR-1' } as const
  const reviewed = (over: Partial<GroupTicketOverview> = {}) =>
    overview({
      review: {
        rounds: [
          { n: 1, startedAt: HOURS_AGO(30) },
          { n: 2, startedAt: HOURS_AGO(20) },
        ],
        openFindings: 1,
        runs: [],
      },
      updates: [
        offer('older', { kind: 'next-round', postedAt: HOURS_AGO(5), author: 'Aashan' }),
        offer('reply', {
          kind: 'next-round',
          postedAt: HOURS_AGO(1),
          author: 'Aashan',
          text: 'Pushed the fix.',
          files: 2,
          fileNames: ['a.png', 'b.png'],
        }),
        offer('started', { kind: 'next-round', state: 'started', postedAt: HOURS_AGO(0.5) }),
      ],
      chats: [
        {
          context: REVIEW_CHAT,
          chatContextId: 'review-chat',
          title: 'Review ZNR-1',
          updatedAt: HOURS_AGO(1),
        },
        {
          context: { type: 'GROUP_TOPIC', groupId: 'g1', topicId: 'ticket-ZNR-1' },
          chatContextId: 'ticket-chat',
          title: 'ZNR-1',
          updatedAt: HOURS_AGO(2),
        },
      ],
      ...over,
    })

  it('shows the newest waiting reply with the round Start begins and the commits since', () => {
    const page = groupTicketPageView('ZNR-1', reviewed(), TABS, NOW, {
      label: '3 new commits',
      tone: 'news',
    })
    expect(page.reply).toMatchObject({
      offerId: 'reply',
      who: 'Aashan replied',
      text: 'Pushed the fix.',
      filesLabel: '2 files',
      round: 3,
      startLabel: 'Start round 3',
      commits: { label: '3 new commits', tone: 'news' },
    })
    expect(page.reply?.line).toBe(`Aashan replied · ${page.reply?.when} · 3 new commits`)
    expect(page.reviewChat).toEqual(REVIEW_CHAT)
    expect(page).not.toHaveProperty('commits')
  })

  it('shows what was pushed alone when no reply waits, and names the live run holding the review', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      reviewed({
        updates: [],
        review: {
          rounds: [{ n: 1, startedAt: HOURS_AGO(3) }],
          openFindings: 0,
          runs: [
            { id: 'done', status: 'succeeded', round: 1, projectId: 'p1' },
            { id: 'live', status: 'parked', round: 1, projectId: 'p1' },
          ],
        },
      }),
      TABS,
      NOW,
      { label: 'Rewritten since review', tone: 'warn' },
    )
    expect(page).not.toHaveProperty('reply')
    expect(page.commits).toEqual({ label: 'Rewritten since review', tone: 'warn' })
    expect(page.liveRun).toEqual({ id: 'live', projectId: 'p1' })
  })

  it('says nothing when nothing was pushed and no reply waits, and has no review chat without one', () => {
    const page = groupTicketPageView('ZNR-1', reviewed({ updates: [], chats: [] }), TABS, NOW, {
      label: 'No new commits',
      tone: 'quiet',
    })
    expect(page).not.toHaveProperty('commits')
    expect(page).not.toHaveProperty('reply')
    expect(page).not.toHaveProperty('reviewChat')
    expect(page).not.toHaveProperty('liveRun')
  })

  it('starts the first round from a reply on a ticket with no review yet', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      overview({ updates: [offer('r', { kind: 'next-round' })] }),
      TABS,
      NOW,
    )
    expect(page.reply?.startLabel).toBe('Start round 1')
  })
})

describe('groupTicketPageView: the run working the ticket', () => {
  const live = (status: string, over: object = {}) =>
    ({
      id: 'live',
      projectId: 'p1',
      title: 'Review of ZNR-1, round 1',
      status,
      ticketReview: { groupId: 'g1', ticketKey: 'ZNR-1', round: 1 },
      plan: { steps: [{ id: 'merge', name: 'Merge', kind: 'action' }], loops: [] },
      loopCounts: {},
      ledger: [{ id: 'e1', stepId: 'merge', iteration: 1, status: 'running', startedAt: 1 }],
      cursor: { stepId: 'merge', iteration: 1 },
      startedAt: 1,
      updatedAt: 2,
      ...over,
    }) as unknown as ProcessRun
  const withRuns = (runs: ProcessRun[]) => ({ index: ticketRunIndex('g1', runs, []), merges: {} })
  const reviewedOnce = overview({
    review: {
      rounds: [{ n: 1, startedAt: HOURS_AGO(3) }],
      openFindings: 0,
      runs: [{ id: 'live', status: 'parked', round: 1, projectId: 'p1' }],
    },
  })

  it('says the run as the row does, live, with the run it opens', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      reviewedOnce,
      TABS,
      NOW,
      undefined,
      withRuns([live('running')]),
    )
    expect(page.run).toMatchObject({
      label: 'Review run · Merge',
      live: true,
      open: { kind: 'run', projectId: 'p1', runId: 'live' },
    })
    expect(page.liveRun).toEqual({ id: 'live', projectId: 'p1' })
    expect(page.review?.runs[0]?.status).toEqual({ label: 'Running', tone: 'running' })
  })

  it('finds a part story’s run by the group story’s parts', () => {
    const own = live('running', {
      id: 'own',
      ticketReview: undefined,
      storyId: 's1',
      projectId: 'be',
    })
    const page = groupTicketPageView(
      'ZNR-1',
      overview({
        story: { id: 'gs1', title: 'Code sign-in', parts: [{ projectId: 'be', storyId: 's1' }] },
      }),
      TABS,
      NOW,
      undefined,
      withRuns([own]),
    )
    expect(page.run?.kind).toBe('story')
  })

  it('says no run once it ended well, its status in the review part as it is now', () => {
    const page = groupTicketPageView(
      'ZNR-1',
      reviewedOnce,
      TABS,
      NOW,
      undefined,
      withRuns([live('succeeded')]),
    )
    expect(page).not.toHaveProperty('run')
    expect(page.review?.runs[0]?.status.label).toBe('Done')
    expect(page).not.toHaveProperty('liveRun')
  })
})
