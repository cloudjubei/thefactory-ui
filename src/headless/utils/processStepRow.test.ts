import { describe, expect, it } from 'vitest'
import {
  CODE_REVIEW_APPROACH,
  FEATURE_REPORT_APPROACH,
  FINAL_REPORT_APPROACH,
} from 'thefactory-tools/constants'
import type { ProcessLedgerEntry, ProcessStepState } from 'thefactory-tools/types'

import { processStageChips, processStepRowView, stepFilingOf } from './processStepRow'
import { PROCESS_STEP_RESULT_MAX, PROCESS_STEP_WAITING_ON_YOU } from './processStepRowConstants'
import type { EvidenceTile } from './reviewEvidenceViewTypes'

const entry = (overrides: Partial<ProcessLedgerEntry> = {}): ProcessLedgerEntry => ({
  id: 'e1',
  stepId: 's',
  iteration: 1,
  status: 'done',
  outcome: 'passed',
  startedAt: 1000,
  endedAt: 2000,
  ...overrides,
})

const state = (
  step: Partial<ProcessStepState['step']> = {},
  overrides: Partial<ProcessStepState> = {},
): ProcessStepState => {
  const latest = 'latest' in overrides ? overrides.latest : entry()
  return {
    step: { id: 's', name: 'Step', kind: 'agent', ...step },
    status: 'done',
    outcome: 'passed',
    attempts: 1,
    latest,
    entries: latest ? [latest] : [],
    current: false,
    requeued: false,
    ...overrides,
  }
}

