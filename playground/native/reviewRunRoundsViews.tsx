import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { ProcessRun } from 'thefactory-tools/types'

import {
  reviewBranchRow,
  reviewPushApprovalRows,
} from '../../src/headless/utils/colleagueReviewBranchUpdates'
import { processOutsideWaitView } from '../../src/headless/utils/processOutsideWait'
import { PROCESS_OUTSIDE_WAIT_COPY } from '../../src/headless/utils/processOutsideWaitConstants'
import ToneBadge from '../../src/native/compound/chips/ToneBadge'
import { RunPushApprovalCard } from '../../src/native/compound/chat/ColleagueReviewDecisionCard'
import ReviewBranchRows from '../../src/native/compound/process/ReviewBranchRows'
import RunNeedsYouCard from '../../src/native/compound/process/RunNeedsYouCard'
import RunOutsideWaitCard from '../../src/native/compound/process/RunOutsideWaitCard'
import {
  REVIEW_RUN_PUSHED,
  REVIEW_RUN_PUSH_FAILED,
  REVIEW_RUN_PUSH_FAILS_ON_DEV,
  REVIEW_RUN_PUSH_PASSED,
  REVIEW_RUN_REPLIED,
  REVIEW_RUN_REPLIED_LONG,
  REVIEW_RUN_WAITING,
} from '../scenes/reviewRunRoundsFixtures'
import type { NativeView } from './views'

const answered = async () => true
const pending = () => new Promise<boolean>(() => undefined)
const noop = () => undefined

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', paddingVertical: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

function Stop({ run, step, children }: { run: ProcessRun; step: string; children: ReactNode }) {
  const onHold = run.park?.ask?.outside && !run.park.ask.outside.arrived
  const tone = run.park?.reason === 'gate' ? 'review' : 'on_hold'
  return (
    <RunNeedsYouCard
      tone={tone}
      where={<ToneBadge tone={tone} label={step} />}
      {...(onHold ? { label: PROCESS_OUTSIDE_WAIT_COPY.onHold } : {})}
    >
      {children}
    </RunNeedsYouCard>
  )
}

const WAITS: Record<string, { run: ProcessRun; going?: boolean; expanded?: boolean }> = {
  waiting: { run: REVIEW_RUN_WAITING },
  replied: { run: REVIEW_RUN_REPLIED },
  'replied-long': { run: REVIEW_RUN_REPLIED_LONG },
  'replied-open': { run: REVIEW_RUN_REPLIED_LONG, expanded: true },
  starting: { run: REVIEW_RUN_REPLIED, going: true },
}

function Wait({ address }: { address: URLSearchParams }) {
  const shown = WAITS[address.get('state') ?? 'waiting'] ?? WAITS.waiting!
  return (
    <Phone>
      <Stop run={shown.run} step="Wait for the developer">
        <RunOutsideWaitCard
          view={processOutsideWaitView(shown.run)!}
          onCancel={noop}
          onCarryOn={shown.going ? pending : answered}
          {...(shown.expanded ? { expanded: true } : {})}
        />
      </Stop>
    </Phone>
  )
}

function Push({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'checks-passed'
  if (state === 'pushed' || state === 'diff-open' || state === 'fails-on-dev-output') {
    const rows =
      state === 'pushed'
        ? REVIEW_RUN_PUSHED.map(reviewBranchRow)
        : reviewPushApprovalRows(
            state === 'fails-on-dev-output' ? REVIEW_RUN_PUSH_FAILS_ON_DEV : REVIEW_RUN_PUSH_PASSED,
          )
    return (
      <Phone>
        <View style={{ paddingHorizontal: 12 }}>
          <ReviewBranchRows
            rows={rows}
            diffOpen={state === 'diff-open'}
            outputOpen={state === 'fails-on-dev-output'}
          />
        </View>
      </Phone>
    )
  }
  const run =
    state === 'checks-failed'
      ? REVIEW_RUN_PUSH_FAILED
      : state === 'fails-on-dev-too'
        ? REVIEW_RUN_PUSH_FAILS_ON_DEV
        : REVIEW_RUN_PUSH_PASSED
  return (
    <Phone>
      <Stop run={run} step="Approve the push">
        <RunPushApprovalCard run={run} embedded onAnswer={answered} />
      </Stop>
    </Phone>
  )
}

/** A review run's rounds on mobile, at `?view=<id>&state=…`, as the web scenes. */
export const REVIEW_RUN_ROUNDS_VIEWS: readonly NativeView[] = [
  {
    id: 'review-run-wait',
    title: 'Review run: waiting for the developer',
    render: (a) => <Wait address={a} />,
  },
  {
    id: 'review-run-push',
    title: 'Review run: approve the push',
    render: (a) => <Push address={a} />,
  },
]
