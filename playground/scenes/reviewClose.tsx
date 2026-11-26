import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { FilesProvider } from 'thefactory-ui/headless'
import type {
  ColleagueReview,
  ColleagueReviewCloseOutcome,
  ProcessRun,
} from 'thefactory-tools/types'
import { processRunRevivable } from 'thefactory-tools/utils'

import { colleagueReviewCardView } from '../../src/headless/utils/colleagueReviewCard'
import { COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT } from '../../src/headless/utils/colleagueReviewCardConstants'
import type { ReviewCloseView } from '../../src/headless/utils/colleagueReviewCloseTypes'
import { processRunBadge, processRunPersonEnding } from '../../src/headless/utils/processView'
import { PROCESS_REVIVE_COPY } from '../../src/headless/utils/processViewConstants'
import ColleagueReviewCard from '../../src/web/compound/chat/ColleagueReviewCard'
import ToneBadge from '../../src/web/compound/chips/ToneBadge'
import GroupTicketPage from '../../src/web/compound/groupStories/GroupTicketPage'
import { ReviewCloseControl } from '../../src/web/compound/groupStories/ReviewCloseControl'
import ProcessPipeline from '../../src/web/compound/process/ProcessPipeline'
import { Button } from '../../src/web/primitives/Button'
import type { Scene } from '../showcase/types'
import { REVIEW_TICKET, ROUND_TWO } from './colleagueReviewFixtures'
import { OnFixtures } from './onFixtures'
import {
  CLOSE_CONTEXT,
  CLOSE_NOW,
  CLOSE_RUN_ID,
  CLOSE_RUN_ROUTES,
  CLOSE_VIEWS,
  PAGE_RESOLVED,
  REVIEW_RESOLVED,
  RUN_REMOVED,
  RUN_RESOLVED,
  RUN_RESOLVED_AFTER_FAILED,
  RUN_SELF_SETTLED,
} from './reviewCloseFixtures'
import { PAGE_AT_PUSH } from './ticketRunFixtures'

const noop = () => {}

function Frame({ children, width = 640 }: { children: ReactNode; width?: number }) {
  return (
    <div style={{ maxWidth: width }} className="p-4">
      {children}
    </div>
  )
}

function control(view: ReviewCloseView, confirmOpen?: ColleagueReviewCloseOutcome) {
  return (
    <ReviewCloseControl
      view={view}
      context={CLOSE_CONTEXT}
      onClose={noop}
      {...(confirmOpen ? { confirmOpen } : {})}
    />
  )
}

const action = (id: string, width?: number) => (
  <Frame {...(width ? { width } : {})}>{control(CLOSE_VIEWS[id]!)}</Frame>
)

/** How a closed review run reads on its page: its badge, the line under its steps, and Resume while it can be taken back up. */
function RunReading({ run }: { run: ProcessRun }) {
  const badge = processRunBadge(run, CLOSE_NOW)
  const ending = processRunPersonEnding(run)
  return (
    <Frame>
      <div className="flex flex-col items-start gap-2 rounded-md border border-(--border-subtle) bg-(--surface-raised) p-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-(--text-primary)">{run.title}</span>
          <ToneBadge tone={badge.tone}>{badge.label}</ToneBadge>
        </div>
        <div className="text-[11px] text-(--text-secondary)">{ending?.line}</div>
        {processRunRevivable(run) ? (
          <>
            <Button size="sm" variant="primary">
              {PROCESS_REVIVE_COPY.label}
            </Button>
            <div className="text-[10px] text-(--text-secondary)">{PROCESS_REVIVE_COPY.detail}</div>
          </>
        ) : null}
      </div>
    </Frame>
  )
}

function Card({ review, view }: { review: ColleagueReview; view: ReviewCloseView }) {
  return (
    <div className="w-[720px] max-w-full p-4">
      <div className="rounded-md border border-(--border-subtle) bg-(--surface-overlay) text-sm">
        <div className="px-3 py-2 font-semibold text-(--text-primary)">
          recordColleagueReviewRound
        </div>
        <div className="border-t border-(--border-subtle) bg-(--surface-base) px-3 py-2.5">
          <ColleagueReviewCard
            view={colleagueReviewCardView({ tool: 'record', review, ticketKey: REVIEW_TICKET })}
            layout={COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT}
            onDrop={noop}
            onGiven={noop}
            close={control(view)}
          />
        </div>
      </div>
    </div>
  )
}

function Page({ view, width }: { view: ReviewCloseView; width?: number }) {
  const page = (
    <GroupTicketPage
      state={view.state === 'resolved' ? PAGE_RESOLVED : PAGE_AT_PUSH}
      partFirst="review"
      onBack={noop}
      onDiscuss={noop}
      onTake={noop}
      onReview={noop}
      onOpenStory={noop}
      onOpenPartStory={noop}
      onOpenRun={noop}
      onOpenChat={noop}
      onRetry={noop}
      reviewClose={control(view)}
    />
  )
  return width ? <div style={{ width, maxWidth: '100%' }}>{page}</div> : page
}

