import { describe, expect, it } from 'vitest'

import type {
  ReviewEvidenceRef,
  RunVerification,
  VerificationApproachOption,
  VerificationCheckResult,
} from '../api/generated'
import {
  checkMethodFor,
  checkMethodRows,
  checkRowLayout,
  evidenceMethodFor,
  reviewTabs,
  signoffVerdict,
  tabForMethod,
} from './checkMethods'
import {
  CHECK_METHOD_ORDER,
  NOT_RUN_TITLE,
  PROVEN_TITLE,
  STORY_UNFINISHED_TITLE,
  VERDICT_BEARING_METHODS,
} from './checkMethodConstants'
import type { CheckMethodRow } from './checkMethodTypes'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'

function check(over: Partial<VerificationCheckResult> = {}): VerificationCheckResult {
  return {
    id: 'typecheck',
    label: 'Typecheck',
    kind: 'compile',
    status: 'passed',
    durationMs: 1200,
    summary: 'no type errors',
    ...over,
  }
}

function verification(over: Partial<RunVerification> = {}): RunVerification {
  return {
    status: 'passed',
    checks: [check()],
    startedAt: 1000,
    finishedAt: 4000,
    ...over,
  }
}

function approach(
  id: string,
  availability: VerificationApproachOption['availability'] = { status: 'available' },
): VerificationApproachOption {
  return {
    spec: {
      id,
      label: id,
      proves: id,
      requires: { default: [] },
    } as VerificationApproachOption['spec'],
    availability,
    drivenBy: [],
  }
}

function evidence(over: Partial<ReviewEvidenceRef> = {}): ReviewEvidenceRef {
  return {
    id: 'e1',
    kind: 'screenshot',
    path: '.factory/artifacts/review/r/e1.png',
    mediaType: 'image/png',
    bytes: 10,
    createdAt: 1,
    runId: 'r',
    projectId: 'p',
    ...over,
  }
}

function rows(over: {
  verification?: RunVerification
  approaches?: VerificationApproachOption[]
  evidence?: ReviewEvidenceRef[]
}): CheckMethodRow[] {
  return checkMethodRows({
    verification: over.verification,
    approaches: over.approaches ?? [],
    evidence: over.evidence ?? [],
  })
}

function row(list: CheckMethodRow[], id: CheckMethodRow['id']): CheckMethodRow {
  const found = list.find((r) => r.id === id)
  if (!found) throw new Error(`no row ${id}`)
  return found
}

describe('checkMethodFor', () => {
  it('maps a compile check to types', () => {
    expect(checkMethodFor(check({ kind: 'compile' }))).toBe('types')
  })

  it('maps a tests check to tests', () => {
    expect(checkMethodFor(check({ kind: 'tests' }))).toBe('tests')
  })

  it('maps a command check named lint to lint', () => {
    expect(checkMethodFor(check({ kind: 'command', id: 'eslint', label: 'Lint' }))).toBe('lint')
  })

  it('maps a command check about formatting to format', () => {
    expect(checkMethodFor(check({ kind: 'command', id: 'prettier', label: 'Prettier' }))).toBe(
      'format',
    )
  })

  it('maps every other command check to build', () => {
    expect(checkMethodFor(check({ kind: 'command', id: 'e2e', label: 'Cypress' }))).toBe('build')
  })
})

describe('evidenceMethodFor', () => {
  it('maps a screenshot to screens', () => {
    expect(evidenceMethodFor({ kind: 'screenshot' })).toBe('screens')
  })

  it('maps a recording to walkthrough', () => {
    expect(evidenceMethodFor({ kind: 'recording' })).toBe('walkthrough')
  })

  it('maps a report to report', () => {
    expect(evidenceMethodFor({ kind: 'report' })).toBe('report')
  })

  it('maps a log to nothing — it proves no method by itself', () => {
    expect(evidenceMethodFor({ kind: 'log' })).toBeUndefined()
  })
})