describe('processStepRowView', () => {
  const waitingChecks = () =>
    state(
      { id: 'checks', name: 'Checks', kind: 'check' },
      {
        status: 'running',
        outcome: undefined,
        latest: entry({
          stepId: 'checks',
          status: 'running',
          outcome: undefined,
          endedAt: undefined,
          queued: {
            reason: 'Waiting for another check run of this project to finish',
            since: 1_000,
          },
        }),
      },
    )

  it('says a running checks step waits its turn, with how long, on the clock it is given', () => {
    const line = processStepRowView(waitingChecks(), undefined, undefined, undefined, 76_000).result
    expect(line).toBe('Waiting for another check run of this project to… · 1m 15s')
    expect(line?.length).toBeLessThanOrEqual(PROCESS_STEP_RESULT_MAX)
  })

  it('says the step waits on you, not its turn, when the run is stopped at it', () => {
    expect(processStepRowView(waitingChecks(), 'checks', undefined, undefined, 76_000).result).toBe(
      PROCESS_STEP_WAITING_ON_YOU,
    )
  })

  it('says nothing of a wait an attempt that already ended left behind', () => {
    const ended = waitingChecks()
    const latest = { ...ended.latest!, status: 'done' as const, summary: 'Build ✓' }
    expect(
      processStepRowView(
        { ...ended, latest, entries: [latest] },
        undefined,
        undefined,
        undefined,
        76_000,
      ).result,
    ).toBe('Build ✓')
  })

  it('says what a running checks step waits for without a clock', () => {
    expect(processStepRowView(waitingChecks(), undefined).result).toBe(
      'Waiting for another check run of this project to finish',
    )
  })

  it('says a step whose Try again ran the checks first so, whole — not its old failure', () => {
    const view = processStepRowView(
      state(
        {},
        {
          outcome: 'errored',
          attempts: 9,
          latest: entry({
            outcome: 'errored',
            summary: 'Agent run finished: aborted.',
            runRef: { runId: 'r', runner: 'cli' },
          }),
          rechecked: { stepId: 'checks', checkedSha: '597e5bd94b535a943a59024b11ad' },
        },
      ),
      undefined,
    )
    expect(view).toMatchObject({
      inert: false,
      result: 'Try again ran the checks first — branch changed (597e5bd9)',
      waitingOnYou: false,
      expandable: true,
    })
  })

  it('says a code review by its verdict and reason', () => {
    const view = processStepRowView(
      state(
        { kind: 'judge' },
        { latest: entry({ review: { verdict: 'approved', reason: 'Nothing blocks merging' } }) },
      ),
      undefined,
    )
    expect(view).toEqual({
      inert: false,
      result: 'Approved · Nothing blocks merging',
      waitingOnYou: false,
      managerOnIt: false,
      expandable: true,
      preview: 'code-review',
    })
  })

  it('says a verdict alone without a reason', () => {
    const view = processStepRowView(
      state({ kind: 'judge' }, { latest: entry({ review: { verdict: 'changes-requested' } }) }),
      undefined,
    )
    expect(view.result).toBe('Changes requested')
  })

  it('reads a requeued review by its summary, not a verdict it has moved past', () => {
    const view = processStepRowView(
      state(
        { kind: 'judge' },
        {
          requeued: true,
          outcome: 'failed',
          attempts: 2,
          latest: entry({ review: { verdict: 'changes-requested' }, summary: 'two bugs' }),
        },
      ),
      undefined,
    )
    expect(view.result).toBe('Attempt 2 did not pass: two bugs')
  })

  it('falls back to the summary for a review without a verdict', () => {
    const view = processStepRowView(
      state({ kind: 'judge' }, { latest: entry({ summary: 'Reviewed' }) }),
      undefined,
    )
    expect(view.result).toBe('Reviewed')
  })

  it('says a gate waiting on the person in the accent', () => {
    const view = processStepRowView(
      state({ id: 'sign-off', kind: 'gate' }, { status: 'running' }),
      'sign-off',
    )
    expect(view).toMatchObject({
      result: 'Needs you',
      waitingOnYou: true,
      expandable: false,
      preview: 'none',
    })
  })

  it('says another park waits on the person when it has no summary', () => {
    const view = processStepRowView(
      state({ id: 'v' }, { status: 'running', latest: entry({ status: 'running' }) }),
      'v',
    )
    expect(view.result).toBe('Needs you')
  })

  it('makes a skipped step inert, with its own reason', () => {
    const view = processStepRowView(
      state(
        { kind: 'capture' },
        {
          outcome: 'skipped',
          latest: entry({ outcome: 'skipped', summary: 'Nothing visible changed' }),
        },
      ),
      undefined,
    )
    expect(view).toMatchObject({
      inert: true,
      expandable: false,
      result: 'Nothing visible changed',
    })
  })

  it('says a send-back step was not needed', () => {
    const view = processStepRowView(
      state(
        { onlyWhenSentBack: true },
        { outcome: 'skipped', latest: entry({ outcome: 'skipped' }) },
      ),
      undefined,
    )
    expect(view.result).toBe('Not needed — nothing was sent back')
  })

  it('says a plain skip as skipped', () => {
    const view = processStepRowView(
      state({}, { outcome: 'skipped', latest: entry({ outcome: 'skipped' }) }),
      undefined,
    )
    expect(view.result).toBe('Skipped')
  })

  it('makes a step not reached yet inert and silent', () => {
    const view = processStepRowView(
      state({}, { status: 'pending', outcome: undefined, latest: undefined }),
      undefined,
    )
    expect(view).toMatchObject({ inert: true, result: undefined, expandable: false })
  })

  it('says a running step is working', () => {
    const view = processStepRowView(
      state({}, { status: 'running', outcome: undefined, latest: entry({ status: 'running' }) }),
      undefined,
    )
    expect(view.result).toBe('Working…')
  })

  it('cuts a long result to one short line', () => {
    const view = processStepRowView(
      state({}, { latest: entry({ summary: `${'word '.repeat(30)}\nsecond line` }) }),
      undefined,
    )
    expect(view.result!.length).toBeLessThanOrEqual(60)
    expect(view.result!.endsWith('…')).toBe(true)
  })

  it('previews each kind by what it produced', () => {
    const kind = (step: Partial<ProcessStepState['step']>, latest = entry()) =>
      processStepRowView(state(step, { latest }), undefined).preview
    expect(kind({ kind: 'report' })).toBe('report')
    expect(kind({ kind: 'check' })).toBe('checks')
    expect(kind({ kind: 'process' }, entry({ childRunId: 'c' }))).toBe('stages')
    expect(kind({ kind: 'process' })).toBe('none')
    expect(kind({ kind: 'agent' }, entry({ runRef: { runId: 'r' } }))).toBe('attempt')
    expect(kind({ kind: 'agent' })).toBe('none')
  })

  describe('a story run’s sign-off', () => {
    const decided = entry({
      stepId: 'sign-off',
      override: { choice: 'approve', at: 3000, integration: 'squash' },
    })
    const gate = (latest: ProcessLedgerEntry, overrides: Partial<ProcessStepState> = {}) =>
      state({ id: 'sign-off', name: 'Sign-off', kind: 'gate' }, { latest, ...overrides })
    const storyRun = { storyId: 'story-1' }

    it('opens to its decision once its latest attempt was decided', () => {
      expect(processStepRowView(gate(decided), undefined, storyRun)).toMatchObject({
        expandable: true,
        preview: 'signoff',
      })
    })

    it('stays shut while its latest attempt waits on the person', () => {
      const waiting = entry({ id: 'e2', stepId: 'sign-off', status: 'running', outcome: undefined })
      const view = processStepRowView(
        gate(waiting, { entries: [decided, waiting], status: 'running' }),
        'sign-off',
        storyRun,
      )
      expect(view).toMatchObject({ expandable: false, preview: 'none' })
    })

    it('is not a sign-off on a run without a story', () => {
      expect(processStepRowView(gate(decided), undefined, {}).preview).toBe('none')
      expect(processStepRowView(gate(decided), undefined).preview).toBe('none')
    })

    it('is not a sign-off on a nested run — its parent signs the story off', () => {
      expect(
        processStepRowView(gate(decided), undefined, { ...storyRun, parentRunId: 'root' }).preview,
      ).toBe('none')
    })
  })

  it('says which nested step was accepted unchecked, and by whom, in place of the summary', () => {
    const fix = state(
      { id: 'fix', name: 'Fix', kind: 'process' },
      {
        latest: entry({
          stepId: 'fix',
          childRunId: 'a96d0620-50aa-4473-9b06-c3da9b5a10df',
          summary:
            'Accepted unchecked: Verify was carried on past by you, never proven. 4 of 6 steps passed.',
          acceptedUnchecked: [
            { stepId: 'verify', stepName: 'Verify', at: 1, decidedBy: 'person' },
            { stepId: 'report', stepName: 'Report', at: 2, decidedBy: 'manager' },
          ],
        }),
      },
    )
    const row = processStepRowView(fix, undefined)
    expect(row.acceptedUnchecked?.label).toBe('Accepted unchecked')
    expect(row.result).toBe('Verify accepted by you, Report by the manager — never proven')
    expect(row).toMatchObject({ inert: false, expandable: true, preview: 'stages' })
  })

  it('says who carried an unchecked step on past', () => {
    const verify = state(
      { id: 'verify', name: 'Verify', agentType: 'verifier' },
      {
        outcome: 'unchecked',
        latest: entry({
          stepId: 'verify',
          outcome: 'unchecked',
          summary: 'This change alters what users see, and nothing showed it on screen.',
          override: { choice: 'continue', at: 1, decidedBy: 'person', decidedVia: 'web' },
        }),
      },
    )
    expect(processStepRowView(verify, undefined).result).toBe('Accepted by you — never proven')
  })

  it('keeps a plain pass beside it as it was, with no accepted chip', () => {
    const row = processStepRowView(
      state({ kind: 'check' }, { latest: entry({ summary: 'Build ✓ · Unit tests ✓' }) }),
      undefined,
    )
    expect(row.acceptedUnchecked).toBeUndefined()
    expect(row.result).toBe('Build ✓ · Unit tests ✓')
  })

  it('has nothing to say of a done step with no summary', () => {
    expect(processStepRowView(state({ kind: 'check' }), undefined).result).toBeUndefined()
  })
})

