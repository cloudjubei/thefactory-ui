import { describe, expect, it } from 'vitest'
import {
  parseTicketStatuses,
  reviewBoxOfferLine,
  reviewOfferRowView,
  reviewSettingsChangeNeeded,
  reviewSettingsShown,
  reviewSettingsView,
  reviewSourceShown,
  reviewThreadView,
  reviewThreadWorks,
  slackClientIdProblem,
  slackConnectionView,
  slackMessageLink,
  slackOAuthRedirectUrl,
  slackReviewSettingsView,
  slackWatchLinkProblem,
  startReactionName,
  ticketStatusesText,
  waitingReviewOffers,
} from './colleagueReviewSource'
import type {
  ReviewSourceSnapshot,
  ReviewSourceStatus,
  SlackConnectionEntry,
} from './colleagueReviewSourceTypes'

const NOW = Date.parse('2026-11-17T12:00:00.000Z')
const THREAD = 'https://acme.slack.com/archives/C07REVIEWS/p1763380000123456'

const slack = (over: Partial<SlackConnectionEntry> = {}): SlackConnectionEntry => ({
  id: 'slack-1',
  name: 'Slack',
  provider: 'slack',
  tokenSource: 'oauth',
  config: { clientId: '1.2', teamId: 'T1', teamName: 'Acme', userId: 'U1' },
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  hasToken: true,
  hasRefreshToken: true,
  ...over,
})

const jira = slack({ id: 'jira-1', name: 'Jira', provider: 'jira', config: {} })

const NONE: ReviewSourceStatus = {
  offering: 'ready',
  offers: { new: 0, started: 0, dismissed: 0 },
  settings: { skipTicketStatuses: [] },
}

const WATCHING: ReviewSourceStatus = {
  source: {
    provider: 'slack',
    connectionId: 'slack-1',
    permalink: THREAD,
    channel: 'C07REVIEWS',
    threadTs: '1763380000.123456',
    setAt: '2026-11-17T09:00:00.000Z',
  },
  connection: { id: 'slack-1', status: 'connected', name: 'Slack', teamName: 'Acme' },
  offering: 'ready',
  lastPoll: { at: '2026-11-17T11:58:00.000Z', outcome: 'read', replies: 3, offers: 1 },
  offers: { new: 2, started: 1, dismissed: 0 },
  settings: { skipTicketStatuses: ['Done'], startReaction: 'eyes' },
}

const snapshot = (over: Partial<ReviewSourceSnapshot> = {}): ReviewSourceSnapshot => ({
  status: WATCHING,
  readError: undefined,
  pending: undefined,
  actionError: undefined,
  ...over,
})

describe('slackOAuthRedirectUrl', () => {
  it('is the callback under the backend the client talks to', () => {
    expect(slackOAuthRedirectUrl('http://localhost:7001')).toBe(
      'http://localhost:7001/api/v1/provider-connections/oauth/callback',
    )
    expect(slackOAuthRedirectUrl('https://factory.example.com/')).toBe(
      'https://factory.example.com/api/v1/provider-connections/oauth/callback',
    )
    expect(slackOAuthRedirectUrl('https://box.example.com/backend//')).toBe(
      'https://box.example.com/backend/api/v1/provider-connections/oauth/callback',
    )
  })

  it('falls back to the default backend when the client cannot tell its address', () => {
    for (const base of [null, undefined, '', '/', '/api', 'ws://x']) {
      expect(slackOAuthRedirectUrl(base)).toBe(
        'http://localhost:7001/api/v1/provider-connections/oauth/callback',
      )
    }
  })
})

describe('slackMessageLink', () => {
  it('keeps only https links', () => {
    expect(slackMessageLink(THREAD)).toBe(THREAD)
    expect(slackMessageLink('http://acme.slack.com/x')).toBeUndefined()
    expect(slackMessageLink('javascript:alert(1)')).toBeUndefined()
    expect(slackMessageLink('not a link')).toBeUndefined()
    expect(slackMessageLink(undefined)).toBeUndefined()
  })
})

