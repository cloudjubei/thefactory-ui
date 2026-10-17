import type { ReactNode } from 'react'
import type { ProcessLedgerEntry, ProcessTimeBreakdown } from 'thefactory-tools/types'
import { processTimeDetailsView } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws a checks step's list and a time chip's
// details itself. The showcase reaches into the source for them.
import TimeDetailsPanel from '../../src/web/compound/chips/TimeDetailsPanel'
import ProcessCheckList from '../../src/web/compound/process/ProcessCheckList'
import type { Scene } from '../showcase/types'

const NOW = 1_760_000_000_000
const MIN = 60_000
const CHECK_STEP = { kind: 'check' as const }

function frame(children: ReactNode): ReactNode {
  return (
    <div className="w-[420px] rounded-md border border-(--border-subtle) bg-(--surface-base) p-3">
      {children}
    </div>
  )
}

function attempt(over: Partial<ProcessLedgerEntry>): ProcessLedgerEntry {
  return {
    id: 'checks-1',
    stepId: 'checks',
    iteration: 1,
    status: 'running',
    startedAt: NOW,
    ...over,
  }
}

/** A checks step of run ed34ace8's project, held behind another full suite of thefactory-tools. */
const WAITING = attempt({
  queued: {
    reason: 'Waiting for another check run of this project to finish',
    since: NOW - 4 * MIN - 12_000,
  },
})

const WAITED_THEN_RAN = attempt({
  status: 'done',
  outcome: 'passed',
  endedAt: NOW,
  queuedMs: 6 * MIN + 30_000,
  checks: [
    {
      id: 'build',
      label: 'Build',
      kind: 'command',
      category: 'build',
      status: 'passed',
      durationMs: 41_000,
      summary: 'Command succeeded',
      ranIn: 'host',
    },
    {
      id: 'test',
      label: 'Unit tests',
      kind: 'command',
      category: 'test',
      status: 'passed',
      durationMs: 190_000,
      summary: '17770/17770 passed — 4 tests timed out under load and passed re-run alone',
      testCount: { total: 17770, passed: 17770, failed: 0, skipped: 0 },
      environmentNote:
        '4 tests timed out in the full run, with the machine under load, and passed when their files ran again on their own (src/cliAgentRunner/cliAgentRunnerHelpers.test.ts) — the environment failed them, not the change.',
      ranIn: 'host',
    },
  ],
})

const CHECKS_TIME: ProcessTimeBreakdown = {
  thinkingMs: 0,
  toolMs: 0,
  systemMs: 3 * MIN + 51_000,
  otherMs: 0,
  runningMs: 0,
  waitingMs: 6 * MIN + 30_000,
  queuedMs: 6 * MIN + 30_000,
  tools: [],
}

export const PROCESS_CHECKS_SCENES: Scene[] = [
  {
    id: 'process-check-list',
    title: 'Checks step',
    component: 'ProcessCheckList, TimeDetailsPanel',
    group: 'Process',
    description:
      'A checks step under its pipeline node and in its side panel. A whole-project check runs one at a time per project, so a step can wait its turn behind another check run of the same project — that wait shows with how long it has lasted, and counts as waiting, never as the step’s work.',
    states: [
      {
        id: 'waiting-turn',
        title: 'Waiting its turn',
        description:
          'Another check run of the project holds the turn: the step says so, with how long it has waited, before any check starts.',
        render: () => frame(<ProcessCheckList step={CHECK_STEP} latest={WAITING} now={NOW} />),
      },
      {
        id: 'ran-after-waiting',
        title: 'Ran after waiting',
        description:
          'The same step once its turn came: each check’s result, the unit tests passed after tests that timed out under load passed re-run alone.',
        render: () =>
          frame(<ProcessCheckList step={CHECK_STEP} latest={WAITED_THEN_RAN} now={NOW} />),
      },
      {
        id: 'time-waited',
        title: 'Its time, the wait apart',
        description:
          'The step’s time chip details: the checks’ own work in the total, the wait for the other check run beside it and not counted.',
        render: () => {
          const view = processTimeDetailsView(CHECKS_TIME, 3 * MIN + 51_000)
          return view ? frame(<TimeDetailsPanel view={view} title="Checks" />) : null
        },
      },
    ],
  },
]
