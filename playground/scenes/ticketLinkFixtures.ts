import {
  TicketPreviewStore,
  ticketSiteOf,
  type TicketLinksValue,
  type TicketPreview,
} from 'thefactory-ui/headless'

/** A made-up Jira site and tickets. Nothing here is read from a backend or from Jira. */
export const TICKET_SITE_URL = 'https://acme.atlassian.net'

export const ticketUrl = (key: string) => `${TICKET_SITE_URL}/browse/${key}`

export const TICKET_IN_PROGRESS: TicketPreview = {
  key: 'ZNR-780',
  summary: 'Sign-in loops when a session expires',
  url: ticketUrl('ZNR-780'),
  status: 'In Progress',
  statusCategory: 'indeterminate',
  issueType: 'Bug',
  priority: 'High',
  assignee: 'Ada Wong',
}

export const TICKET_TO_DO: TicketPreview = {
  key: 'ZNR-781',
  summary: 'Add a sign-out button to settings',
  url: ticketUrl('ZNR-781'),
  status: 'To Do',
  statusCategory: 'new',
  issueType: 'Story',
}

export const TICKET_DONE: TicketPreview = {
  key: 'ZNR-702',
  summary: 'Remember the last opened project',
  url: ticketUrl('ZNR-702'),
  status: 'Done',
  statusCategory: 'done',
  issueType: 'Task',
  priority: 'Low',
  assignee: 'Sam Okafor',
}

export const TICKET_LONG_TITLE: TicketPreview = {
  key: 'ZNR-812',
  summary:
    'When a session expires while a long upload is still running, the app signs the person out, loses the upload, and then loops between the sign-in page and the dashboard until the tab is closed',
  url: ticketUrl('ZNR-812'),
  status: 'Waiting for customer feedback',
  issueType: 'Bug',
  priority: 'Highest',
  assignee: 'Maximilian Featherstonehaugh-Zielinski',
}

const TICKETS: Record<string, TicketPreview> = Object.fromEntries(
  [TICKET_IN_PROGRESS, TICKET_TO_DO, TICKET_DONE, TICKET_LONG_TITLE].map((t) => [t.key, t]),
)

/** How the made-up Jira answers a preview: with the ticket, with a failure, or never. */
export type FakeTicketRead = 'ready' | 'failed' | 'reading'

/** A chat's ticket links over the made-up site, answering every preview one way. */
export function fakeTicketLinks(read: FakeTicketRead = 'ready'): TicketLinksValue {
  return {
    site: ticketSiteOf(TICKET_SITE_URL)!,
    previews: new TicketPreviewStore((key) => {
      const ticket = TICKETS[key]
      if (read === 'reading') return new Promise(() => undefined)
      return read === 'ready' && ticket
        ? Promise.resolve(ticket)
        : Promise.reject(new Error('Jira returned 503'))
    }),
  }
}

/** What `transitionJiraIssue` answers for a finished move. */
export const MOVE_RESULT = {
  key: 'ZNR-780',
  id: '10042',
  summary: TICKET_IN_PROGRESS.summary,
  url: ticketUrl('ZNR-780'),
  from: { status: 'In Progress', statusCategory: 'indeterminate' },
  to: { status: 'Done', statusCategory: 'done' },
  transition: 'Finish',
}

export const MOVE_ARGS = { issueKey: 'ZNR-780', transition: 'Done' }

export const MOVE_COMMENT = 'Fixed in 4.2: the session is renewed before the upload starts.'

export const MOVE_LONG_RESULT = {
  ...MOVE_RESULT,
  key: 'ZNR-812',
  summary: TICKET_LONG_TITLE.summary,
  url: ticketUrl('ZNR-812'),
  from: { status: 'Waiting for customer feedback' },
  to: { status: 'Ready for release to production', statusCategory: 'indeterminate' },
}

export const MOVE_REFUSAL =
  "'Done' is not a transition ZNR-780 can take now. Available: Start review (→ In Review), Send back (→ To Do)"

