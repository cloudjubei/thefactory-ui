import type { TicketUpdateData, TicketUpdateState } from 'thefactory-ui/headless'

const API_PR = 'https://github.com/example/shop-api/pull/17'
const WEB_PR = 'https://github.com/example/shop-web/pull/42'

const POST = `:rocket: *ABC-123 Add dark mode* is ready for review

API PR: ${API_PR}
Web PR: ${WEB_PR}
Loom: https://www.loom.com/share/5e1f0a

Merge the API first, then the web.`

const CHANNEL = {
  kind: 'channel' as const,
  name: 'shop-team',
  permalink: 'https://example.slack.com/archives/C0SHOP',
}

const READY: TicketUpdateData = {
  offered: true,
  label: 'Slack Message',
  text: POST,
  channel: CHANNEL,
  problems: [],
}

const held = (
  data: TicketUpdateData,
  over: Partial<TicketUpdateState> = {},
): TicketUpdateState => ({
  data,
  readError: null,
  posting: false,
  error: null,
  ...over,
})

/** The ticket update card's states, by id, as the store would hold them. */
export const TICKET_UPDATE_STATES = {
  ready: held(READY),
  blocked: held({
    ...READY,
    text: POST.replace('https://www.loom.com/share/5e1f0a', '{{loom}}').replace(
      `Web PR: ${WEB_PR}`,
      'Web PR: {{pr:shop-web}}',
    ),
    problems: [
      'The Slack Message still has {{loom}}, {{pr:shop-web}} to fill in.',
      'The Slack Message has no link to Shop web’s pull request.',
    ],
  }),
  'no-channel': held({
    offered: true,
    label: 'Slack Message',
    text: POST,
    problems: ['The group watches no Slack channel. Set one on its Tickets tab.'],
  }),
  'not-written': held({
    offered: true,
    label: 'Slack Message',
    channel: CHANNEL,
    problems: ['The Slack Message is not written yet.'],
  }),
  thread: held({
    ...READY,
    channel: {
      kind: 'thread',
      permalink: 'https://example.slack.com/archives/C0SHOP/p1763630000000100',
    },
  }),
  posting: held(READY, { posting: true }),
  posted: held({
    ...READY,
    posted: {
      channel: 'C0SHOP',
      ts: '1763640000.000200',
      permalink: 'https://example.slack.com/archives/C0SHOP/p1763640000000200',
      postedAt: '2026-11-20T12:00:00.000Z',
    },
  }),
  refused: held(READY, {
    error: 'Slack did not post the update (Slack chat.postMessage: not_in_channel).',
  }),
} satisfies Record<string, TicketUpdateState>

export type TicketUpdateStateId = keyof typeof TICKET_UPDATE_STATES

/** What each state shows, for the scene's index. */
export const TICKET_UPDATE_STATE_TEXT: Record<
  TicketUpdateStateId,
  { title: string; description: string }
> = {
  ready: {
    title: 'Ready to post',
    description:
      'Every repo of the ticket is at its sign-off with its pull request open: the post word for word, the channel by name, and Post the ticket update.',
  },
  blocked: {
    title: 'Something stands in the way',
    description:
      'A placeholder left and a repo’s pull request link missing: each reason listed, placeholders marked in the text, and no post.',
  },
  'no-channel': {
    title: 'No channel watched',
    description: 'The group watches no Slack channel yet, so there is nowhere to post.',
  },
  'not-written': {
    title: 'The post is not written yet',
    description: 'The shared output is still to come from the outputs step.',
  },
  thread: {
    title: 'A watched thread',
    description: 'The group watches one thread: the update goes there as a reply.',
  },
  posting: {
    title: 'Posting',
    description: 'Shown at once on the confirm: a second press does nothing.',
  },
  posted: {
    title: 'Posted',
    description: 'Where it went, with the link to the message. The group then follows its thread.',
  },
  refused: {
    title: 'Slack refused it',
    description: 'Back to ready with Slack’s reason. Press again to retry.',
  },
}