describe('checkMethodRows', () => {
  it('returns the nine methods in their fixed order', () => {
    expect(rows({}).map((r) => r.id)).toEqual([...CHECK_METHOD_ORDER])
  })

  it('rolls a passed check up to passed with its summary and duration', () => {
    const r = row(rows({ verification: verification() }), 'types')
    expect(r.state).toBe('passed')
    expect(r.detail).toBe('no type errors')
    expect(r.durationLabel).toBe('1.2s')
    expect(r.checkIds).toEqual(['typecheck'])
  })

  it('a single failed check among matched checks makes the method failed', () => {
    const v = verification({
      checks: [
        check({ id: 'a', kind: 'tests', status: 'passed', summary: '10 passed' }),
        check({ id: 'b', kind: 'tests', status: 'failed', summary: '1 failed' }),
      ],
    })
    const r = row(rows({ verification: v }), 'tests')
    expect(r.state).toBe('failed')
    expect(r.detail).toBe('1 failed')
  })

  it('an errored check reads as failed, not as absent', () => {
    const v = verification({ checks: [check({ status: 'error', summary: 'harness died' })] })
    expect(row(rows({ verification: v }), 'types').state).toBe('failed')
  })

  it('matched checks that all skipped read as not run', () => {
    const v = verification({ checks: [check({ status: 'skipped' })] })
    expect(row(rows({ verification: v }), 'types').state).toBe('unchecked')
  })

  it('joins the raw output of every matched check', () => {
    const v = verification({
      checks: [
        check({ id: 'a', details: 'first' }),
        check({ id: 'b', details: '  ' }),
        check({ id: 'c', details: 'third' }),
      ],
    })
    expect(row(rows({ verification: v }), 'types').output).toBe('first\n\nthird')
  })

  it('leaves output undefined when no matched check carried any', () => {
    expect(row(rows({ verification: verification() }), 'types').output).toBeUndefined()
  })

  it('with no verification record every run-style method is not run', () => {
    const list = rows({})
    for (const id of ['tests', 'types', 'lint', 'format', 'build'] as const) {
      expect(row(list, id).state).toBe('unchecked')
    }
  })

  it('a command method with no matching check is not set up once a record exists', () => {
    expect(row(rows({ verification: verification() }), 'lint').state).toBe('unconfigured')
  })

  it('tests are not run when the record ran other checks and gave no reason', () => {
    expect(row(rows({ verification: verification() }), 'tests').state).toBe('unchecked')
  })

  it('tests are not set up when the record says nothing could be derived', () => {
    const v = verification({
      status: 'unchecked',
      checks: [],
      uncheckedReason: { kind: 'no-applicable-checks', summary: 'no check applies to .kt' },
    })
    expect(row(rows({ verification: v }), 'tests').state).toBe('unconfigured')
  })

  it('a runnable host approach does NOT make an undeclared check read as "not run"', () => {
    // DELIBERATE REVERSAL of the original rule. An approach describes what this
    // MACHINE can do, not what the project declared, so reading it as
    // configuration turned "this project has no build" into "the build never
    // ran" — which demotes the verdict. With `compile` available on every TS
    // host that made `partly` permanent and stopped `merge` ever leading.
    const v = verification({
      status: 'unchecked',
      checks: [],
      uncheckedReason: { kind: 'nothing-declared', summary: 'none declared' },
    })
    const r = row(rows({ verification: v, approaches: [approach('unit-tests')] }), 'tests')
    expect(r.state).toBe('unconfigured')
    expect(r.action).toEqual({ kind: 'request', purpose: 'setup', approachId: 'unit-tests' })
  })

  it('build stays not-set-up on a host that can compile, so it never demotes the verdict', () => {
    // A project that declares a typecheck and tests but no build script: with
    // both green the run IS proven, and the host merely being able to compile
    // must not turn the absent build into a held-against-it "never ran".
    const v = verification({
      status: 'passed',
      checks: [
        check({ id: 'tsc', kind: 'compile', status: 'passed' }),
        check({ id: 'vitest', kind: 'tests', status: 'passed' }),
      ],
    })
    const rowsOut = rows({ verification: v, approaches: [approach('compile')] })
    expect(row(rowsOut, 'build').state).toBe('unconfigured')
    expect(signoffVerdict({ rows: rowsOut, verified: true }).key).toBe('proven')
  })

  it('the device is runnable on a host offering ONLY screenshots', () => {
    // Mutation guard: the screenshot half of the device availability OR.
    const r = row(
      rows({ verification: verification(), approaches: [approach('screenshot-diff')] }),
      'device',
    )
    expect(r.state).toBe('unchecked')
  })

  it('the device is runnable on a host offering ONLY recording', () => {
    const r = row(
      rows({ verification: verification(), approaches: [approach('screen-recording')] }),
      'device',
    )
    expect(r.state).toBe('unchecked')
  })

  it('the device is not set up when the host offers neither capture', () => {
    expect(row(rows({ verification: verification() }), 'device').state).toBe('unconfigured')
  })

  it('a screenshot proves screens and the device', () => {
    const list = rows({ evidence: [evidence()] })
    expect(row(list, 'screens').state).toBe('passed')
    expect(row(list, 'screens').detail).toBe('1 screenshot captured')
    expect(row(list, 'device').state).toBe('passed')
  })

  it('an available capture approach makes an evidence method not run, with a capture request', () => {
    const r = row(rows({ approaches: [approach('screenshot-diff')] }), 'screens')
    expect(r.state).toBe('unchecked')
    expect(r.action).toEqual({ kind: 'request', purpose: 'capture', approachId: 'screenshot-diff' })
  })

  it('an unavailable capture approach makes the method not set up and shows the install hint', () => {
    const r = row(
      rows({
        approaches: [
          approach('screenshot-diff', {
            status: 'unavailable',
            missing: ['adb'],
            hints: ['Install adb.'],
          }),
        ],
      }),
      'screens',
    )
    expect(r.state).toBe('unconfigured')
    expect(r.detail).toBe('Install adb.')
    expect(r.action).toEqual({ kind: 'request', purpose: 'setup', approachId: 'screenshot-diff' })
  })

  it('a not-applicable approach is treated as missing', () => {
    const r = row(
      rows({
        approaches: [approach('screenshot-diff', { status: 'not-applicable', reason: 'lib' })],
      }),
      'screens',
    )
    expect(r.state).toBe('unconfigured')
    expect(r.action).toEqual({ kind: 'request', purpose: 'setup', approachId: undefined })
  })

  it('a report is always at least not-run — an agent can always write one', () => {
    const r = row(rows({}), 'report')
    expect(r.state).toBe('unchecked')
    expect(r.action).toEqual({ kind: 'request', purpose: 'capture', approachId: undefined })
  })

  it('the device is not run when either device approach is available', () => {
    expect(row(rows({ approaches: [approach('screen-recording')] }), 'device').state).toBe(
      'unchecked',
    )
  })

  it('a passed method offers to open the tab that holds its proof', () => {
    expect(row(rows({ verification: verification() }), 'types').action).toEqual({
      kind: 'open-proof',
      tab: 'build',
    })
  })

  it('a failed method offers a fix request', () => {
    const v = verification({ checks: [check({ kind: 'tests', status: 'failed' })] })
    expect(row(rows({ verification: v }), 'tests').action).toEqual({
      kind: 'request',
      purpose: 'fix',
      approachId: undefined,
    })
  })

  it('a run-style method that is not run offers a run, never an agent', () => {
    expect(row(rows({}), 'lint').action).toEqual({ kind: 'run' })
  })

  it('tones follow the state', () => {
    const list = rows({ verification: verification() })
    expect(row(list, 'types').tone).toBe('positive')
    expect(row(list, 'lint').tone).toBe('neutral')
    expect(row(list, 'tests').tone).toBe('absent')
  })
})