describe('slackWatchLinkProblem', () => {
  it('takes a Slack message link, a reply’s too', () => {
    expect(slackWatchLinkProblem(THREAD)).toBeUndefined()
    expect(slackWatchLinkProblem(`  ${THREAD}?thread_ts=1763380000.123456&cid=C07  `)).toBe(
      undefined,
    )
    expect(
      slackWatchLinkProblem('https://acme.enterprise.slack.com/archives/C1/p1763380000123456'),
    ).toBeUndefined()
  })

  it('takes a Slack channel link, to watch the whole channel', () => {
    expect(slackWatchLinkProblem('https://compass-zenor.slack.com/archives/C0C5MSUNC1L')).toBe(
      undefined,
    )
    expect(slackWatchLinkProblem(' https://acme.slack.com/archives/C07REVIEWS/ ')).toBeUndefined()
  })

  it('says why anything else is not one', () => {
    for (const text of [
      '',
      'https://acme.slack.com/archives',
      'https://acme.slack.com/archives/C1/x17',
      'https://example.com/archives/C1/p1763380000123456',
      'http://acme.slack.com/archives/C1/p1763380000123456',
      'https://slack.com.evil.io/archives/C1',
    ]) {
      expect(slackWatchLinkProblem(text)).toBe('That is not a link to a Slack channel or message.')
    }
  })
})

describe('reviewThreadWorks', () => {
  it('is true only for a watched thread on a working connection', () => {
    expect(reviewThreadWorks(WATCHING)).toBe(true)
    expect(reviewThreadWorks(NONE)).toBe(false)
    expect(reviewThreadWorks(undefined)).toBe(false)
    expect(
      reviewThreadWorks({
        ...WATCHING,
        connection: { id: 'slack-1', status: 'sign-in-again' },
      }),
    ).toBe(false)
    expect(reviewThreadWorks({ ...WATCHING, connection: undefined })).toBe(false)
  })
})

describe('waitingReviewOffers', () => {
  it('is how many updates wait, none before the first read', () => {
    expect(waitingReviewOffers(WATCHING)).toBe(2)
    expect(waitingReviewOffers(undefined)).toBe(0)
  })
})

describe('reviewSourceShown', () => {
  it('is the backend’s word while nothing is on its way', () => {
    expect(reviewSourceShown(WATCHING, undefined, 0)).toBe(WATCHING)
    expect(reviewSourceShown(undefined, { kind: 'clear' }, 1)).toBeUndefined()
  })

  it('shows a thread being watched at once, its last read gone', () => {
    const next = 'https://acme.slack.com/archives/C99/p1763390000000001'
    const shown = reviewSourceShown(
      WATCHING,
      { kind: 'watch', connectionId: 'slack-1', permalink: next },
      0,
    )
    expect(shown?.source?.permalink).toBe(next)
    expect(shown?.source?.connectionId).toBe('slack-1')
    expect(shown?.lastPoll).toBeUndefined()
    expect(shown?.connection).toEqual(WATCHING.connection)
  })

  it('shows a first thread on a connection it did not know yet', () => {
    const shown = reviewSourceShown(
      NONE,
      { kind: 'watch', connectionId: 'slack-2', permalink: THREAD },
      0,
    )
    expect(shown?.connection).toEqual({ id: 'slack-2', status: 'connected' })
  })

  it('shows a cleared thread gone at once, its offers kept', () => {
    const shown = reviewSourceShown(WATCHING, { kind: 'clear' }, 0)
    expect(shown?.source).toBeUndefined()
    expect(shown?.connection).toBeUndefined()
    expect(shown?.lastPoll).toBeUndefined()
    expect(shown?.offers).toEqual(WATCHING.offers)
  })

  it('takes the updates the person settled out of the waiting count, never below none', () => {
    expect(reviewSourceShown(WATCHING, undefined, 1)?.offers.new).toBe(1)
    expect(reviewSourceShown(WATCHING, undefined, 5)?.offers.new).toBe(0)
  })

  it('shows the person’s settings changes at once, over a thread change too', () => {
    expect(reviewSourceShown(WATCHING, undefined, 0, [])).toBe(WATCHING)
    const shown = reviewSourceShown(WATCHING, undefined, 0, [{ runChecksUnasked: true }])
    expect(shown?.settings).toEqual({
      skipTicketStatuses: ['Done'],
      startReaction: 'eyes',
      runChecksUnasked: true,
    })
    expect(shown?.source).toBe(WATCHING.source)
    const cleared = reviewSourceShown(WATCHING, { kind: 'clear' }, 0, [{ startReaction: '' }])
    expect(cleared?.source).toBeUndefined()
    expect(cleared?.settings).toEqual({ skipTicketStatuses: ['Done'] })
  })
})

