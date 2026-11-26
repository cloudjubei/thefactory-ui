import { useState, type ReactNode } from 'react'
import {
  groupTicketsView,
  TICKET_RUN_LAYOUT_LABELS,
  TICKET_RUN_LAYOUTS,
  type GroupTicketPageState,
  type GroupTicketsState,
  type TicketRunLayout,
  type UseTicketReviewRun,
} from 'thefactory-ui/headless'
import { GroupTicketPage, GroupTicketsList, SegmentedControl } from 'thefactory-ui/web'
import TicketReviewRunCard from '../../src/web/compound/groupStories/TicketReviewRunCard'
import type { Scene } from '../showcase/types'
import {
  IN_PROGRESS_TICKETS,
  oscTickets,
  REVIEWING_COMMITS,
  REVIEWING_TICKETS,
  TABS_NOW,
} from './groupTicketTabsFixtures'
import {
  MERGE_ONE_MERGED,
  PAGE_AT_PUSH,
  PAGE_MERGING,
  PAGE_REVIEW_IN_RUN,
  PAGE_REVIEW_INLINE,
  PUSH_RUN_CARD,
  TICKET_MERGES,
  TICKET_RUNS,
  workingRunCard,
} from './ticketRunFixtures'

const noop = () => {}

type Width = 'page' | 'phone'

const framed = (width: Width, node: ReactNode) =>
  width === 'phone' ? <div className="w-[390px] max-w-full">{node}</div> : node

const REVIEWING = () => oscTickets('in-review', REVIEWING_TICKETS)
const BUILDING = () => oscTickets('in-progress', IN_PROGRESS_TICKETS)

/** The Tickets tab on fixed data, each row saying the run working it in `runLayout`. */
function Tabs({
  state,
  runLayout,
  width = 'page',
}: {
  state: GroupTicketsState
  runLayout?: TicketRunLayout
  width?: Width
}) {
  const [tab, setTab] = useState(state.tab)
  return framed(
    width,
    <GroupTicketsList
      view={groupTicketsView(
        { ...state, tab },
        TABS_NOW,
        REVIEWING_COMMITS,
        TICKET_RUNS,
        TICKET_MERGES,
      )}
      query=""
      onQueryChange={noop}
      onPickTab={setTab}
      onOpen={noop}
      onDiscuss={noop}
      onPlan={noop}
      onReview={noop}
      onDismissOffer={noop}
      onOpenStory={noop}
      onOpenRun={noop}
      onOpenSettings={noop}
      onRetry={noop}
      onLoadMore={noop}
      {...(runLayout ? { runLayout } : {})}
    />,
  )
}

function ChooseRunLayout() {
  const [runLayout, setRunLayout] = useState<TicketRunLayout>('line')
  return (
    <div className="flex flex-col gap-1">
      <div className="px-4 pt-4">
        <SegmentedControl
          ariaLabel="How a row shows its run"
          value={runLayout}
          onChange={(next) => setRunLayout(next as TicketRunLayout)}
          options={TICKET_RUN_LAYOUTS.map((value) => ({
            value,
            label: TICKET_RUN_LAYOUT_LABELS[value],
          }))}
        />
      </div>
      <Tabs state={REVIEWING()} runLayout={runLayout} />
    </div>
  )
}

/** A ticket's page with its run on top and the run's own card under it. */
function Page({
  state,
  reviewRun,
  width = 'page',
}: {
  state: GroupTicketPageState
  reviewRun?: UseTicketReviewRun
  width?: Width
}) {
  return framed(
    width,
    <GroupTicketPage
      state={state}
      onBack={noop}
      onDiscuss={noop}
      onTake={noop}
      onReview={noop}
      onOpenStory={noop}
      onOpenPartStory={noop}
      onOpenRun={noop}
      onOpenChat={noop}
      onRetry={noop}
      {...(reviewRun ? { runCard: <TicketReviewRunCard reviewRun={reviewRun} /> } : {})}
    />,
  )
}

