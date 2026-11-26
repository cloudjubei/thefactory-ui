import { useMemo, useState, type ReactNode } from 'react'
import type { ColleagueReview } from 'thefactory-tools/types'
import {
  COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS,
  COLLEAGUE_REVIEW_CARD_LAYOUTS,
  COLLEAGUE_REVIEW_CARD_TEXT,
  ChatActionsProvider,
  REVIEW_START_TEXT,
  TicketLinksProvider,
  colleagueReviewCardView,
  type ChatActions,
  type ColleagueReviewCardInput,
  type ColleagueReviewCardLayout,
  type ReviewPasteBox,
} from 'thefactory-ui/headless'
import {
  ColleagueReviewCard,
  ColleagueReviewPasteBox,
  ColleagueReviewPasteForm,
  SegmentedControl,
  ToolCallCard,
} from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import {
  BOX_EMPTY,
  BOX_FAILED,
  BOX_FILLED,
  BOX_NEXT_ROUND,
  REVIEW_CHAT_ID,
  REVIEW_GROUP,
  REVIEW_REFUSAL,
  REVIEW_TICKET,
  ROUND_ONE,
  ROUND_ONE_WATCHED,
  ROUND_THREE,
  ROUND_THREE_STARTED,
  ROUND_TWO,
} from './colleagueReviewFixtures'
import { OnFixtures } from './onFixtures'
import { fakeTicketLinks } from './ticketLinkFixtures'

const noop = () => {}

const CHAT: ChatActions = {
  openReview: noop,
  reviewTargetOf: () => undefined,
  draftMessage: noop,
  groupId: REVIEW_GROUP,
  chatContextId: REVIEW_CHAT_ID,
}

/** A review chat bound to the made-up Jira. */
function InChat({ children }: { children: ReactNode }) {
  const links = useMemo(() => fakeTicketLinks('ready'), [])
  return (
    <ChatActionsProvider value={CHAT}>
      <TicketLinksProvider value={links}>{children}</TicketLinksProvider>
    </ChatActionsProvider>
  )
}

type CardOptions = Partial<ColleagueReviewCardInput> & {
  layout?: ColleagueReviewCardLayout
  openFinding?: string
  noteOpen?: { kind: 'drop' | 'given'; id: string }
  expanded?: boolean
  width?: 'chat' | 'phone'
}

/** The card as a review tool's row draws it under the row's header, from fixed data. */
function Card(options: CardOptions) {
  const { layout, openFinding, noteOpen, expanded, width = 'chat', tool = 'record' } = options
  const { layout: _l, openFinding: _f, noteOpen: _n, expanded: _e, width: _w, ...input } = options
  const view = colleagueReviewCardView({
    ...input,
    tool,
    review: 'review' in options ? options.review : ROUND_TWO,
    ticketKey: REVIEW_TICKET,
  })
  return (
    <InChat>
      <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[720px]'} max-w-full p-4`}>
        <div className="rounded-md border border-(--border-subtle) bg-(--surface-overlay) text-sm">
          <div className="px-3 py-2 font-semibold text-(--text-primary)">
            {tool === 'record' ? 'recordColleagueReviewRound' : 'readColleagueReview'}
          </div>
          <div className="border-t border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
            <ColleagueReviewCard
              view={view}
              layout={
                layout ?? (tool === 'read' ? 'summary' : COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT)
              }
              onDrop={noop}
              onGiven={noop}
              {...(openFinding ? { openFinding } : {})}
              {...(noteOpen ? { noteOpen } : {})}
              {...(expanded ? { expanded } : {})}
            />
          </div>
        </div>
      </div>
    </InChat>
  )
}

const card = (options: CardOptions = {}) => <Card {...options} />

/** The real tool row in a review chat, reading the review through its own hook from the page's fixtures. */
function LiveRow({ review }: { review: ColleagueReview }) {
  return (
    <OnFixtures
      routes={{
        '/api/v1/groups/{groupId}/tickets/{ticketKey}/review': () => review,
      }}
    >
      <InChat>
        <div className="w-[720px] max-w-full p-4">
          <ToolCallCard
            toolCall={{
              toolCallId: 't-review',
              name: 'recordColleagueReviewRound',
              arguments: { round: 2, verdict: 'changes-requested' },
            }}
            result={{ ok: true, review }}
            resultType="success"
            durationMs={1800}
          />
        </div>
      </InChat>
    </OnFixtures>
  )
}

