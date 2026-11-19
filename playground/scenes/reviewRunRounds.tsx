import type { ReactNode } from 'react'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  reviewBranchRow,
  reviewPushApprovalRows,
} from '../../src/headless/utils/colleagueReviewBranchUpdates'
import { processOutsideWaitView } from '../../src/headless/utils/processOutsideWait'
import { PROCESS_OUTSIDE_WAIT_COPY } from '../../src/headless/utils/processOutsideWaitConstants'
import ToneBadge from '../../src/web/compound/chips/ToneBadge'
import { RunPushApprovalCard } from '../../src/web/compound/chat/ColleagueReviewDecisionCard'
import ReviewBranchRows from '../../src/web/compound/process/ReviewBranchRows'
import RunNeedsYouCard from '../../src/web/compound/process/RunNeedsYouCard'
import RunOutsideWaitCard from '../../src/web/compound/process/RunOutsideWaitCard'
import type { Scene } from '../showcase/types'
import {
  REVIEW_RUN_PUSHED,
  REVIEW_RUN_PUSH_FAILED,
  REVIEW_RUN_PUSH_PASSED,
  REVIEW_RUN_REPLIED,
  REVIEW_RUN_REPLIED_LONG,
  REVIEW_RUN_WAITING,
} from './reviewRunRoundsFixtures'

const answered = async () => true
const pending = () => new Promise<boolean>(() => undefined)
const noop = () => undefined

function Frame({ children, width = 640 }: { children: ReactNode; width?: number }) {
  return <div style={{ maxWidth: width }}>{children}</div>
}

function Stop({
  run,
  step,
  children,
  width,
}: {
  run: ProcessRun
  step: string
  children: ReactNode
  width?: number
}) {
  const onHold = run.park?.ask?.outside && !run.park.ask.outside.arrived
  const tone = run.park?.reason === 'gate' ? 'review' : 'on_hold'
  return (
    <Frame {...(width ? { width } : {})}>
      <RunNeedsYouCard
        className=""
        tone={tone}
        where={<ToneBadge tone={tone}>{step}</ToneBadge>}
        {...(onHold ? { label: PROCESS_OUTSIDE_WAIT_COPY.onHold } : {})}
      >
        {children}
      </RunNeedsYouCard>
    </Frame>
  )
}

function wait(run: ProcessRun, opts: { going?: boolean; expanded?: boolean; width?: number } = {}) {
  const view = processOutsideWaitView(run)!
  return (
    <Stop run={run} step="Wait for the developer" {...(opts.width ? { width: opts.width } : {})}>
      <RunOutsideWaitCard
        view={view}
        embedded
        onCancel={noop}
        onCarryOn={opts.going ? pending : answered}
        {...(opts.expanded ? { expanded: true } : {})}
      />
    </Stop>
  )
}

function push(run: ProcessRun, width?: number) {
  return (
    <Stop run={run} step="Approve the push" {...(width ? { width } : {})}>
      <RunPushApprovalCard run={run} embedded onAnswer={answered} />
    </Stop>
  )
}

export const REVIEW_RUN_ROUNDS_SCENES: Scene[] = [
  {
    id: 'review-run-wait',
    title: 'Review run: waiting for the developer',
    component: 'RunOutsideWaitCard (in RunNeedsYouCard)',
    group: 'Process',
    description:
      'After the reply is posted, a review run is on hold until someone other than you answers in the update’s thread. Before that it offers only cancelling the run (the run’s own Stop, confirmed and revivable). When they answer, the run says who replied, shows what they wrote, and offers Start round N — nothing starts on its own.',
    states: [
      { id: 'waiting', title: 'Waiting for a reply', render: () => wait(REVIEW_RUN_WAITING) },
      {
        id: 'replied',
        title: 'Saif replied',
        description: 'The alert, the reply, and Start round 2.',
        render: () => wait(REVIEW_RUN_REPLIED),
      },
      {
        id: 'replied-long',
        title: 'A long reply, cut',
        render: () => wait(REVIEW_RUN_REPLIED_LONG),
      },
      {
        id: 'replied-open',
        title: 'A long reply, shown whole',
        render: () => wait(REVIEW_RUN_REPLIED_LONG, { expanded: true }),
      },
      {
        id: 'starting',
        title: 'Starting the round',
        description: 'At once after the press; a second press does nothing.',
        render: () => wait(REVIEW_RUN_REPLIED, { going: true }),
      },
      { id: 'phone', title: 'On a phone', render: () => wait(REVIEW_RUN_REPLIED, { width: 390 }) },
    ],
  },
  {
    id: 'review-run-push',
    title: 'Review run: approve the push',
    component: 'RunPushApprovalCard · ReviewBranchRows',
    group: 'Process',
    description:
      'After Approve & merge, the run brings dev into each pull request. GitHub updates a branch with no conflict; a conflict is resolved in a checkout of its own and its checks run. Then you see each resolution — the files that conflicted, the change, the checks and the diff — and choose Approve push, Send back with a note, or Stop. Nothing is pushed before you choose.',
    states: [
      {
        id: 'checks-passed',
        title: 'A resolution whose checks passed',
        render: () => push(REVIEW_RUN_PUSH_PASSED),
      },
      {
        id: 'checks-failed',
        title: 'A resolution whose checks failed',
        render: () => push(REVIEW_RUN_PUSH_FAILED),
      },
      {
        id: 'diff-open',
        title: 'The diff open',
        render: () => (
          <Frame>
            <ReviewBranchRows rows={reviewPushApprovalRows(REVIEW_RUN_PUSH_PASSED)} diffOpen />
          </Frame>
        ),
      },
      {
        id: 'pushed',
        title: 'Pushed, then merged',
        description: 'How each pull request stands once the push went and the merge followed.',
        render: () => (
          <Frame>
            <ReviewBranchRows rows={REVIEW_RUN_PUSHED.map(reviewBranchRow)} />
          </Frame>
        ),
      },
      { id: 'phone', title: 'On a phone', render: () => push(REVIEW_RUN_PUSH_PASSED, 390) },
    ],
  },
]