describe('parseTicketStatuses', () => {
  it('takes comma-separated names, trimmed, empty ones left out', () => {
    expect(parseTicketStatuses(' Done ,  Won’t do,,QA ')).toEqual(['Done', 'Won’t do', 'QA'])
    expect(parseTicketStatuses('   ')).toEqual([])
    expect(parseTicketStatuses('')).toEqual([])
  })

  it('keeps the first of names that differ only in case or spaces', () => {
    expect(parseTicketStatuses('Done, done, In  Review, in review, DONE')).toEqual([
      'Done',
      'In  Review',
    ])
  })
})

describe('ticketStatusesText', () => {
  it('joins the names with a comma and a space', () => {
    expect(ticketStatusesText(['Done', 'Won’t do'])).toBe('Done, Won’t do')
    expect(ticketStatusesText([])).toBe('')
  })
})

describe('startReactionName', () => {
  it('is the emoji name, colons and spaces around it left out', () => {
    expect(startReactionName(' :eyes: ')).toBe('eyes')
    expect(startReactionName('white_check_mark')).toBe('white_check_mark')
    expect(startReactionName('::')).toBe('')
    expect(startReactionName('')).toBe('')
  })
})

describe('reviewSettingsShown', () => {
  const settings = { skipTicketStatuses: ['Done'], startReaction: 'eyes' }

  it('is the backend’s word while nothing is on its way', () => {
    expect(reviewSettingsShown(settings, [])).toBe(settings)
  })

  it('lays each change over it in order, what is left out kept', () => {
    expect(
      reviewSettingsShown(settings, [
        { skipTicketStatuses: ['Done', 'QA'] },
        { runChecksUnasked: true },
        { skipTicketStatuses: [] },
        { defaultMode: 'process' },
      ]),
    ).toEqual({
      skipTicketStatuses: [],
      startReaction: 'eyes',
      runChecksUnasked: true,
      defaultMode: 'process',
    })
  })

  it('drops a reaction cleared with an empty name', () => {
    expect(reviewSettingsShown(settings, [{ startReaction: '' }])).toEqual({
      skipTicketStatuses: ['Done'],
    })
  })

  it('starts from no settings before the first read', () => {
    expect(reviewSettingsShown(undefined, [{ startReaction: 'eyes' }])).toEqual({
      skipTicketStatuses: [],
      startReaction: 'eyes',
    })
  })
})

describe('reviewSettingsChangeNeeded', () => {
  const settings = { skipTicketStatuses: ['Done', 'QA'], startReaction: 'eyes' }

  it('is false for a change to what is set already', () => {
    expect(reviewSettingsChangeNeeded(settings, { skipTicketStatuses: ['Done', 'QA'] })).toBe(false)
    expect(reviewSettingsChangeNeeded(settings, { startReaction: 'eyes' })).toBe(false)
    expect(reviewSettingsChangeNeeded(settings, { runChecksUnasked: false })).toBe(false)
    expect(reviewSettingsChangeNeeded(settings, { defaultMode: 'inline' })).toBe(false)
    expect(
      reviewSettingsChangeNeeded(
        { ...settings, defaultMode: 'process' },
        { defaultMode: 'process' },
      ),
    ).toBe(false)
    expect(reviewSettingsChangeNeeded(settings, {})).toBe(false)
    expect(reviewSettingsChangeNeeded(undefined, { skipTicketStatuses: [] })).toBe(false)
    expect(reviewSettingsChangeNeeded(undefined, { startReaction: '' })).toBe(false)
  })

  it('is true when any part differs', () => {
    expect(reviewSettingsChangeNeeded(settings, { skipTicketStatuses: ['QA', 'Done'] })).toBe(true)
    expect(reviewSettingsChangeNeeded(settings, { skipTicketStatuses: ['Done'] })).toBe(true)
    expect(reviewSettingsChangeNeeded(settings, { startReaction: '' })).toBe(true)
    expect(reviewSettingsChangeNeeded(settings, { runChecksUnasked: true })).toBe(true)
    expect(reviewSettingsChangeNeeded(settings, { defaultMode: 'process' })).toBe(true)
    expect(
      reviewSettingsChangeNeeded(settings, { startReaction: 'eyes', runChecksUnasked: true }),
    ).toBe(true)
  })
})