describe('processStageChips', () => {
  it('marks each stage and says what is worth knowing', () => {
    const chips = processStageChips(
      [
        state({ id: 'implement', name: 'Implement' }, { attempts: 3 }),
        state(
          { id: 'code-review', name: 'Code review', kind: 'judge' },
          { latest: entry({ review: { verdict: 'approved' } }) },
        ),
        state(
          { id: 'verify', name: 'Verify', agentType: 'verifier' },
          {
            outcome: 'unchecked',
            latest: entry({ outcome: 'unchecked', override: { choice: 'continue', at: 1 } }),
          },
        ),
        state({ id: 'report', name: 'Report', kind: 'report' }),
      ],
      undefined,
    )
    expect(chips.map((c) => [c.label, c.mark, c.note, c.tone])).toEqual([
      ['Implement', '✓', '3 attempts', 'done'],
      ['Code review', '✓', 'approved', 'done'],
      ['Verify', '!', 'accepted unchecked', 'review'],
      ['Report', '✓', undefined, 'done'],
    ])
    expect(chips[2]).toMatchObject({ tinted: true, title: 'Accepted by you — never proven' })
    expect(chips[3]).toMatchObject({ tinted: false })
    expect(chips[3]?.title).toBeUndefined()
  })

  it('says who accepted a stage unchecked, a verify and a report alike', () => {
    const chips = processStageChips(
      [
        state(
          { id: 'verify', name: 'Verify', agentType: 'verifier' },
          {
            outcome: 'unchecked',
            latest: entry({
              outcome: 'unchecked',
              override: { choice: 'continue', at: 1, decidedBy: 'person', decidedVia: 'web' },
            }),
          },
        ),
        state(
          { id: 'report', name: 'Report', kind: 'report' },
          {
            outcome: 'unchecked',
            latest: entry({
              outcome: 'unchecked',
              override: { choice: 'continue', at: 2, decidedBy: 'manager', decidedVia: 'manager' },
            }),
          },
        ),
      ],
      undefined,
    )
    expect(chips.map((c) => [c.label, c.mark, c.note, c.tone, c.title])).toEqual([
      ['Verify', '!', 'accepted unchecked', 'review', 'Accepted by you — never proven'],
      ['Report', '!', 'accepted unchecked', 'review', 'Accepted by the manager — never proven'],
    ])
  })

  it('keeps a verify accepted over a gate that failed it apart, naming who accepted it', () => {
    const [chip] = processStageChips(
      [
        state(
          { id: 'verify', name: 'Verify', agentType: 'verifier' },
          {
            outcome: 'failed',
            latest: entry({
              outcome: 'failed',
              override: { choice: 'approve', at: 1, decidedBy: 'manager' },
            }),
          },
        ),
      ],
      undefined,
    )
    expect(chip).toMatchObject({
      mark: '!',
      note: 'accepted by the manager',
      tone: 'working',
      tinted: true,
    })
  })

  it('makes a stage that never ran or was skipped inert', () => {
    const chips = processStageChips(
      [
        state({ id: 'a' }, { status: 'pending', outcome: undefined, latest: undefined }),
        state({ id: 'b' }, { outcome: 'skipped', latest: entry({ outcome: 'skipped' }) }),
        state(
          { id: 'c' },
          { status: 'running', outcome: undefined, latest: entry({ status: 'running' }) },
        ),
      ],
      undefined,
    )
    expect(chips.map((c) => [c.inert, c.mark, c.note])).toEqual([
      [true, '', undefined],
      [true, '–', 'skipped'],
      [false, '…', 'running'],
    ])
  })

  it('says a failed stage did not pass', () => {
    const [chip] = processStageChips(
      [state({ id: 'x' }, { outcome: 'failed', latest: entry({ outcome: 'failed' }) })],
      undefined,
    )
    expect([chip.mark, chip.note, chip.tone]).toEqual(['✗', 'did not pass', 'stuck'])
  })

  it('says the stage the run stopped on needs you', () => {
    const [chip] = processStageChips(
      [
        state(
          { id: 'x' },
          { status: 'running', outcome: undefined, latest: entry({ status: 'running' }) },
        ),
      ],
      'x',
    )
    expect([chip.mark, chip.note]).toEqual(['?', 'needs you'])
  })

  it('does not call a verifier pass accepted', () => {
    const [chip] = processStageChips([state({ id: 'v', agentType: 'verifier' })], undefined)
    expect(chip.note).toBeUndefined()
  })
})