function ChooseLayout() {
  const [layout, setLayout] = useState<ColleagueReviewCardLayout>(
    COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  )
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="Layout"
          value={layout}
          onChange={(next) => setLayout(next as ColleagueReviewCardLayout)}
          options={COLLEAGUE_REVIEW_CARD_LAYOUTS.map((value) => ({
            value,
            label: COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      {card({ layout })}
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<ColleagueReviewCardLayout, string> = {
  stacked:
    'The default that ships. The round on top with its verdict, then what became of each finding, the waits, the reply to copy, and the earlier rounds folded under it. Every finding the person may drop is in view without a press.',
  rounds:
    'A tab per round above one round at a time, the row’s own selected. Shortest when there are many rounds, but what the round before said is a press away, and the tabs crowd a phone past three rounds.',
  summary:
    'One line of what the round came to and the reply, the findings behind Show findings. The least to scroll past in a long chat, but a finding to drop takes a press to reach. Used on readColleagueReview rows, which repeat the review.',
}

const layoutStates: SceneState[] = COLLEAGUE_REVIEW_CARD_LAYOUTS.flatMap((layout) => [
  {
    id: `layout-${layout}`,
    title: COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS[layout],
    description: LAYOUT_DESCRIPTIONS[layout],
    render: () => card({ layout }),
  },
  {
    id: `layout-${layout}-phone`,
    title: `${COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS[layout]}, on a phone`,
    description: 'The small-screen width: the mobile app’s native card follows this.',
    render: () => card({ layout, width: 'phone' }),
  },
])

/** A paste box's body framed as the modal draws it, so it sits with the other states. */
function Box({ box, width = 'modal' }: { box: ReviewPasteBox; width?: 'modal' | 'phone' }) {
  const [shown, setShown] = useState(box)
  return (
    <div className={`${width === 'phone' ? 'w-[390px]' : 'w-[32rem]'} max-w-full p-4`}>
      <div className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-raised) p-4">
        <h2 className="m-0 text-[15px] font-semibold text-(--text-primary)">
          {shown.nextRound
            ? REVIEW_START_TEXT.nextTitle(shown.ticketKey)
            : REVIEW_START_TEXT.title(shown.ticketKey)}
        </h2>
        <ColleagueReviewPasteForm
          box={shown}
          onChange={(draft) => setShown({ ...shown, draft })}
          onStart={noop}
        />
      </div>
    </div>
  )
}

export const COLLEAGUE_REVIEW_SCENES: Scene[] = [
  {
    id: 'colleague-review-card',
    title: 'Colleague review',
    component: 'ColleagueReviewCard',
    group: 'Chat',
    description:
      'A ticket’s colleague review on its review chat’s tool rows (recordColleagueReviewRound, readColleagueReview), read live from the review rather than the call’s arguments: the round with its verdict, what became of each finding since the round before with its kind and state, evidence a press away, what the work waits on, and the drafted reply with Copy, for the person to post in Slack. On the latest round the person may drop an open finding or mark a wait given, each with an optional note, shown at once; what they did reads as theirs. Earlier rounds stay folded. A round that watched recordings lists them with the moments it cites, each row opening its recording. Three layouts on the board; One stack ships.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a layout',
        description: 'The three layouts on round 2, with the switch above them.',
        render: () => <ChooseLayout />,
      },
      ...layoutStates,
      {
        id: 'round-1',
        title: 'Round 1: changes requested',
        description: 'Everything found is new; two waits on named people; the reply to copy.',
        render: () => card({ review: ROUND_ONE }),
      },
      {
        id: 'recordings',
        title: 'Round 1: the recordings it watched',
        description:
          'Recordings checked, under what the round waits on: one row per recording the review watched, named by its site and numbered from the second on one site, with each moment it cites as a chip, its link, and the file it was watched from when the review fetched one. A press anywhere on a row opens the recording. A site the app does not know reads as its host; a recording nothing is cited from says so.',
        render: () => card({ review: ROUND_ONE_WATCHED }),
      },
      {
        id: 'recordings-summary',
        title: 'The recordings, on a read row',
        description:
          'The line that opens keeps them behind Show findings, with the findings and waits.',
        render: () => card({ review: ROUND_ONE_WATCHED, layout: 'summary', expanded: true }),
      },
      {
        id: 'recordings-phone',
        title: 'The recordings, on a phone',
        description: 'Chips wrap under the name; the link is cut short, never the moments.',
        render: () => card({ review: ROUND_ONE_WATCHED, width: 'phone' }),
      },
      {
        id: 'round-2',
        title: 'Round 2: some fixed, one still open, one new',
        description:
          'Fixed since last round, still open, new, no longer applies, and one the person dropped; Priya’s approval marked given by the person.',
        render: () => card(),
      },
      {
        id: 'round-2-evidence',
        title: 'A finding opened',
        description:
          'A press on a finding shows what it asks, and the evidence for where it stands.',
        render: () => card({ openFinding: 'F1' }),
      },
      {
        id: 'round-2-drop',
        title: 'Dropping a finding',
        description: 'Drop asks for an optional note in place; Enter or Drop sends it.',
        render: () => card({ noteOpen: { kind: 'drop', id: 'F2' } }),
      },
      {
        id: 'round-2-given',
        title: 'Marking a wait given',
        render: () => card({ noteOpen: { kind: 'given', id: 'W2' } }),
      },
      {
        id: 'round-2-saving',
        title: 'A drop on its way',
        description: 'Shown dropped at once, faded until the backend answers.',
        render: () =>
          card({
            pending: { drops: new Set(['F2']), givens: new Set(), posts: new Set() },
            review: {
              ...ROUND_TWO,
              findings: ROUND_TWO.findings.map((f) =>
                f.id === 'F2'
                  ? { ...f, states: [...f.states, { round: 2, state: 'dropped' as const }] }
                  : f,
              ),
            },
          }),
      },
      {
        id: 'round-2-action-failed',
        title: 'A drop that did not go through',
        description: 'Rolled back, with the backend’s reason.',
        render: () => card({ actionError: 'The review of ZNR-809 has no finding F9.' }),
      },
      {
        id: 'round-2-earlier',
        title: 'Earlier rounds opened',
        render: () => card({ expanded: true }),
      },
      {
        id: 'being-reviewed',
        title: 'A round being reviewed',
        description: 'The update is in, the agent is still at it: what this round has to check.',
        render: () => card({ review: ROUND_THREE_STARTED, round: 3 }),
      },
      {
        id: 'approve',
        title: 'Round 3: approve',
        description:
          'The last open findings fixed, the last wait given by the agent with evidence.',
        render: () => card({ review: ROUND_THREE }),
      },
      {
        id: 'older-row',
        title: 'An earlier round’s row',
        description: 'The row for round 1 once round 2 is in: no actions, and where to act.',
        render: () => card({ round: 1 }),
      },
      {
        id: 'read-row',
        title: 'A readColleagueReview row',
        description: 'A read repeats the review, so its row is the line that opens.',
        render: () => card({ tool: 'read' }),
      },
      {
        id: 'refused',
        title: 'A record the backend refused',
        description: 'What the agent was told, in place of the review.',
        render: () => card({ refusal: REVIEW_REFUSAL }),
      },
      {
        id: 'none',
        title: 'No review yet',
        render: () => card({ review: null }),
      },
      {
        id: 'loading',
        title: 'Being read',
        render: () => card({ review: undefined }),
      },
      {
        id: 'read-failed',
        title: 'Could not be read',
        render: () => card({ review: undefined, readError: COLLEAGUE_REVIEW_CARD_TEXT.readFailed }),
      },
      {
        id: 'phone',
        title: 'Round 2, on a phone',
        render: () => card({ width: 'phone' }),
      },
      {
        id: 'in-chat',
        title: 'On its tool row',
        description: 'The real row in a review chat, reading the review through its own hook.',
        render: () => <LiveRow review={ROUND_TWO} />,
      },
    ],
    controls: [
      {
        id: 'layout',
        label: 'Layout',
        kind: 'choice',
        options: COLLEAGUE_REVIEW_CARD_LAYOUTS.map((id) => ({
          id,
          label: COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS[id],
        })),
        default: COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
      },
    ],
    presets: COLLEAGUE_REVIEW_CARD_LAYOUTS.map((id) => ({
      id,
      name: COLLEAGUE_REVIEW_CARD_LAYOUT_LABELS[id],
      values: { layout: id },
    })),
    play: (values) =>
      card({
        layout: (values.layout ??
          COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT) as ColleagueReviewCardLayout,
      }),
  },
  {
    id: 'colleague-review-paste',
    title: 'Review paste box',
    component: 'ColleagueReviewPasteBox',
    group: 'Project',
    description:
      'What Review (or Next round) on a ticket opens: the colleague’s update pasted as they wrote it, and its files — attached, pasted or dropped in. Start closes it at once while the row shows the files going up and the round starting; a failure opens it again with the draft, files already sent kept, and why.',
    states: [
      { id: 'empty', title: 'Empty', render: () => <Box box={BOX_EMPTY} /> },
      {
        id: 'filled',
        title: 'An update with its files',
        description: 'Five screenshots and the call transcript, as ZNR-809’s update came.',
        render: () => <Box box={BOX_FILLED} />,
      },
      {
        id: 'next-round',
        title: 'The next round',
        render: () => <Box box={BOX_NEXT_ROUND} />,
      },
      {
        id: 'failed',
        title: 'A start that failed',
        description: 'The draft comes back with why; the files that went up are not sent again.',
        render: () => <Box box={BOX_FAILED} />,
      },
      {
        id: 'phone',
        title: 'On a phone',
        description: 'The mobile app draws it as a bottom sheet.',
        render: () => <Box box={BOX_FILLED} width="phone" />,
      },
      {
        id: 'modal',
        title: 'As the modal',
        overlay: true,
        render: () => (
          <ColleagueReviewPasteBox box={BOX_FILLED} onChange={noop} onStart={noop} onClose={noop} />
        ),
      },
    ],
  },
]