describe('reviewSettingsView', () => {
  it('is nothing until the first read', () => {
    expect(reviewSettingsView(undefined)).toBeUndefined()
  })

  it('shows the statuses joined, the reaction, and whether checks run unasked', () => {
    expect(reviewSettingsView(WATCHING)).toEqual({
      skipStatuses: 'Done',
      startReaction: 'eyes',
      runChecksUnasked: false,
      defaultMode: 'inline',
    })
    expect(
      reviewSettingsView({
        ...NONE,
        settings: {
          skipTicketStatuses: ['Done', 'Won’t do'],
          runChecksUnasked: true,
          defaultMode: 'process',
        },
      }),
    ).toEqual({
      skipStatuses: 'Done, Won’t do',
      startReaction: '',
      runChecksUnasked: true,
      defaultMode: 'process',
    })
  })

  it('says why the reaction could not be added, on the last read', () => {
    expect(
      reviewSettingsView({
        ...WATCHING,
        lastPoll: {
          at: '2026-11-17T11:58:00.000Z',
          outcome: 'read',
          reactionError: 'Slack reactions.add: missing_scope',
        },
      })?.reactionError,
    ).toBe('Could not add the reaction: Slack reactions.add: missing_scope')
  })
})

describe('slackConnectionView', () => {
  it('is not connected without a Slack connection, signing in only where the server can', () => {
    expect(slackConnectionView([jira], undefined, { slack: true })).toEqual({
      kind: 'not-connected',
      canSignIn: true,
    })
    expect(slackConnectionView([], NONE, { github: true })).toEqual({
      kind: 'not-connected',
      canSignIn: false,
    })
  })

  it('names the workspace of the connection the thread is read through', () => {
    const other = slack({ id: 'slack-2', config: { teamName: 'Other' }, updatedAt: '2026-12-01' })
    expect(slackConnectionView([other, slack()], WATCHING, {})).toEqual({
      kind: 'connected',
      connectionId: 'slack-1',
      workspace: 'Acme',
    })
  })

  it('takes the newest Slack connection while no thread is watched', () => {
    const newer = slack({ id: 'slack-2', config: { teamName: 'Newer' }, updatedAt: '2026-12-01' })
    expect(slackConnectionView([slack(), newer], NONE, {})).toMatchObject({
      connectionId: 'slack-2',
      workspace: 'Newer',
    })
  })

  it('asks to sign in again when Slack refused the connection', () => {
    expect(
      slackConnectionView(
        [slack({ config: {} })],
        { ...WATCHING, connection: { id: 'slack-1', status: 'sign-in-again', teamName: 'Acme' } },
        {},
      ),
    ).toEqual({ kind: 'sign-in-again', connectionId: 'slack-1', workspace: 'Acme' })
  })

  it('falls back to the connection’s name for its workspace', () => {
    expect(slackConnectionView([slack({ config: {} })], NONE, {})).toMatchObject({
      workspace: 'Slack',
    })
  })
})