describe('a stopped step whose stop the agent manager has', () => {
  const waiting = state(
    { id: 'f1', name: '35.1 Fonts', kind: 'process' },
    {
      outcome: 'waiting',
      latest: entry({ stepId: 'f1', outcome: 'waiting', childRunId: 'child' }),
    },
  )
  const gate = state({ id: 'g', kind: 'gate' }, { latest: undefined, status: 'pending' })

  it('says the manager is on it, not that it waits on the person', () => {
    expect(processStepRowView(waiting, 'f1', undefined, 'manager')).toMatchObject({
      result: 'Manager on it',
      waitingOnYou: false,
      managerOnIt: true,
    })
    expect(processStepRowView(gate, 'g', undefined, 'manager')).toMatchObject({
      result: 'Manager on it',
      waitingOnYou: false,
    })
  })

  it('waits on the person again once the stop is theirs', () => {
    for (const holder of ['person', undefined] as const) {
      expect(processStepRowView(gate, 'g', undefined, holder)).toMatchObject({
        result: 'Needs you',
        waitingOnYou: true,
        managerOnIt: false,
      })
    }
  })

  it('leaves a step the run is not stopped at alone', () => {
    expect(processStepRowView(state(), 'other', undefined, 'manager').managerOnIt).toBe(false)
  })

  it('marks the stopped stage chip as worked on by the manager', () => {
    const [chip] = processStageChips(
      [state({ id: 'v', name: 'Verify' }, { latest: undefined, status: 'pending' })],
      'v',
      'manager',
    )
    expect([chip.mark, chip.note, chip.tone]).toEqual(['…', 'manager on it', 'running'])
    const [theirs] = processStageChips(
      [state({ id: 'v', name: 'Verify' }, { latest: undefined, status: 'pending' })],
      'v',
      'person',
    )
    expect([theirs.mark, theirs.note]).toEqual(['?', 'needs you'])
  })
})