/** A message with a written ticket link, a bare one, and links that are no ticket. */
export const TICKET_MESSAGE = `I picked up [ZNR-780](${ticketUrl('ZNR-780')}) and it depends on ${ticketUrl('ZNR-781')}. The design is in [the spec](https://example.com/spec).`

export const NOT_A_TICKET_MESSAGE = `None of these is a ticket here: [ZNR-780](https://example.com/browse/ZNR-780), [the board](${TICKET_SITE_URL}/jira/software/projects/ZNR/boards/1), [a lookalike](https://acme.atlassian.net.example.com/browse/ZNR-780) and https://other.atlassian.net/browse/ZNR-780`

/** What an agent passes `proposeTicketGroupStory`. The project ids read as names: no project list is loaded. */
export const STORY_PROPOSAL_ARGS = {
  groupId: 'g-acme',
  ticketKey: 'ZNR-780',
  title: 'Renew the session before a long upload',
  description:
    'Renew the session **before** an upload starts, so a long upload never outlives it.\n\n- The backend gives uploads a renewal call.\n- Admin shows when a session was last renewed.',
  parts: [
    { projectId: 'Backend', storyId: 's-112' },
    { projectId: 'Admin', newStoryTitle: 'Show the last session renewal' },
  ],
  needs: { Admin: ['Backend'] },
}

export const STORY_PROPOSAL_CREATED = {
  groupStoryId: 'gs-41',
  groupId: 'g-acme',
  title: STORY_PROPOSAL_ARGS.title,
  description: STORY_PROPOSAL_ARGS.description,
  parts: [
    { projectId: 'Backend', storyId: 's-112', storyTitle: 'Session renewal API', needs: [] },
    {
      projectId: 'Admin',
      storyId: 's-58',
      storyTitle: 'Show the last session renewal',
      needs: ['Backend'],
    },
  ],
}

export const STORY_PROPOSAL_REFUSAL =
  'ZNR-780 is In Progress and not assigned to you, so it cannot be taken. Ask its assignee, or pick another ticket.'

export const STORY_PROPOSAL_LONG_ARGS = {
  ...STORY_PROPOSAL_ARGS,
  description: [
    'Renew the session **before** an upload starts, so a long upload never outlives it.',
    '',
    '## What changes',
    '',
    '1. The backend gives uploads a renewal call, and refuses an upload whose session cannot be renewed.',
    '2. The web app calls it before every upload over 50 MB and again every ten minutes while one runs.',
    '3. Admin shows when each session was last renewed, and by which upload.',
    '',
    '## What stays',
    '',
    'Sign-in itself, the session length, and uploads under 50 MB.',
    '',
    '```ts',
    'await renewSession({ reason: "upload" })',
    '```',
    '',
    'Out of scope: resuming an upload that was cut off. That is ZNR-812.',
  ].join('\n'),
}

export const STORY_PROPOSAL_MANY_ARGS = {
  ...STORY_PROPOSAL_ARGS,
  parts: [
    { projectId: 'Backend', storyId: 's-112' },
    { projectId: 'Shared types', newStoryTitle: 'Renewal request and answer types' },
    { projectId: 'Web' },
    { projectId: 'Desktop' },
    { projectId: 'Mobile', newStoryTitle: 'Renew before a camera roll upload' },
    { projectId: 'Admin', newStoryTitle: 'Show the last session renewal' },
    { projectId: 'Docs' },
  ],
  needs: {
    Backend: ['Shared types'],
    Web: ['Backend'],
    Desktop: ['Backend'],
    Mobile: ['Backend'],
    Admin: ['Backend'],
    Docs: ['Web', 'Admin'],
  },
}

