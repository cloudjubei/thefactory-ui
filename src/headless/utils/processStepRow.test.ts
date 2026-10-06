import { describe, expect, it } from 'vitest'
import {
  CODE_REVIEW_APPROACH,
  FEATURE_REPORT_APPROACH,
  FINAL_REPORT_APPROACH,
} from 'thefactory-tools/constants'
import type { ProcessLedgerEntry, ProcessStepState } from 'thefactory-tools/types'

import { processStageChips, processStepRowView, stepFilingOf } from './processStepRow'
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
      result: 'Waiting for you',
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
    expect(view.result).toBe('Waiting for you')
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
      ['Verify', '!', 'accepted by you', 'working'],
      ['Report', '✓', undefined, 'done'],
    ])
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

  it('does not call a verifier pass accepted', () => {
    const [chip] = processStageChips([state({ id: 'v', agentType: 'verifier' })], undefined)
    expect(chip.note).toBeUndefined()
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
