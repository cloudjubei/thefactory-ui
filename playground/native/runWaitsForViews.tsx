import { useState, type ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import type { ProcessRun, ProcessWaitAction } from 'thefactory-tools/types'

import {
  processProposalWaitLine,
  processRunWaitView,
  processWaitConfirmView,
  processWaitForDraftsProblem,
} from '../../src/headless'
import type { ProcessWaitForDrafts } from '../../src/headless/utils/processWaitForDraftTypes'
import LaunchWaitFields from '../../src/native/compound/chat/LaunchWaitFields'
import { ProcessGroupLegCard } from '../../src/native/compound/process/ProcessGroupPipeline'
import RunWaitCard from '../../src/native/compound/process/RunWaitCard'
import {
  WAIT_AHEAD,
  WAIT_CLEARED,
  WAIT_CONTINUED,
  WAIT_DRAFTS_EMPTY,
  WAIT_DRAFTS_FILLED,
  WAIT_DRAFTS_INVALID,
  WAIT_DRAFTS_TWO,
  WAIT_GROUP_ROWS,
  WAIT_ONE_ON_BASE,
  WAIT_PROJECTS,
  WAIT_PROPOSAL,
  WAIT_STOPPED,
  WAIT_WAITING,
} from '../scenes/runWaitsForFixtures'
import type { NativeView } from './views'

const decided = async () => true
const noop = () => undefined

function Phone({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ width: 390, maxWidth: '100%', padding: 12, gap: 12 }}>{children}</View>
    </ScrollView>
  )
}

const RUNS: Record<string, ProcessRun> = {
  ahead: WAIT_AHEAD,
  waiting: WAIT_WAITING,
  'one-on-base': WAIT_ONE_ON_BASE,
  cleared: WAIT_CLEARED,
  continued: WAIT_CONTINUED,
  stopped: WAIT_STOPPED,
}

const CONFIRMS: Record<string, ProcessWaitAction> = {
  'confirm-continue': 'continue-now',
  'confirm-stop': 'stop-waiting',
}

function Card({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'waiting'
  const run = RUNS[state] ?? WAIT_WAITING
  const pending =
    state === 'continuing' ? { action: 'continue-now' as const, at: Date.now() } : undefined
  const view = processRunWaitView(run, pending ? { pending } : {})!
  return (
    <Phone>
      <RunWaitCard
        view={view}
        confirmOf={(action) => processWaitConfirmView(action, run)}
        onDecide={decided}
        {...(CONFIRMS[state] ? { confirming: CONFIRMS[state] } : {})}
      />
    </Phone>
  )
}

function Legs() {
  const [waiting, ...others] = WAIT_GROUP_ROWS
  return (
    <Phone>
      <ProcessGroupLegCard
        row={waiting!}
        delivery={undefined}
        now={0}
        onOpen={noop}
        onMarkLanded={noop}
        wait={
          <RunWaitCard
            compact
            view={processRunWaitView(WAIT_WAITING)!}
            confirmOf={(action) => processWaitConfirmView(action, WAIT_WAITING)}
            onDecide={decided}
          />
        }
      />
      {others.map((row) => (
        <ProcessGroupLegCard
          key={row.leg.id}
          row={row}
          delivery={undefined}
          now={0}
          onOpen={noop}
          onMarkLanded={noop}
        />
      ))}
    </Phone>
  )
}

const DRAFTS: Record<string, ProcessWaitForDrafts> = {
  empty: WAIT_DRAFTS_EMPTY,
  filled: WAIT_DRAFTS_FILLED,
  two: WAIT_DRAFTS_TWO,
  invalid: WAIT_DRAFTS_INVALID,
}

function Launch({ address }: { address: URLSearchParams }) {
  const state = address.get('state') ?? 'empty'
  const [drafts, setDrafts] = useState(DRAFTS[state] ?? WAIT_DRAFTS_EMPTY)
  const problem = processWaitForDraftsProblem(drafts)
  const planLine = state === 'filled' ? processProposalWaitLine(WAIT_PROPOSAL) : undefined
  return (
    <Phone>
      <LaunchWaitFields
        drafts={drafts}
        onChange={setDrafts}
        {...(problem ? { problem } : {})}
        checking={state === 'two'}
        {...(planLine ? { planLine } : {})}
        projects={WAIT_PROJECTS}
      />
    </Phone>
  )
}

/** A run's wait for other work on mobile, at `?view=<id>&state=…`, as the web scenes. */
export const RUN_WAITS_FOR_VIEWS: readonly NativeView[] = [
  { id: 'run-waits-for', title: 'Run waits for other work', render: (a) => <Card address={a} /> },
  { id: 'group-leg-waits-for', title: 'Group leg waits for other work', render: () => <Legs /> },
  {
    id: 'launch-waits-for',
    title: 'Launch: wait for other work before proof',
    render: (a) => <Launch address={a} />,
  },
]
