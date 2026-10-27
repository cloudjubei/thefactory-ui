import type { ReactNode } from 'react'
import type {
  ProcessLedgerEntry,
  ProcessTimeBreakdown,
  ProjectCheckKnownFlake,
} from 'thefactory-tools/types'
import { processTimeDetailsView } from 'thefactory-ui/headless'
// Not on the package's public surface: the pipeline draws a checks step's list and a time chip's
// details itself. The showcase reaches into the source for them.
import TimeDetailsPanel from '../../src/web/compound/chips/TimeDetailsPanel'
import ProcessCheckList from '../../src/web/compound/process/ProcessCheckList'
import ProjectFlakesList from '../../src/web/compound/process/ProjectFlakesList'
import type { Scene } from '../showcase/types'

const NOW = 1_760_000_000_000
const MIN = 60_000
const CHECK_STEP = { kind: 'check' as const }

function frame(children: ReactNode): ReactNode {
  return (
    <div className="w-[420px] max-w-full rounded-md border border-(--border-subtle) bg-(--surface-base) p-3">
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
      summary: '17770/17770 passed',
      testCount: { total: 17770, passed: 17770, failed: 0, skipped: 0 },
      ranIn: 'host',
    },
  ],
})

/** Run 412926cb's checks: the watcher tests failed in the full suite and passed when re-run alone. */
const FLAKY_TEST_RESULT = {
  id: 'test',
  label: 'Unit tests',
  kind: 'command' as const,
  category: 'test' as const,
  status: 'passed' as const,
  durationMs: 214_000,
  summary: '17770/17770 passed — 2 tests failed in the full run and passed re-run alone',
  testCount: { total: 17770, passed: 17770, failed: 0, skipped: 0 },
  environmentNote:
    '2 tests failed in the full run and passed when their files ran again on their own (src/files/WatchBeforeScanFsHandler.test.ts) — counted as flaky, not the change’s.',
  flakyTests: [
    { suite: 'src/files/WatchBeforeScanFsHandler.test.ts', name: 'reports a write after the scan' },
    { suite: 'src/files/WatchBeforeScanFsHandler.test.ts', name: 'reports a rename' },
  ],
  ranIn: 'host' as const,
}

const FLAKY_PASSED = attempt({
  status: 'done',
  outcome: 'passed',
  endedAt: NOW,
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
    FLAKY_TEST_RESULT,
  ],
})

const FLAKY_AND_FAILED = attempt({
  status: 'done',
  outcome: 'failed',
  endedAt: NOW,
  checks: [
    {
      ...FLAKY_TEST_RESULT,
      status: 'failed',
      summary:
        '17769/17770 passed, 1 failed — 2 tests failed in the full run and passed re-run alone',
      testCount: { total: 17770, passed: 17769, failed: 1, skipped: 0 },
    },
  ],
})

const KNOWN_FLAKES: ProjectCheckKnownFlake[] = [
  {
    key: 'src/files/WatchBeforeScanFsHandler.test.ts › reports a write after the scan',
    suite: 'src/files/WatchBeforeScanFsHandler.test.ts',
    name: 'reports a write after the scan',
    message: "expected [] to include 'change src/a.ts'",
    count: 4,
    firstSeenAt: NOW - 3 * 24 * 60 * MIN,
    lastSeenAt: NOW - 25 * MIN,
    runs: ['412926cb', '56b292bf', 'ed34ace8'],
    feature: {
      storyId: 'flaky-tests',
      featureId: 'fix-watch-write',
      title: 'Fix flaky test: reports a write after the scan',
      filedAt: NOW - 25 * MIN,
    },
  },
  {
    key: 'src/files/WatchBeforeScanFsHandler.test.ts › reports a rename',
    suite: 'src/files/WatchBeforeScanFsHandler.test.ts',
    name: 'reports a rename',
    count: 1,
    firstSeenAt: NOW - 25 * MIN,
    lastSeenAt: NOW - 25 * MIN,
    runs: ['ed34ace8'],
  },
  {
    key: 'app:com.acme.sync.SyncTest',
    suite: 'com.acme.sync.SyncTest',
    module: 'app',
    count: 2,
    firstSeenAt: NOW - 2 * 24 * 60 * MIN,
    lastSeenAt: NOW - 5 * 60 * MIN,
    runs: ['c36a546e', '5d5c17ce'],
  },
]

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
        description: 'The same step once its turn came: each check’s result.',
        render: () =>
          frame(<ProcessCheckList step={CHECK_STEP} latest={WAITED_THEN_RAN} now={NOW} />),
      },
      {
        id: 'flaky-passed',
        title: 'Flaky tests, passed',
        description:
          'Tests in files the change did not touch failed in the full run and passed when their files ran again alone: the check passes, with a “2 flaky” chip naming them on hover. Nothing goes back to the developer.',
        render: () => frame(<ProcessCheckList step={CHECK_STEP} latest={FLAKY_PASSED} now={NOW} />),
      },
      {
        id: 'flaky-and-failed',
        title: 'Flaky tests beside a real failure',
        description:
          'One test still fails on its own, so the check fails — the flaky ones are taken out of its failures and only flagged.',
        render: () =>
          frame(<ProcessCheckList step={CHECK_STEP} latest={FLAKY_AND_FAILED} now={NOW} />),
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
  {
    id: 'project-known-flakes',
    title: 'Known flaky tests',
    component: 'ProjectFlakesList',
    group: 'Process',
    description:
      'Under the tests of a story’s sign-off: the project’s known flaky tests, kept with its checks — each test, its file, how many runs it was seen in and when last. Seen in 3 runs, a test gets one pending fix filed on the “Flaky tests” story.',
    states: [
      {
        id: 'with-fix-filed',
        title: 'One fix filed',
        description:
          'Three flaky tests, the most recently seen first; the one seen in 3 runs has its fix filed.',
        render: () => frame(<ProjectFlakesList flakes={KNOWN_FLAKES} now={NOW} />),
      },
    ],
  },
]