function RunPage({ phone = false }: { phone?: boolean }) {
  return (
    <OnFixtures routes={CLOSE_RUN_ROUTES}>
      <FilesProvider>
        <MemoryRouter>
          <div
            className={`${phone ? 'h-[860px] w-[390px]' : 'h-[760px] w-full max-w-[1180px]'} overflow-auto`}
          >
            <ProcessPipeline runId={CLOSE_RUN_ID} narrow={phone} />
          </div>
        </MemoryRouter>
      </FilesProvider>
    </OnFixtures>
  )
}

export const REVIEW_CLOSE_SCENES: Scene[] = [
  {
    id: 'review-close',
    title: 'Close this review',
    component: 'ReviewCloseControl',
    group: 'Process',
    description:
      'One action, the same on the ticket’s page, its review run’s page and the review’s card. It always asks first: Resolved (handled outside Overseer, or needing nothing more — the review is kept and marked closed, its run ends as resolved, waiting updates are dismissed, and a new message from the developer can start a new round) or Remove (it should not have been started — the review, its chat and its updates are deleted and its run ends). Nothing is posted to Slack or GitHub either way. The close shows at once and is put back with why when the backend refuses; pressing again while it goes does nothing.',
    states: [
      { id: 'idle', title: 'The action', render: () => action('idle') },
      {
        id: 'confirm-resolved',
        title: 'The confirm, Resolved picked',
        description: 'What is kept and what ends, that nothing is posted, and an optional note.',
        overlay: true,
        render: () => <Frame>{control(CLOSE_VIEWS.idle!, 'resolved')}</Frame>,
      },
      {
        id: 'confirm-remove',
        title: 'The confirm, Remove picked',
        description: 'What is deleted. The confirm button turns to the danger one.',
        overlay: true,
        render: () => <Frame>{control(CLOSE_VIEWS.idle!, 'remove')}</Frame>,
      },
      {
        id: 'closing',
        title: 'Just closed',
        description: 'At once after the press, before the backend answered.',
        render: () => action('closing'),
      },
      {
        id: 'resolved',
        title: 'Resolved by you, with a note',
        render: () => action('resolved'),
      },
      {
        id: 'self-settled',
        title: 'Settled itself',
        description:
          'Every pull request was merged on GitHub by someone else while the run was stopped: the run closed itself as resolved and says why.',
        render: () => action('self-settled'),
      },
      { id: 'removed', title: 'Removed', render: () => action('removed') },
      {
        id: 'failed',
        title: 'The close failed',
        description: 'The review is back as it was, the action offered again, with why.',
        render: () => action('failed'),
      },
      { id: 'phone', title: 'On a phone', render: () => action('idle', 390) },
    ],
  },
  {
    id: 'review-close-surfaces',
    title: 'Close this review: where it sits',
    component:
      'GroupTicketPage · ColleagueReviewCard · ProcessPipeline (ReviewRunClose, RunEnding)',
    group: 'Process',
    wide: true,
    description:
      'The action under the review on the ticket’s page, under the round on the review’s card, and under the stop and its choices on the review run’s page; a closed review shows its closed line there instead. A closed review run reads Resolved (or Closed, for a removed review) on its badge and under its steps, never Failed or Abandoned, and offers Resume like any stopped run — except one that had failed before it was closed.',
    states: [
      {
        id: 'ticket-page',
        title: 'On the ticket’s page',
        render: () => <Page view={CLOSE_VIEWS.idle!} />,
      },
      {
        id: 'ticket-page-resolved',
        title: 'The ticket’s page, review resolved',
        render: () => <Page view={CLOSE_VIEWS.resolved!} />,
      },
      {
        id: 'ticket-page-phone',
        title: 'The ticket’s page on a phone',
        render: () => <Page view={CLOSE_VIEWS.idle!} width={390} />,
      },
      {
        id: 'card',
        title: 'On the review’s card',
        render: () => <Card review={ROUND_TWO} view={CLOSE_VIEWS.idle!} />,
      },
      {
        id: 'card-resolved',
        title: 'The card, review resolved',
        render: () => <Card review={REVIEW_RESOLVED} view={CLOSE_VIEWS.resolved!} />,
      },
      {
        id: 'run-page',
        title: 'On the review run’s page',
        description:
          'Under the stop and its choices, on a run whose merge could not go on: closing the review ends this run as resolved, not as failed.',
        render: () => <RunPage />,
      },
      {
        id: 'run-page-phone',
        title: 'The review run’s page on a phone',
        render: () => <RunPage phone />,
      },
      {
        id: 'run-resolved',
        title: 'The run, closed as resolved',
        render: () => <RunReading run={RUN_RESOLVED} />,
      },
      {
        id: 'run-self-settled',
        title: 'The run, settled itself',
        render: () => <RunReading run={RUN_SELF_SETTLED} />,
      },
      {
        id: 'run-removed',
        title: 'The run of a removed review',
        render: () => <RunReading run={RUN_REMOVED} />,
      },
      {
        id: 'run-resolved-after-failed',
        title: 'A run that had failed, then closed',
        description: 'It reads Resolved, and offers no Resume: there is nothing to take back up.',
        render: () => <RunReading run={RUN_RESOLVED_AFTER_FAILED} />,
      },
    ],
  },
]
