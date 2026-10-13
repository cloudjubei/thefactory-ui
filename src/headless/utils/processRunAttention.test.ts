import { describe, expect, it } from 'vitest'
import type {
  ProcessLedgerEntry,
  ProcessPark,
  ProcessRun,
  ProcessWaitingAsk,
} from 'thefactory-tools/types'

import {
  processRunAttentionSection,
  processRunAttentionSections,
  processRunListRow,
  processRunNeedLine,
  processRunWaitingCount,
} from './processRunAttention'
import { PROCESS_RUN_WAITING_TITLE } from './processRunAttentionConstants'
import { processRunBadge } from './processView'

const SHA = 'a'.repeat(40)

const entry = (stepId: string, over: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: `${stepId}-${over.iteration ?? 1}-${Math.random()}`,
  stepId,
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 0,
  ...over,
})

const run = (over: Partial<ProcessRun> = {}): ProcessRun => ({
  id: 'r',
  projectId: 'p',
  title: 'Let unit tests watch their files',
  status: 'running',
  loopCounts: {},
  ledger: [],
  startedAt: 0,
  updatedAt: 0,
  workBranch: { name: 'factory/watch', baseRef: 'main', baseSha: SHA },
  plan: {
    definitionId: 'story',
    definitionScope: 'global',
    definitionVersion: 1,
    name: 'Story',
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      { id: 'checks', name: 'Checks', kind: 'check' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
    frozenAt: 0,
  },
  ...over,
})

const parked = (park: Partial<ProcessPark>, over: Partial<ProcessRun> = {}): ProcessRun =>
  run({
    status: 'parked',
    park: { reason: 'step-failed', message: 'Stopped.', parkedAt: 0, ...park },
    ...over,
  })

const ask = (over: Partial<ProcessWaitingAsk>): ProcessWaitingAsk => ({
  kind: 'question',
  agent: 'developer',
  title: 'The developer has a question',
  detail: 'Which branch should it merge?',
  ...over,
})

const approved = (over: Partial<ProcessRun> = {}): ProcessRun =>
  run({
    status: 'succeeded',
    ledger: [
      entry('sign-off', {
        override: { choice: 'approve', at: 1, integration: 'merge' },
      }),
    ],
    ...over,
  })

const changesRequested = (note?: string): ProcessRun =>
  run({
    status: 'failed',
    ledger: [
      entry('implement'),
      entry('sign-off', {
        outcome: 'failed',
        override: { choice: 'request-changes', at: 1, ...(note ? { note } : {}) },
      }),
    ],
  })

describe('processRunAttentionSection', () => {
  it('puts a run stopped on a question, an approval or a failure under Needs you', () => {
    expect(processRunAttentionSection(parked({ reason: 'step-waiting', ask: ask({}) }))).toBe(
      'needs-you',
    )
    expect(processRunAttentionSection(parked({ reason: 'loop-exhausted', stepId: 'verify' }))).toBe(
      'needs-you',
    )
  })

  it('puts a run at its gate under Sign off', () => {
    expect(processRunAttentionSection(parked({ reason: 'gate', stepId: 'sign-off' }))).toBe(
      'sign-off',
    )
  })

  it('puts a working or starting run under Running', () => {
    expect(processRunAttentionSection(run({ status: 'running' }))).toBe('running')
    expect(processRunAttentionSection(run({ status: 'pending' }))).toBe('running')
  })

  it('puts approved work being merged under Merging', () => {
    expect(
      processRunAttentionSection(
        approved({ integration: { mode: 'merge', status: 'integrating', at: 2 } }),
      ),
    ).toBe('merging')
  })

  it('puts approved work that was not merged under Needs you — someone has to try again', () => {
    expect(
      processRunAttentionSection(
        approved({ integration: { mode: 'merge', status: 'failed', at: 2 } }),
      ),
    ).toBe('needs-you')
    expect(processRunAttentionSection(approved())).toBe('needs-you')
  })

  it('puts a run ended on a request for changes it can still be sent back for under Needs you', () => {
    expect(processRunAttentionSection(changesRequested('Fix it'))).toBe('needs-you')
  })

  it.each([
    ['merged', approved({ integration: { mode: 'merge', status: 'integrated', at: 2 } })],
    ['failed on its own', run({ status: 'failed' })],
    ['cancelled', run({ status: 'cancelled' })],
    ['finished with nothing to bring in', run({ status: 'succeeded', workBranch: undefined })],
  ])('has no section for a run that is %s — it is history', (_, r) => {
    expect(processRunAttentionSection(r)).toBeUndefined()
  })
})

describe('processRunNeedLine — Needs you', () => {
  it('asks for the answer to the question, read from what the agent asked', () => {
    const r = parked({
      reason: 'step-waiting',
      ask: ask({
        detail: 'Which branch should it merge?\n\nBackground: two candidates.',
        request: {
          actionId: 'a1',
          actionKind: 'question',
          args: { question: 'Which branch to merge?', context: 'Two candidates.' },
        },
      }),
    })
    expect(processRunNeedLine(r)).toBe('Answer: Which branch to merge?')
  })

  it('falls back to the first line of the agent’s words when the question has no arguments', () => {
    const r = parked({
      reason: 'step-waiting',
      ask: ask({ detail: '  Keep the old “Add” button?\n\nIt is used twice.' }),
    })
    expect(processRunNeedLine(r)).toBe('Answer: Keep the old “Add” button?')
  })

  it.each([
    [
      { actionKind: 'network-unlock', host: 'api.example.com' },
      'Approve: network access to api.example.com',
    ],
    [
      { actionKind: 'install-package', packageName: 'left-pad', ecosystem: 'npm' },
      'Approve: install left-pad',
    ],
    [
      { actionKind: 'external-fetch', url: 'https://example.com/a' },
      'Approve: fetch https://example.com/a',
    ],
    [{ actionKind: 'workspace-limit-raise' }, 'Approve: more workspace space'],
    [
      { actionKind: 'host-tool', toolName: 'mcp__thefactory__pushWorkBranch' },
      'Approve: push work branch',
    ],
    [{ actionKind: 'host-tool' }, 'Approve: host tool'],
  ])('asks for the approval the agent is waiting on (%o)', (request, line) => {
    const r = parked({
      reason: 'step-waiting',
      ask: ask({
        kind: 'permission',
        title: 'The developer needs your approval',
        detail: 'Needed to go on.',
        request: { actionId: 'a1', ...request },
      }),
    })
    expect(processRunNeedLine(r)).toBe(line)
  })

  it('asks to unblock an agent that is blocked, in its own words', () => {
    const r = parked({
      reason: 'step-waiting',
      ask: ask({ kind: 'blocker', detail: 'The emulator will not boot.\n\nWhat it tried: x' }),
    })
    expect(processRunNeedLine(r)).toBe('Unblock: The emulator will not boot.')
  })

  it('reads the ask a story run mirrors from its feature’s run', () => {
    const r = parked({
      reason: 'step-waiting',
      stepId: 'implement',
      childRunId: 'child',
      ask: ask({ detail: 'Which file?' }),
    })
    expect(processRunNeedLine(r)).toBe('Answer: Which file?')
  })

  it('counts the attempts of a step that failed more than once', () => {
    const r = parked(
      { reason: 'step-failed', stepId: 'verify' },
      {
        ledger: [
          entry('verify', { outcome: 'failed' }),
          entry('verify', { iteration: 2, outcome: 'failed' }),
        ],
      },
    )
    expect(processRunNeedLine(r)).toBe('Decide: failed twice on Verify')
    const thrice = parked(
      { reason: 'step-failed', stepId: 'verify' },
      {
        ledger: [1, 2, 3].map((iteration) => entry('verify', { iteration, outcome: 'failed' })),
      },
    )
    expect(processRunNeedLine(thrice)).toBe('Decide: failed 3 times on Verify')
  })

  it.each([
    [{ reason: 'step-failed' as const, stepId: 'verify' }, 'Decide: Verify did not pass'],
    [{ reason: 'loop-exhausted' as const, stepId: 'verify' }, 'Decide: Verify kept failing'],
    [
      { reason: 'step-errored' as const, stepId: 'implement' },
      'Decide: Implement did not complete',
    ],
    [{ reason: 'step-unchecked' as const, stepId: 'verify' }, 'Decide: Verify checked nothing'],
    [{ reason: 'turn-limit' as const, stepId: 'implement' }, 'Decide: Implement ran out of turns'],
    [{ reason: 'budget-spent' as const, stepId: 'implement' }, 'Decide: the budget is spent'],
    [{ reason: 'time-spent' as const, stepId: 'implement' }, 'Decide: the time limit is up'],
    [
      { reason: 'no-steps' as const, message: 'This process has no steps switched on.' },
      'Decide: This process has no steps switched on.',
    ],
  ])('names the decision a stopped step leaves (%o)', (park, line) => {
    expect(processRunNeedLine(parked(park))).toBe(line)
  })

  it('says a step that failed once did not pass, without counting', () => {
    const r = parked(
      { reason: 'step-failed', stepId: 'verify' },
      { ledger: [entry('verify', { outcome: 'failed' })] },
    )
    expect(processRunNeedLine(r)).toBe('Decide: Verify did not pass')
  })

  it('names the base branch a conflict is with', () => {
    const r = parked({
      reason: 'step-failed',
      stepId: 'checks',
      baseConflict: { baseRef: 'develop', baseSha: SHA, commits: 3, paths: ['a.ts'] },
    })
    expect(processRunNeedLine(r)).toBe('Decide: conflicts with develop')
  })

  it('asks to try the merge again when approved work was not merged', () => {
    expect(
      processRunNeedLine(approved({ integration: { mode: 'merge', status: 'failed', at: 2 } })),
    ).toBe('Retry: not merged into main')
    expect(processRunNeedLine(approved())).toBe('Retry: not merged into main')
    expect(
      processRunNeedLine(
        approved({ integration: { mode: 'pull-request', status: 'failed', at: 2 } }),
      ),
    ).toBe('Retry: the pull request was not opened')
  })

  it('says it without git words for a project with no git of its own', () => {
    expect(
      processRunNeedLine(
        approved({
          workBranch: { name: 'factory/watch', baseRef: 'main', baseSha: SHA, shadow: true },
          integration: { mode: 'merge', status: 'failed', at: 2 },
        }),
      ),
    ).toBe('Retry: not brought into the project folder')
  })

  it('asks to send back the changes a person requested, with their words', () => {
    expect(processRunNeedLine(changesRequested('Fix the format.'))).toBe(
      'Send back: “Fix the format.”',
    )
    expect(processRunNeedLine(changesRequested())).toBe('Send back: your requested changes')
  })
})

describe('processRunNeedLine — Sign off', () => {
  const atGate = (ledger: ProcessLedgerEntry[]) =>
    parked({ reason: 'gate', stepId: 'sign-off' }, { ledger })

  const check = (status: 'passed' | 'failed' | 'skipped' | 'error', id: string = status) => ({
    id,
    label: id,
    kind: 'command' as const,
    status,
    durationMs: 1,
    summary: status,
  })

  it('says how the checks and the code review came out', () => {
    expect(
      processRunNeedLine(
        atGate([
          entry('checks', { checks: [check('passed', 'a'), check('passed', 'b')] }),
          entry('code-review', { review: { verdict: 'approved' } }),
        ]),
      ),
    ).toBe('Checks 2/2 · review clean')
  })

  it('leaves skipped checks out of the count and counts a failure against it', () => {
    expect(
      processRunNeedLine(
        atGate([
          entry('checks', {
            checks: [check('passed', 'a'), check('failed', 'b'), check('skipped', 'c')],
          }),
        ]),
      ),
    ).toBe('Checks 1/2')
  })

  it('says what the review asked for when it did not approve', () => {
    expect(
      processRunNeedLine(
        atGate([entry('code-review', { review: { verdict: 'changes-requested' } })]),
      ),
    ).toBe('Review asks for changes')
    expect(
      processRunNeedLine(atGate([entry('code-review', { review: { verdict: 'rejected' } })])),
    ).toBe('Review rejects it')
  })

  it('reads the newest review and checks, not an earlier attempt’s', () => {
    expect(
      processRunNeedLine(
        atGate([
          entry('checks', { checks: [check('failed', 'a')] }),
          entry('code-review', { review: { verdict: 'changes-requested' } }),
          entry('checks', { iteration: 2, checks: [check('passed', 'a')] }),
          entry('code-review', { iteration: 2, review: { verdict: 'approved' } }),
        ]),
      ),
    ).toBe('Checks 1/1 · review clean')
  })

  it('reads the review only from a review step, never a verdict another step carries', () => {
    expect(
      processRunNeedLine(
        atGate([
          entry('code-review', { review: { verdict: 'approved' } }),
          entry('verify', { review: { verdict: 'rejected' } }),
        ]),
      ),
    ).toBe('Review clean')
  })

  it('says it is ready for a decision when nothing was checked or reviewed', () => {
    expect(processRunNeedLine(atGate([]))).toBe('Ready for your decision')
  })
})

describe('processRunNeedLine — Running and Merging', () => {
  it('names the step it is on', () => {
    const r = run({
      cursor: { stepId: 'implement', iteration: 1 },
      ledger: [entry('implement', { status: 'running', outcome: undefined })],
    })
    expect(processRunNeedLine(r)).toBe('Implement')
  })

  it('names the attempt when the step is on its second or later', () => {
    const r = run({
      cursor: { stepId: 'implement', iteration: 2 },
      ledger: [
        entry('implement'),
        entry('verify', { outcome: 'failed' }),
        entry('implement', { iteration: 2, status: 'running', outcome: undefined }),
      ],
    })
    expect(processRunNeedLine(r)).toBe('Implement · attempt 2')
  })

  it('says a run with no step yet is starting', () => {
    expect(processRunNeedLine(run({ status: 'pending' }))).toBe('Starting')
  })

  it('says where approved work is being merged', () => {
    expect(
      processRunNeedLine(
        approved({ integration: { mode: 'merge', status: 'integrating', at: 2 } }),
      ),
    ).toBe('Merging into main…')
    expect(
      processRunNeedLine(
        approved({
          workBranch: { name: 'factory/watch', baseRef: 'main', baseSha: SHA, shadow: true },
          integration: { mode: 'merge', status: 'integrating', at: 2 },
        }),
      ),
    ).toBe('Bringing the work into the project folder…')
  })
})

describe('processRunNeedLine — history', () => {
  it('is nothing for a run that is done', () => {
    expect(processRunNeedLine(run({ status: 'cancelled' }))).toBeUndefined()
  })
})

describe('processRunListRow', () => {
  it('titles a row by the run’s own title, never its step chain', () => {
    expect(processRunListRow(run()).title).toBe('Let unit tests watch their files')
  })

  it('falls back to the step chain only when the run has no title', () => {
    expect(processRunListRow(run({ title: '  ' })).title).toBe(
      'Implement → Verify → Checks → Code review → Sign-off',
    )
  })

  it('carries what the run needs, emphasised when it asks something of the person', () => {
    const row = processRunListRow(parked({ reason: 'step-waiting', ask: ask({}) }))
    expect(row).toMatchObject({
      section: 'needs-you',
      line: 'Answer: Which branch should it merge?',
      asks: true,
      live: false,
      tone: 'on_hold',
    })
  })

  it('draws a running or merging run as live, and its line as plain', () => {
    expect(processRunListRow(run({ status: 'pending' }))).toMatchObject({ live: true, asks: false })
    expect(
      processRunListRow(approved({ integration: { mode: 'merge', status: 'integrating', at: 2 } })),
    ).toMatchObject({ live: true, asks: false, section: 'merging' })
    expect(processRunListRow(parked({ reason: 'gate', stepId: 'sign-off' }))).toMatchObject({
      live: false,
      asks: false,
      tone: 'review',
    })
  })

  it('says a done run’s status and how far it got', () => {
    expect(processRunListRow(run({ status: 'failed' }))).toMatchObject({
      line: 'Failed · 0/5 steps',
      tone: 'stuck',
      asks: false,
      live: false,
    })
    expect(processRunListRow(run({ status: 'failed' })).section).toBeUndefined()
  })
})

describe('processRunAttentionSections', () => {
  const needs = parked({ reason: 'step-waiting', ask: ask({}) }, { id: 'n1' })
  const needs2 = changesRequested()
  const signOff = parked({ reason: 'gate', stepId: 'sign-off' }, { id: 's1' })
  const working = run({ id: 'w1' })
  const merging = approved({
    id: 'm1',
    integration: { mode: 'merge', status: 'integrating', at: 2 },
  })

  it('groups the current runs Needs you, Sign off, Running, Merging — keeping their order', () => {
    const sections = processRunAttentionSections([
      working,
      merging,
      needs,
      signOff,
      { ...needs2, id: 'n2' },
    ])
    expect(sections.map((s) => [s.id, s.label, s.counted, s.runs.map((r) => r.id)])).toEqual([
      ['needs-you', 'Needs you', true, ['n1', 'n2']],
      ['sign-off', 'Sign off', true, ['s1']],
      ['running', 'Running', false, ['w1']],
      ['merging', 'Merging', false, ['m1']],
    ])
  })

  it('draws each section in the tone its runs’ badges carry', () => {
    const sections = processRunAttentionSections([working, merging, needs, signOff])
    expect(sections.map((s) => s.tone)).toEqual(
      [needs, signOff, working, merging].map((r) => processRunBadge(r).tone),
    )
  })

  it('leaves out a section with no runs, and every run that is history', () => {
    const sections = processRunAttentionSections([signOff, run({ id: 'h', status: 'cancelled' })])
    expect(sections.map((s) => s.id)).toEqual(['sign-off'])
  })

  it('is empty for no runs', () => {
    expect(processRunAttentionSections([])).toEqual([])
  })
})

describe('processRunWaitingCount', () => {
  it('counts the runs waiting on the person — Needs you and Sign off — and nothing else', () => {
    expect(
      processRunWaitingCount([
        parked({ reason: 'step-waiting', ask: ask({}) }),
        parked({ reason: 'gate', stepId: 'sign-off' }),
        approved({ integration: { mode: 'merge', status: 'failed', at: 2 } }),
        run(),
        approved({ integration: { mode: 'merge', status: 'integrating', at: 2 } }),
        run({ status: 'cancelled' }),
      ]),
    ).toBe(3)
  })

  it('is zero when nothing waits on the person', () => {
    expect(processRunWaitingCount([run(), run({ status: 'succeeded' })])).toBe(0)
  })
})

describe('PROCESS_RUN_WAITING_TITLE', () => {
  it('says how many runs wait on the person, in the right number', () => {
    expect(PROCESS_RUN_WAITING_TITLE(1)).toBe('1 run waits on you')
    expect(PROCESS_RUN_WAITING_TITLE(3)).toBe('3 runs wait on you')
  })
})