describe('signoffVerdict', () => {
  it('is NOT proven when every verdict-bearing method is unconfigured', () => {
    // The false-green case: a record exists (so `verified` is true) but nothing
    // was ever checked. Reading that as proven headlined "Every configured check
    // passed" and promoted `merge` on a run with no evidence at all.
    const rowsOut = VERDICT_BEARING_METHODS.map((id) =>
      mk({ id, state: 'unconfigured', tone: 'neutral' }),
    )
    const v = signoffVerdict({ rows: rowsOut, verified: true })
    expect(v.key).toBe('not-run')
    expect(v.hollow).toBe(true)
  })

  it('is NOT proven while the story itself is unfinished', () => {
    // "Nothing outstanding" printed directly above "5 of 5 features are
    // unfinished" contradicts itself — checks passing is not work being done.
    const rowsOut = VERDICT_BEARING_METHODS.map((id) => mk({ id, state: 'passed' }))
    const v = signoffVerdict({
      rows: rowsOut,
      verified: true,
      storyIncomplete: '5 of 5 features are unfinished (5 not started).',
    })
    expect(v.key).toBe('partly')
    expect(v.title).toBe(STORY_UNFINISHED_TITLE)
    expect(v.detail).toBe('5 of 5 features are unfinished (5 not started).')
  })

  it('is proven when the checks pass and the story IS finished', () => {
    const rowsOut = VERDICT_BEARING_METHODS.map((id) => mk({ id, state: 'passed' }))
    expect(signoffVerdict({ rows: rowsOut, verified: true }).key).toBe('proven')
  })

  it('a FAILED check still outranks an unfinished story', () => {
    const rowsOut = [mk({ id: 'tests', state: 'failed', detail: 'boom' })]
    expect(
      signoffVerdict({ rows: rowsOut, verified: true, storyIncomplete: 'unfinished' }).key,
    ).toBe('failed')
  })

  it('is proven once at least one verdict-bearing method actually passed', () => {
    const rowsOut = [
      mk({ id: 'tests', state: 'passed' }),
      ...VERDICT_BEARING_METHODS.filter((id) => id !== 'tests').map((id) =>
        mk({ id, state: 'unconfigured', tone: 'neutral' }),
      ),
    ]
    expect(signoffVerdict({ rows: rowsOut, verified: true }).key).toBe('proven')
  })

  const mk = (over: Partial<CheckMethodRow>): CheckMethodRow => ({
    id: 'types',
    label: 'Types',
    noun: 'the typecheck',
    setupVerb: 'wire up a typecheck',
    state: 'passed',
    tone: 'positive',
    detail: 'ok',
    durationLabel: undefined,
    output: undefined,
    fill: 'run',
    action: { kind: 'open-proof', tab: 'build' },
    checkIds: [],
    ...over,
  })

  it('any failed bearing method wins', () => {
    const v = signoffVerdict({
      rows: [mk({ id: 'tests', label: 'Tests', state: 'failed', detail: '1 failed' })],
      verified: true,
    })
    expect(v.key).toBe('failed')
    expect(v.title).toBe('Tests failed')
    expect(v.detail).toBe('1 failed')
    expect(v.hollow).toBe(false)
  })

  it('several failures are counted', () => {
    const v = signoffVerdict({
      rows: [
        mk({ id: 'tests', state: 'failed' }),
        mk({ id: 'lint', label: 'Lint', state: 'failed' }),
      ],
      verified: true,
    })
    expect(v.title).toBe('2 checks failed')
  })

  it('nothing verified and nothing passed is not-run, hollow', () => {
    const v = signoffVerdict({ rows: [mk({ state: 'unchecked' })], verified: false })
    expect(v.key).toBe('not-run')
    expect(v.title).toBe(NOT_RUN_TITLE)
    expect(v.detail).toBe(NOT_VERIFIED_DETAIL)
    expect(v.hollow).toBe(true)
    expect(v.tone).toBe('absent')
  })

  it('a passed method with no record still counts as verified', () => {
    const v = signoffVerdict({
      rows: [mk({ id: 'screens', label: 'Screens', state: 'passed' })],
      verified: false,
    })
    expect(v.key).toBe('proven')
  })

  it('an un-run bearing method demotes to partly and names it', () => {
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'lint', label: 'Lint', state: 'unchecked' })],
      verified: true,
    })
    expect(v.key).toBe('partly')
    expect(v.title).toBe('Passes what ran — Lint never ran')
    expect(v.detail).toBe('Types passed.')
    expect(v.hollow).toBe(true)
  })

  it('two un-run methods are joined with and', () => {
    const v = signoffVerdict({
      rows: [
        mk({ id: 'lint', label: 'Lint', state: 'unchecked' }),
        mk({ id: 'tests', label: 'Tests', state: 'unchecked' }),
      ],
      verified: true,
    })
    expect(v.title).toBe('Passes what ran — Lint and Tests never ran')
    expect(v.detail).toBe('Nothing that ran failed.')
  })

  it('a method the project never had does not demote', () => {
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'lint', label: 'Lint', state: 'unconfigured' })],
      verified: true,
    })
    expect(v.key).toBe('proven')
    expect(v.title).toBe(PROVEN_TITLE)
  })

  it('an absent non-bearing method does not demote', () => {
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'walkthrough', label: 'Walkthrough', state: 'unchecked' })],
      verified: true,
    })
    expect(v.key).toBe('proven')
  })
})