const RENEWAL_CALL = {
  title: 'Renewal call',
  description: 'A `POST /sessions/renew` that extends a live session by its full length.',
  acceptance: '- Renews a live session and answers its new end\n- Refuses an expired session',
}
const REFUSE_UNRENEWABLE = {
  title: 'Refuse an upload that cannot renew',
  description: 'An upload whose session cannot be renewed is refused before it starts.',
  acceptance: 'An upload over 50 MB with an expired session is refused with a plain reason.',
}
const LAST_RENEWAL_COLUMN = {
  title: 'Last renewal column',
  description: 'The sessions table shows when each session was last renewed, and by which upload.',
  acceptance: '1) The column shows the time 2) Hovering it names the upload',
}
const RENEWAL_FILTER = { title: 'Filter by renewal age', description: '', acceptance: '' }

/** A proposal whose parts carry the features their stories are built from, in build order. */
export const STORY_PROPOSAL_FEATURES_ARGS = {
  ...STORY_PROPOSAL_ARGS,
  parts: [
    { projectId: 'Backend', storyId: 's-112', features: [RENEWAL_CALL, REFUSE_UNRENEWABLE] },
    {
      projectId: 'Admin',
      newStoryTitle: 'Show the last session renewal',
      features: [LAST_RENEWAL_COLUMN, RENEWAL_FILTER],
    },
  ],
}

/** The same proposal with the backend part waiting for other work before its proof. */
export const STORY_PROPOSAL_WAIT_ARGS = {
  ...STORY_PROPOSAL_FEATURES_ARGS,
  parts: [
    {
      ...STORY_PROPOSAL_FEATURES_ARGS.parts[0],
      waitsFor: [
        { label: 'Session store', pullRequestUrl: 'https://github.com/acme/backend/pull/41' },
        { label: 'Upload limits', branch: 'upload-limits' },
      ],
    },
    STORY_PROPOSAL_FEATURES_ARGS.parts[1],
  ],
}

/** A part with a long list of features, beside one with two. */
export const STORY_PROPOSAL_LONG_FEATURES_ARGS = {
  ...STORY_PROPOSAL_FEATURES_ARGS,
  parts: [
    STORY_PROPOSAL_FEATURES_ARGS.parts[0],
    {
      projectId: 'Web',
      newStoryTitle: 'Renew before long uploads',
      features: [
        'Renew before an upload starts',
        'Renew every ten minutes during an upload',
        'Show a renewal failure on the upload',
        'Retry a failed renewal once',
        'Keep the upload queue across a renewal',
        'Log each renewal for support',
        'Settings toggle for renewal',
        'Renewal in the offline queue',
        'Help page on long uploads',
      ].map((title, at) => ({
        title,
        description: `Step ${at + 1} of renewing a session around long uploads.`,
        acceptance: `- ${title} works on a 200 MB upload\n- Nothing changes for uploads under 50 MB`,
      })),
    },
  ],
  needs: { Web: ['Backend'] },
}

/** What the backend tells the agent once the story is made: the first sentence is what the card shows. */
export const STORY_PROPOSAL_READY_MESSAGE =
  'Made and linked to ZNR-780, every part’s story with its features: it is ready to run. Add nothing to it. When the person says start, call `startGroupWork` with this `groupStoryId` and the `legs` getGroupStory gives.'

/** The made story's answer: each part's features as "N/M done" text, and the message. */
export const STORY_PROPOSAL_READY = {
  ...STORY_PROPOSAL_CREATED,
  parts: STORY_PROPOSAL_CREATED.parts.map((part) => ({ ...part, features: '0/2 done' })),
  message: STORY_PROPOSAL_READY_MESSAGE,
}

/** A proposal with a part that has no features, which the backend refuses. */
export const STORY_PROPOSAL_NO_FEATURES_ARGS = {
  ...STORY_PROPOSAL_FEATURES_ARGS,
  parts: [
    STORY_PROPOSAL_FEATURES_ARGS.parts[0],
    { projectId: 'Admin', newStoryTitle: 'Show the last session renewal' },
  ],
}

export const STORY_PROPOSAL_NO_FEATURES_REFUSAL =
  'A ticket’s group story is ready to run once approved, so every part needs its features: give Admin `features` — { title, description, acceptance, context? }, in the order they are built.'