const LAYOUT_DESCRIPTIONS: Record<TicketRunLayout, string> = {
  line: 'Recommended, the default that ships. A line under the row: the run’s dot in its badge’s tone (beating while it works), its name and where it stands in full — “Waiting for you: Approve the push”, “Merging · 1 of 2 merged · waiting for checks on compass-web-user #302” — tinted while it waits on you, with Open run at its end. Room for the whole state on a phone, the same place a reply waiting on the ticket shows.',
  chip: 'A chip among the row’s chips, in the run’s tone: the same words in one pill, cut short on a narrow row; pressing it opens the run. Compact, but a long state is cut and the chip row wraps on a phone.',
  dot: 'A dot and the words beside the row’s chips, as the Processes list says a run; pressing the words opens it. The lightest, but it reads as one more chip-row item and does not stand out when the run waits on you.',
}

export const TICKET_RUN_SCENES: Scene[] = [
  {
    id: 'ticket-runs',
    title: 'Tickets tab — the run working a ticket',
    component:
      'GroupTicketsList (runLayout, onOpenRun) · TicketRunLine · TicketRunChip · TicketRunWords',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'Every row whose ticket has a run working it says that run, live: its review run, its group story’s group run, or a part story’s own run — whichever waits on you first. A run that went well or was stopped never lingers; one that failed shows until a newer run, not once the ticket is done. Read once for the whole list from the runs every screen already keeps live, so no row reads anything of its own.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick how a row shows its run',
        description: 'The three layouts on the same In review tab, switched on the board.',
        render: () => <ChooseRunLayout />,
      },
      ...TICKET_RUN_LAYOUTS.map((runLayout) => ({
        id: `in-review-${runLayout}`,
        title: `In review: ${TICKET_RUN_LAYOUT_LABELS[runLayout]}`,
        description: LAYOUT_DESCRIPTIONS[runLayout],
        render: () => <Tabs state={REVIEWING()} runLayout={runLayout} />,
      })),
      {
        id: 'in-review-phone',
        title: 'In review on a phone, a line under the row',
        render: () => <Tabs state={REVIEWING()} width="phone" />,
      },
      {
        id: 'in-progress-group-run',
        title: 'In progress: a group story’s group run',
        description: 'OSC-412’s group story builds; its row says the group run and opens it.',
        render: () => <Tabs state={BUILDING()} />,
      },
    ],
  },
  {
    id: 'ticket-page-run',
    title: 'Ticket page — the run working it',
    component: 'GroupTicketPage (runCard) · TicketRunStrip · TicketReviewRunCard',
    group: 'Project',
    kind: 'screen',
    wide: true,
    description:
      'On top of a ticket’s page, the run working it, as its row says it, with Open run; under it the run’s own card whenever it waits on you or works — its push approval answered here as on the run’s page, its merge followed pull request by pull request. The run is found by the ticket it reviews: a review going as a run has no chat of the ticket’s. So a review whose latest round was reviewed in a run links to that run (Open run among the actions) and offers no review chat; one reviewed inline offers Open review chat.',
    states: [
      {
        id: 'at-push',
        title: 'The run waits for you to approve the push',
        render: () => <Page state={PAGE_AT_PUSH} reviewRun={PUSH_RUN_CARD} />,
      },
      {
        id: 'merging',
        title: 'The run merges: one merged, one waiting for checks',
        render: () => <Page state={PAGE_MERGING} reviewRun={workingRunCard(MERGE_ONE_MERGED)} />,
      },
      {
        id: 'review-in-run',
        title: 'Reviewed in a run: Open run, no review chat',
        description:
          'The latest round was reviewed in a run that ended: the actions link to that run, the review’s part lists its runs, and no review chat is offered — there is none.',
        render: () => <Page state={PAGE_REVIEW_IN_RUN} />,
      },
      {
        id: 'review-inline',
        title: 'Reviewed inline: Open review chat',
        description: 'No round was reviewed in a run: the actions offer the review chat.',
        render: () => <Page state={PAGE_REVIEW_INLINE} />,
      },
      {
        id: 'review-in-run-phone',
        title: 'Reviewed in a run, on a phone',
        render: () => <Page state={PAGE_REVIEW_IN_RUN} width="phone" />,
      },
      {
        id: 'merging-phone',
        title: 'The run merges, on a phone',
        render: () => (
          <Page state={PAGE_MERGING} reviewRun={workingRunCard(MERGE_ONE_MERGED)} width="phone" />
        ),
      },
    ],
  },
]