describe('reviewTabs', () => {
  const base = {
    screens: 0,
    walkthroughs: 0,
    reports: 0,
    testChecks: 0,
    buildChecks: 0,
    changedFiles: undefined,
  }

  it('tests and build always exist, even with nothing to count', () => {
    expect(reviewTabs(base).map((t) => t.id)).toEqual(['tests', 'build'])
    expect(reviewTabs(base).map((t) => t.count)).toEqual([undefined, undefined])
  })

  it('evidence tabs exist only when that evidence was filed', () => {
    const tabs = reviewTabs({ ...base, screens: 3, walkthroughs: 1, reports: 1 })
    expect(tabs.map((t) => t.id)).toEqual(['screens', 'walkthrough', 'tests', 'build', 'report'])
    expect(tabs[0].count).toBe(3)
  })

  it('changes exists once the diff is known, even at zero files', () => {
    const tabs = reviewTabs({ ...base, changedFiles: 0 })
    expect(tabs.map((t) => t.id)).toEqual(['tests', 'build', 'changes'])
    expect(tabs[2].count).toBe(0)
  })

  it('counts checks on their tabs', () => {
    const tabs = reviewTabs({ ...base, testChecks: 2, buildChecks: 3 })
    expect(tabs.find((t) => t.id === 'tests')?.count).toBe(2)
    expect(tabs.find((t) => t.id === 'build')?.count).toBe(3)
  })

  it('labels every tab', () => {
    expect(reviewTabs({ ...base, screens: 1 })[0].label).toBe('Screens')
  })
})