describe('reviewThreadView', () => {
  it('is none while no thread is watched', () => {
    expect(reviewThreadView(snapshot({ status: NONE }), NOW)).toEqual({ kind: 'none' })
    expect(reviewThreadView(snapshot({ status: undefined }), NOW)).toEqual({ kind: 'none' })
  })

  it('reads ready, with its last read and what it brought', () => {
    expect(reviewThreadView(snapshot(), NOW)).toEqual({
      kind: 'watching',
      permalink: THREAD,
      saving: false,
      label: 'Ready',
      tone: 'done',
      lastRead: 'Read 2 minutes ago · 3 messages · 1 new update',
      offers: '2 waiting · 1 started',
    })
  })

  it('says why no updates are offered', () => {
    const noBinding = reviewThreadView(
      snapshot({ status: { ...WATCHING, offering: 'no-ticket-binding' } }),
      NOW,
    )
    expect(noBinding).toMatchObject({
      label: 'Not offering',
      tone: 'on_hold',
      why: 'No updates are offered: this group has no Jira connection.',
    })
  })

  it('puts a connection Slack refused, or one that is gone, before the offering', () => {
    const refused = reviewThreadView(
      snapshot({
        status: {
          ...WATCHING,
          offering: 'no-ticket-binding',
          connection: { id: 'slack-1', status: 'sign-in-again' },
        },
      }),
      NOW,
    )
    expect(refused).toMatchObject({ label: 'Sign in again', tone: 'stuck' })
    expect(refused).not.toHaveProperty('why')
    expect(
      reviewThreadView(
        snapshot({ status: { ...WATCHING, connection: { id: 'slack-1', status: 'missing' } } }),
        NOW,
      ),
    ).toMatchObject({
      label: 'No connection',
      tone: 'stuck',
      why: 'The Slack connection it was read through is gone.',
    })
  })

  it('says each way a read ended', () => {
    const at = '2026-11-17T11:00:00.000Z'
    const lastRead = (poll: ReviewSourceStatus['lastPoll']) => {
      const view = reviewThreadView(snapshot({ status: { ...WATCHING, lastPoll: poll } }), NOW)
      return view.kind === 'watching' ? [view.lastRead, view.lastReadError] : []
    }
    expect(lastRead(undefined)).toEqual(['Not read yet', undefined])
    expect(lastRead({ at, outcome: 'read', replies: 0, offers: 0 })).toEqual([
      'Read 1 hour ago',
      undefined,
    ])
    expect(lastRead({ at, outcome: 'read', replies: 1 })).toEqual([
      'Read 1 hour ago · 1 message',
      undefined,
    ])
    expect(
      lastRead({ at, outcome: 'failed', error: 'conversations.replies: ratelimited' }),
    ).toEqual(['Last read failed 1 hour ago', 'conversations.replies: ratelimited'])
    expect(lastRead({ at, outcome: 'sign-in-again' })).toEqual([
      'Last read 1 hour ago: Slack asked you to sign in again',
      undefined,
    ])
    expect(lastRead({ at, outcome: 'connection-missing' })).toEqual([
      'Last read 1 hour ago: the connection is gone',
      undefined,
    ])
    expect(lastRead({ at, outcome: 'not-offering' })).toEqual([
      'Not read 1 hour ago: no updates are offered',
      undefined,
    ])
    expect(lastRead({ at, outcome: 'not-recorded' })).toEqual([
      'Read 1 hour ago: the link changed meanwhile, it is read again',
      undefined,
    ])
  })

  it('shows the person’s change on its way as saving', () => {
    const next = 'https://acme.slack.com/archives/C99/p1763390000000001'
    expect(
      reviewThreadView(
        snapshot({ pending: { kind: 'watch', connectionId: 'slack-1', permalink: next } }),
        NOW,
      ),
    ).toMatchObject({ permalink: next, saving: true, lastRead: 'Not read yet' })
  })

  it('leaves out a link that is not https', () => {
    const view = reviewThreadView(
      snapshot({
        status: { ...WATCHING, source: { ...WATCHING.source!, permalink: 'javascript:x' } },
      }),
      NOW,
    )
    expect(view).toMatchObject({ kind: 'watching', permalink: '' })
  })

  it('leaves out what it brought while it brought nothing', () => {
    const view = reviewThreadView(
      snapshot({ status: { ...WATCHING, offers: { new: 0, started: 0, dismissed: 0 } } }),
      NOW,
    )
    expect(view.kind === 'watching' && view.offers).toBeFalsy()
    const dismissedOnly = reviewThreadView(
      snapshot({ status: { ...WATCHING, offers: { new: 0, started: 0, dismissed: 4 } } }),
      NOW,
    )
    expect(dismissedOnly).toMatchObject({ offers: '4 dismissed' })
  })
})