describe('stepFilingOf', () => {
  const tile = (approach: string, createdAt: number, kind = 'report'): EvidenceTile =>
    ({
      ref: { id: `${approach}-${createdAt}`, approach, createdAt, kind },
      caption: approach,
    }) as unknown as EvidenceTile

  const tiles = [
    tile(CODE_REVIEW_APPROACH, 500),
    tile(CODE_REVIEW_APPROACH, 1500),
    tile(CODE_REVIEW_APPROACH, 1800),
    tile(CODE_REVIEW_APPROACH, 2000 + 120_001),
    tile(FINAL_REPORT_APPROACH, 1900),
    tile(CODE_REVIEW_APPROACH, 1950, 'screenshot'),
  ]

  it('takes the newest filing by that author within the attempt', () => {
    expect(stepFilingOf(tiles, entry(), ['code-review'])?.ref.createdAt).toBe(1800)
  })

  it('takes a filing that landed just after the attempt ended', () => {
    expect(
      stepFilingOf([tile(FEATURE_REPORT_APPROACH, 2050)], entry(), [
        'final-report',
        'feature-report',
      ])?.ref.createdAt,
    ).toBe(2050)
  })

  it('takes anything since a running attempt began', () => {
    expect(stepFilingOf(tiles, entry({ endedAt: undefined }), ['code-review'])?.ref.createdAt).toBe(
      2000 + 120_001,
    )
  })

  it('finds nothing without an attempt', () => {
    expect(stepFilingOf(tiles, undefined, ['code-review'])).toBeUndefined()
  })
})