describe('checkRowLayout', () => {
  const mk = (id: CheckMethodRow['id'], state: CheckMethodRow['state']): CheckMethodRow =>
    ({ id, state }) as CheckMethodRow

  it('puts checked methods first and keeps a few absent ones visible', () => {
    const layout = checkRowLayout(
      [mk('lint', 'unchecked'), mk('types', 'passed'), mk('tests', 'failed')],
      false,
    )
    expect(layout.visible.map((r) => r.id)).toEqual(['types', 'tests', 'lint'])
    expect(layout.collapsed).toEqual([])
  })

  it('folds absent methods past the threshold', () => {
    const layout = checkRowLayout(
      [
        mk('types', 'passed'),
        mk('lint', 'unchecked'),
        mk('format', 'unconfigured'),
        mk('tests', 'unchecked'),
        mk('report', 'unchecked'),
      ],
      false,
    )
    expect(layout.visible.map((r) => r.id)).toEqual(['types'])
    expect(layout.collapsed.map((r) => r.id)).toEqual(['lint', 'format', 'tests', 'report'])
  })

  it('never folds when expanded', () => {
    const layout = checkRowLayout(
      [
        mk('lint', 'unchecked'),
        mk('format', 'unconfigured'),
        mk('tests', 'unchecked'),
        mk('report', 'unchecked'),
      ],
      true,
    )
    expect(layout.visible).toHaveLength(4)
    expect(layout.collapsed).toEqual([])
  })
})

describe('tabForMethod', () => {
  it('sends the typecheck to the build tab', () => {
    expect(tabForMethod('types')).toBe('build')
  })

  it('sends a device run to the screens tab', () => {
    expect(tabForMethod('device')).toBe('screens')
  })
})