describe('slackReviewSettingsView', () => {
  it('lets a thread be watched only once Slack is connected', () => {
    const view = slackReviewSettingsView({
      connections: [slack()],
      oauthSetup: { slack: true },
      source: snapshot({ status: NONE }),
      apiBaseUrl: 'http://localhost:7001',
      now: NOW,
    })
    expect(view).toEqual({
      connection: { kind: 'connected', connectionId: 'slack-1', workspace: 'Acme' },
      redirectUrl: 'http://localhost:7001/api/v1/provider-connections/oauth/callback',
      thread: { kind: 'none' },
      canWatch: true,
      settings: {
        skipStatuses: '',
        startReaction: '',
        runChecksUnasked: false,
        defaultMode: 'inline',
      },
      loading: false,
    })
    expect(
      slackReviewSettingsView({
        connections: [],
        oauthSetup: { slack: true },
        source: snapshot({ status: NONE }),
        apiBaseUrl: null,
        now: NOW,
      }).canWatch,
    ).toBe(false)
  })

  it('is loading until the first read, then carries what failed', () => {
    const loading = slackReviewSettingsView({
      connections: [],
      oauthSetup: {},
      source: snapshot({ status: undefined }),
      apiBaseUrl: null,
      now: NOW,
    })
    expect(loading.loading).toBe(true)
    expect(loading).not.toHaveProperty('settings')
    const failed = slackReviewSettingsView({
      connections: [slack()],
      oauthSetup: {},
      source: snapshot({
        status: undefined,
        readError: 'Could not read what is watched.',
        actionError: 'Slack cannot read that thread.',
      }),
      apiBaseUrl: null,
      now: NOW,
    })
    expect(failed).toMatchObject({
      loading: false,
      readError: 'Could not read what is watched.',
      actionError: 'Slack cannot read that thread.',
    })
  })
})

describe('reviewOfferRowView', () => {
  it('names who sent it and when, with its link', () => {
    expect(
      reviewOfferRowView(
        {
          id: 'o1',
          kind: 'first-round',
          author: 'Ana',
          postedAt: '2026-11-17T10:00:00.000Z',
          permalink: THREAD,
          state: 'new',
          files: 3,
        },
        NOW,
      ),
    ).toEqual({
      id: 'o1',
      kind: 'first-round',
      author: 'Ana',
      label: 'Update from Ana · 3 files',
      when: '2 hours ago',
      permalink: THREAD,
      dismissed: false,
    })
  })

  it('still shows an update that was put aside, saying so, with one file', () => {
    expect(
      reviewOfferRowView(
        {
          id: 'o3',
          kind: 'first-round',
          author: 'Ana',
          postedAt: '2026-11-17T10:00:00.000Z',
          permalink: THREAD,
          state: 'dismissed',
          files: 1,
        },
        NOW,
      ),
    ).toMatchObject({ label: 'Update from Ana · 1 file · dismissed', dismissed: true })
  })

  it('says a next round’s update is new, and drops a link that is not https', () => {
    expect(
      reviewOfferRowView(
        {
          id: 'o2',
          kind: 'next-round',
          author: 'Ben',
          postedAt: '2026-11-17T11:59:30.000Z',
          permalink: 'file:///etc/passwd',
          state: 'new',
          files: 0,
        },
        NOW,
      ),
    ).toEqual({
      id: 'o2',
      kind: 'next-round',
      author: 'Ben',
      label: 'New update from Ben',
      when: 'just now',
      dismissed: false,
    })
  })
})

describe('slackClientIdProblem', () => {
  it('takes a Slack app’s client id, spaces around it left out', () => {
    expect(slackClientIdProblem('1234567890.1234567890')).toBeUndefined()
    expect(slackClientIdProblem(' 1234567890.1234567890 ')).toBeUndefined()
  })

  it('says what it looks like for anything else', () => {
    for (const text of ['', 'abc', '1234567890', '12.34.56', 'xoxp-1234.5678']) {
      expect(slackClientIdProblem(text)).toBe('A client ID looks like 1234567890.1234567890.')
    }
  })
})

describe('reviewBoxOfferLine', () => {
  it('says who sent the update in Slack, and when', () => {
    expect(reviewBoxOfferLine({ author: 'Ana', postedAt: '2026-11-17T09:00:00.000Z' }, NOW)).toBe(
      'From Ana in Slack · 3 hours ago',
    )
  })
})
