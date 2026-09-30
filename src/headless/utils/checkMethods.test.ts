import {
  CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
  CODE_REVIEW_APPROACH,
  EVIDENCE_FILE_CHANGED_REASON,
  EVIDENCE_RECORD_UNVOUCHED_REASON,
  FEATURE_REPORT_APPROACH,
  FINAL_REPORT_APPROACH,
} from 'thefactory-tools/constants'
import { describe, expect, it } from 'vitest'

import type {
  ReviewEvidenceRef,
  RunVerification,
  VerificationApproachOption,
  VerificationCheckResult,
} from '../api/generated'
import {
  checkActionOffer,
  checkCallout,
  checkMethodFor,
  checkMethodRows,
  checkRowLayout,
  reviewTabOrder,
  evidenceMethodFor,
  reviewTabs,
  signoffVerdict,
  tabForMethod,
} from './checkMethods'
import {
  CHECK_METHOD_ABSENT_NOUNS,
  CHECK_STATE_SENTENCES,
  IMPLEMENTED_CHECK_METHOD_ORDER,
  NOT_RUN_TITLE,
  PROVEN_TITLE,
  STORY_UNFINISHED_TITLE,
  UNIMPLEMENTED_CHECK_METHODS,
  VERDICT_BEARING_METHODS,
  OPTIONAL_CHECK_METHODS,
} from './checkMethodConstants'
import type { CheckMethodRow, ReviewTabId } from './checkMethodTypes'
import { REVIEW_TAB_ORDER } from './checkMethodConstants'
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

  it('routes live/e2e UI-test commands to their OWN method, not build', () => {
    // A Cypress/Playwright/e2e command proves the running app, not the build — it
    // must not be mislabelled as the Build chip.
    expect(checkMethodFor(check({ kind: 'command', id: 'e2e', label: 'Cypress' }))).toBe('uitests')
    expect(checkMethodFor(check({ kind: 'command', id: 'pw', label: 'Playwright' }))).toBe(
      'uitests',
    )
    expect(checkMethodFor(check({ kind: 'command', id: 'ui-tests', label: 'UI tests' }))).toBe(
      'uitests',
    )
  })

  it('maps every other command check to build', () => {
    expect(checkMethodFor(check({ kind: 'command', id: 'webpack', label: 'Bundle' }))).toBe('build')
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
  it('returns only the IMPLEMENTED methods, in their fixed order', () => {
    expect(rows({}).map((r) => r.id)).toEqual([...IMPLEMENTED_CHECK_METHOD_ORDER])
  })

  it('never offers a method nothing can produce', () => {
    // `walkthrough` names a recorder that does not exist and `diff` an
    // adversarial reviewer nothing writes. Rendered anyway they read as a
    // machine that tried and failed, and — being verdict-bearing — they held
    // every run at "Partly proven" for good.
    const ids = rows({ approaches: [approach('screen-recording')] }).map((r) => r.id)
    for (const id of UNIMPLEMENTED_CHECK_METHODS) expect(ids).not.toContain(id)
  })

  it('drops the Device chip, which only ever opened the Screens tab already', () => {
    expect(rows({ evidence: [evidence()] }).map((r) => r.id)).not.toContain('device')
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
    // `unconfigured` never demotes, so build is not what holds this run back —
    // the report and the diff review, which are always capturable, are.
    expect(rowsOut.filter((r) => r.state === 'unconfigured').map((r) => r.id)).toContain('build')
  })

  it('an IDENTICAL before/after pair proves NOTHING and does not count', () => {
    // The live false pass: a pair filed 23 seconds apart — far less than an
    // Android rebuild and reinstall takes — was pixel-identical across 2.46
    // million pixels, and the gate counted it as visual proof of a font change.
    // The agent's own report said the screenshots "do not visually prove" it.
    const list = rows({
      evidence: [
        evidence({
          comparison: { changedPixels: 0, totalPixels: 2462400, identical: true, resized: false },
        }),
      ],
    })
    expect(row(list, 'screens').state).not.toBe('passed')
    expect(row(list, 'screens').detail).toMatch(/does not show the change/i)
  })

  it('a pair that DOES differ still counts', () => {
    const list = rows({
      evidence: [
        evidence({
          comparison: {
            changedPixels: 812,
            totalPixels: 2462400,
            identical: false,
            resized: false,
          },
        }),
      ],
    })
    expect(row(list, 'screens').state).toBe('passed')
  })

  it('a pair we could not compare is not condemned — unknown is not proof of sameness', () => {
    const list = rows({
      evidence: [
        evidence({
          comparison: {
            changedPixels: 0,
            totalPixels: 0,
            identical: true,
            resized: false,
            unavailable: 'unreadable PNG',
          },
        }),
      ],
    })
    expect(row(list, 'screens').state).toBe('passed')
  })

  it('a screenshot proves screens', () => {
    const list = rows({ evidence: [evidence()] })
    expect(row(list, 'screens').state).toBe('passed')
    expect(row(list, 'screens').detail).toBe('1 screenshot captured')
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

describe('checkMethodRows › a capture the project has not allowed', () => {
  const DEVICE_OFF =
    'Device automation is switched off for this project, so its runs drive no emulator or simulator.'
  const withheld = [
    approach('screenshot-diff', { status: 'not-allowed', reason: DEVICE_OFF }),
    approach('screen-recording', { status: 'not-allowed', reason: DEVICE_OFF }),
    approach('code-explanation'),
  ]

  it.each(['screens', 'walkthrough'] as const)(
    'says the %s are withheld while the project has device automation switched off',
    (id) => {
      const r = row(rows({ verification: verification(), approaches: withheld }), id)
      expect(r.state).toBe('unconfigured')
      expect(r.detail).toBe(DEVICE_OFF)
      expect(r.action).toEqual({ kind: 'allow', reason: DEVICE_OFF })
    },
  )

  it('never offers to ask the agent to set a withheld capture up — only the user can allow it', () => {
    const list = rows({ verification: verification(), approaches: withheld })
    for (const id of ['screens', 'walkthrough'] as const) {
      expect(row(list, id).action.kind).not.toBe('request')
    }
  })

  it('still reads a capture that does not apply as absent, with the agent offered to set it up', () => {
    const list = rows({
      verification: verification(),
      approaches: [
        approach('screenshot-diff', {
          status: 'not-applicable',
          reason: 'Before/after screenshots do not apply to a unknown project.',
        }),
      ],
    })
    expect(row(list, 'screens').detail).toBe(
      `This project has no ${CHECK_METHOD_ABSENT_NOUNS.screens}.`,
    )
    expect(row(list, 'screens').action).toEqual({
      kind: 'request',
      purpose: 'setup',
      approachId: undefined,
    })
  })

  it('names what the host lacks AND the switch, for a capture it cannot run that the project withholds too', () => {
    const XCODE = 'Install Xcode from the App Store.'
    const SIMCTL = 'simctl ships with Xcode.'
    const list = rows({
      verification: verification(),
      approaches: [
        approach('screenshot-diff', {
          status: 'unavailable',
          missing: ['xcode', 'simctl'],
          hints: [XCODE, SIMCTL],
          withheld: DEVICE_OFF,
        }),
        approach('code-explanation'),
      ],
    })
    const r = row(list, 'screens')
    expect(r.state).toBe('unconfigured')
    expect(r.detail).toBe(`${XCODE} ${SIMCTL} ${DEVICE_OFF}`)
    expect(r.action).toEqual({ kind: 'allow', reason: DEVICE_OFF })
  })

  it('shows the proof once it is filed, allowed or not', () => {
    const list = rows({
      verification: verification(),
      approaches: withheld,
      evidence: [evidence({ kind: 'screenshot' })],
    })
    expect(row(list, 'screens').state).toBe('passed')
    expect(row(list, 'screens').action.kind).toBe('open-proof')
  })
})

describe('checkMethodRows › uitests (agent-filled, command-proven)', () => {
  it('a passed UI-test command check makes the uitests chip passed with its summary', () => {
    const v = verification({
      checks: [
        check({
          kind: 'command',
          id: 'ui-tests',
          label: 'UI tests',
          status: 'passed',
          summary: '12 passed',
        }),
      ],
    })
    const r = row(rows({ verification: v }), 'uitests')
    expect(r.state).toBe('passed')
    expect(r.detail).toBe('12 passed')
    expect(r.checkIds).toEqual(['ui-tests'])
  })

  it('a failed UI-test command check makes the uitests chip failed (a red run, not "not set up")', () => {
    const v = verification({
      checks: [
        check({
          kind: 'command',
          id: 'e2e',
          label: 'Playwright',
          status: 'failed',
          summary: '2 failed',
        }),
      ],
    })
    expect(row(rows({ verification: v }), 'uitests').state).toBe('failed')
  })

  it('with no UI-test check declared the chip reads "not set up", never a bare run', () => {
    expect(row(rows({ verification: verification() }), 'uitests').state).toBe('unconfigured')
  })
})

describe('checkMethodRows › filings the backend cannot vouch for count like any other', () => {
  const REASONS = [
    EVIDENCE_RECORD_UNVOUCHED_REASON,
    EVIDENCE_FILE_CHANGED_REASON,
    CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
    'The seal key rotated.',
  ] as const
  const FILINGS: readonly {
    method: CheckMethodRow['id']
    filing: (id: string) => ReviewEvidenceRef
  }[] = [
    {
      method: 'screens',
      filing: (id) => evidence({ id, phase: 'after', subject: 'login', path: `${id}.png` }),
    },
    {
      method: 'walkthrough',
      filing: (id) =>
        evidence({ id, kind: 'recording', mediaType: 'video/mp4', path: `${id}.mp4` }),
    },
    {
      method: 'report',
      filing: (id) =>
        evidence({
          id,
          kind: 'report',
          mediaType: 'text/markdown',
          path: `${id}.md`,
          label: 'Run',
        }),
    },
    {
      method: 'diff',
      filing: (id) =>
        evidence({
          id,
          kind: 'report',
          approach: CODE_REVIEW_APPROACH,
          mediaType: 'text/markdown',
          path: `${id}.md`,
          verdict: 'approved',
        }),
    },
  ]
  const APPROACHES = [
    approach('screenshot-diff'),
    approach('screen-recording'),
    approach('code-explanation'),
  ]

  it.each(REASONS.flatMap((reason) => FILINGS.map((f) => ({ ...f, reason, name: f.method }))))(
    'counts a $name filing carrying "$reason" exactly as one without it',
    (c) => {
      const plain = c.filing('a')
      const carried = { ...plain, unvouchedReason: c.reason }
      const withReason = row(
        rows({ verification: verification(), approaches: APPROACHES, evidence: [carried] }),
        c.method,
      )
      const without = row(
        rows({ verification: verification(), approaches: APPROACHES, evidence: [plain] }),
        c.method,
      )
      expect(withReason).toEqual(without)
      expect(withReason.state).toBe('passed')
      expect(checkCallout(withReason)).toEqual(checkCallout(without))
    },
  )

  it('counts several such filings beside an ordinary one in the chip’s own count', () => {
    const r = row(
      rows({
        evidence: [
          evidence({ id: 'a', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
          evidence({ id: 'b', unvouchedReason: EVIDENCE_FILE_CHANGED_REASON }),
          evidence({ id: 'fresh', capturedOn: 'android · emulator-5554' }),
        ],
      }),
      'screens',
    )
    expect(r).toMatchObject({
      state: 'passed',
      detail: '3 screenshots captured',
      action: { kind: 'open-proof', tab: 'screens' },
    })
  })

  it('opens the proof under a switched-off device, as for any capture that counted', () => {
    const r = row(
      rows({
        verification: verification(),
        approaches: [
          approach('screenshot-diff', {
            status: 'not-allowed',
            reason:
              'Device automation is switched off for this project, so its runs drive no emulator or simulator.',
          }),
        ],
        evidence: [evidence({ id: 'a', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON })],
      }),
      'screens',
    )
    expect(r.state).toBe('passed')
    expect(r.action).toEqual({ kind: 'open-proof', tab: 'screens' })
    expect(checkCallout(r)).toEqual({ lead: CHECK_STATE_SENTENCES.passed, detail: undefined })
  })

  it('still counts nothing for a pixel-identical pair, whatever it carries', () => {
    const identical = { changedPixels: 0, totalPixels: 2_462_400, identical: true, resized: false }
    const r = row(
      rows({
        approaches: [approach('screenshot-diff')],
        evidence: [
          evidence({
            id: 'a',
            phase: 'after',
            subject: 'login',
            comparison: identical,
            unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON,
          }),
        ],
      }),
      'screens',
    )
    const plain = row(
      rows({
        approaches: [approach('screenshot-diff')],
        evidence: [
          evidence({
            id: 'a',
            phase: 'after',
            subject: 'login',
            comparison: identical,
          }),
        ],
      }),
      'screens',
    )
    expect(r).toEqual(plain)
    expect(r.state).toBe('unchecked')
  })

  it('leaves the verdict to what counted, saying nothing about why a filing carries a reason', () => {
    const list = rows({
      verification: verification(),
      approaches: APPROACHES,
      evidence: [
        evidence({ id: 'a', unvouchedReason: EVIDENCE_RECORD_UNVOUCHED_REASON }),
        evidence({
          id: 'rec',
          kind: 'recording',
          mediaType: 'video/mp4',
          unvouchedReason: EVIDENCE_FILE_CHANGED_REASON,
        }),
      ],
    })
    const v = signoffVerdict({ rows: list, verified: true })
    expect(v.key).not.toBe('not-run')
    expect(`${v.title} ${v.detail}`).not.toMatch(/vouch/i)
    expect(list.every((r) => !r.detail.toLowerCase().includes('vouch'))).toBe(true)
  })
})

describe('checkActionOffer', () => {
  const request = (purpose: 'fix' | 'setup' | 'capture') =>
    ({ kind: 'request', purpose, approachId: 'screenshot-diff' }) as const

  it('offers nothing but the proof on a read-only record — a button there would do nothing', () => {
    expect(checkActionOffer({ kind: 'run' }, undefined)).toEqual({ kind: 'none' })
    for (const purpose of ['capture', 'fix', 'setup'] as const) {
      expect(checkActionOffer(request(purpose), undefined)).toEqual({ kind: 'none' })
    }
    expect(checkActionOffer({ kind: 'open-proof', tab: 'screens' }, undefined)).toEqual({
      kind: 'open-proof',
      tab: 'screens',
    })
  })

  it('offers a capture without a chat, since the host spawns the verifier itself', () => {
    expect(checkActionOffer(request('capture'), { canRequest: false })).toEqual({
      kind: 'request',
      purpose: 'capture',
      unreachable: false,
    })
  })

  it('marks a fix or a set-up unreachable without a chat to send it to', () => {
    for (const purpose of ['fix', 'setup'] as const) {
      expect(checkActionOffer(request(purpose), { canRequest: false })).toEqual({
        kind: 'request',
        purpose,
        unreachable: true,
      })
      expect(checkActionOffer(request(purpose), { canRequest: true })).toEqual({
        kind: 'request',
        purpose,
        unreachable: false,
      })
    }
  })

  it('offers a run wherever something can act, and nothing for a switch only the user flips', () => {
    expect(checkActionOffer({ kind: 'run' }, { canRequest: false })).toEqual({ kind: 'run' })
    expect(checkActionOffer({ kind: 'allow', reason: 'x' }, { canRequest: true })).toEqual({
      kind: 'none',
    })
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

  it('a FAILED optional method (uitests) still fails the headline — absence is excused, failure is not', () => {
    // OPTIONAL means its ABSENCE never demotes; it does NOT mean a red run reads
    // as "Every configured check passed".
    const rowsOut = [
      mk({ id: 'tests', state: 'passed' }),
      mk({ id: 'uitests', label: 'UI tests', state: 'failed', detail: '2 failed', fill: 'agent' }),
    ]
    const v = signoffVerdict({ rows: rowsOut, verified: true })
    expect(v.key).toBe('failed')
    expect(v.title).not.toBe(PROVEN_TITLE)
  })

  it('an ABSENT optional method (uitests) never demotes a proven run', () => {
    const rowsOut = [
      ...VERDICT_BEARING_METHODS.map((id) => mk({ id, state: 'passed' })),
      mk({
        id: 'uitests',
        label: 'UI tests',
        state: 'unconfigured',
        tone: 'neutral',
        fill: 'agent',
      }),
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

  it('names every bearing method that did not count as never ran', () => {
    const v = signoffVerdict({
      rows: [
        mk({}),
        mk({ id: 'lint', label: 'Lint', state: 'unchecked' }),
        mk({ id: 'screens', label: 'Screens', state: 'unchecked' }),
      ],
      verified: true,
    })
    expect(v.key).toBe('partly')
    expect(v.title).toBe('Passes what ran — Lint and Screens never ran')
  })

  it('says nothing was checked when nothing counted on an unverified run', () => {
    const v = signoffVerdict({
      rows: [
        mk({ id: 'report', label: 'Report', state: 'unchecked' }),
        mk({ id: 'screens', label: 'Screens', state: 'unchecked' }),
      ],
      verified: false,
    })
    expect(v).toMatchObject({ key: 'not-run', title: NOT_RUN_TITLE, detail: NOT_VERIFIED_DETAIL })
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

  it('any IMPLEMENTED method that could have run and did not demotes the verdict', () => {
    // A capture that could have been taken and was not is exactly the kind of
    // gap "proven — nothing outstanding" must not paper over.
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'screens', label: 'Screens', state: 'unchecked' })],
      verified: true,
    })
    expect(v.key).toBe('partly')
    expect(v.title).toContain('Screens')
  })

  it('a method that cannot be satisfied never carries the verdict', () => {
    // The live report this closes: every chip green, "Partly proven" above
    // them, and no explanation the reviewer could act on — held down by two
    // methods with no implementation behind them.
    for (const id of UNIMPLEMENTED_CHECK_METHODS) {
      expect(VERDICT_BEARING_METHODS).not.toContain(id)
    }
  })

  it('an OPTIONAL method cannot demote either — implemented is not the same as required', () => {
    // A recorder exists, so `walkthrough` is real and passes when a video was
    // filed. Most changes do not need one, and demanding it would mark every
    // run without a video "partly proven".
    for (const id of OPTIONAL_CHECK_METHODS) {
      expect(VERDICT_BEARING_METHODS).not.toContain(id)
    }
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'walkthrough', label: 'Walkthrough', state: 'unchecked' })],
      verified: true,
    })
    expect(v.key).toBe('proven')
  })

  it('a walkthrough that WAS recorded still shows as evidence', () => {
    expect(IMPLEMENTED_CHECK_METHOD_ORDER).toContain('walkthrough')
  })

  it('a partial verdict always NAMES what held it back', () => {
    // "Partly proven" with nothing saying why is a headline the reviewer cannot
    // act on.
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'screens', label: 'Screens', state: 'unchecked' })],
      verified: true,
    })
    expect(v.key).toBe('partly')
    expect(v.title.trim().length).toBeGreaterThan(0)
    expect(v.detail.trim().length).toBeGreaterThan(0)
  })

  it('but a method the PROJECT does not have still never demotes', () => {
    const v = signoffVerdict({
      rows: [mk({}), mk({ id: 'lint', label: 'Lint', state: 'unconfigured' })],
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
    testCount: 0,
    testChecks: 0,
    buildChecks: 0,
    changedFiles: undefined,
  }

  it('offers NO tabs when nothing ran and nothing was filed', () => {
    // The chip row already carries "this project has no tests/build" and the
    // way to ask for it — a bare Tests/Build tab would only duplicate that.
    expect(reviewTabs(base)).toEqual([])
  })

  it('tests and build appear only when a check of that kind ran', () => {
    const tabs = reviewTabs({ ...base, testChecks: 1, buildChecks: 2 })
    expect(tabs.map((t) => t.id)).toEqual(['tests', 'build'])
  })

  it('badges a verify proof’s Screens tab with what the proof rests on, not every capture judged', () => {
    const screens = reviewTabs({ ...base, screens: 4, screensProof: 2 }).find(
      (t) => t.id === 'screens',
    )
    expect(screens?.count).toBe(2)
  })

  it('keeps a proof’s Screens tab when nothing counted, so what did not count stays reachable', () => {
    const screens = reviewTabs({ ...base, screens: 3, screensProof: 0 }).find(
      (t) => t.id === 'screens',
    )
    expect(screens).toBeDefined()
    expect(screens?.count).toBe(0)
  })

  it('badges every capture when there is no proof to count against', () => {
    expect(reviewTabs({ ...base, screens: 4 }).find((t) => t.id === 'screens')?.count).toBe(4)
  })

  it('a suite that ran but counted zero tests still opens the Tests tab', () => {
    // Presence follows testChecks, not testCount: "tests ran and found none" is
    // still a run, and its tab must exist even though the badge is bare.
    const tabs = reviewTabs({ ...base, testChecks: 1, testCount: 0 })
    const tests = tabs.find((t) => t.id === 'tests')
    expect(tests).toBeDefined()
    expect(tests?.count).toBeUndefined()
  })

  it('evidence tabs exist only when that evidence was filed', () => {
    const tabs = reviewTabs({ ...base, screens: 3, walkthroughs: 1, reports: 1 })
    expect(tabs.map((t) => t.id)).toEqual(['screens', 'walkthrough', 'report'])
    expect(tabs[0].count).toBe(3)
  })

  it('changes exists once the diff is known, even at zero files', () => {
    const tabs = reviewTabs({ ...base, changedFiles: 0 })
    expect(tabs.map((t) => t.id)).toEqual(['changes'])
    expect(tabs[0].count).toBe(0)
  })

  it('badges Tests with the number of TESTS, not the number of layers', () => {
    const tabs = reviewTabs({ ...base, testCount: 132, testChecks: 4, buildChecks: 3 })
    expect(tabs.find((t) => t.id === 'tests')?.count).toBe(132)
  })

  it('leaves Walkthrough, Build and Report bare — only Screens, Tests and Changes count', () => {
    // Those tabs already exist only when there is something in them, so a badge
    // would restate the tab's own presence.
    const tabs = reviewTabs({
      ...base,
      screens: 3,
      walkthroughs: 2,
      reports: 1,
      testCount: 10,
      testChecks: 2,
      buildChecks: 3,
      changedFiles: 4,
    })
    const count = (id: string) => tabs.find((t) => t.id === id)?.count
    expect([count('screens'), count('tests'), count('changes')]).toEqual([3, 10, 4])
    expect([count('walkthrough'), count('build'), count('report')]).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })

  it('labels every tab', () => {
    expect(reviewTabs({ ...base, screens: 1 })[0].label).toBe('Screens')
  })
})

describe('reviewTabOrder', () => {
  it('is the tab order, with a lead tab moved to the front', () => {
    expect(reviewTabOrder()).toEqual(REVIEW_TAB_ORDER)
    expect(reviewTabOrder('report')).toEqual([
      'report',
      ...REVIEW_TAB_ORDER.filter((id) => id !== 'report'),
    ])
  })
})

describe('checkRowLayout', () => {
  const mk = (id: CheckMethodRow['id'], state: CheckMethodRow['state']): CheckMethodRow =>
    ({ id, state }) as CheckMethodRow

  it('keeps the rows in the order given and a few absent ones visible', () => {
    const layout = checkRowLayout(
      [mk('lint', 'unchecked'), mk('types', 'passed'), mk('tests', 'failed')],
      false,
    )
    expect(layout.visible.map((r) => r.id)).toEqual(['lint', 'types', 'tests'])
    expect(layout.collapsed).toEqual([])
  })

  const opening = (
    id: CheckMethodRow['id'],
    state: CheckMethodRow['state'],
    tab?: ReviewTabId,
  ): CheckMethodRow =>
    ({ id, state, action: tab ? { kind: 'open-proof', tab } : { kind: 'run' } }) as CheckMethodRow

  it('orders the chips by the tabs below them, the lead tab first — each chip by the tab it opens', () => {
    const layout = checkRowLayout(
      [
        opening('tests', 'passed', 'tests'),
        opening('build', 'passed', 'build'),
        opening('walkthrough', 'passed', 'walkthrough'),
        opening('report', 'passed', 'report'),
        opening('diff', 'failed', 'code-review'),
      ],
      true,
      ['report', 'walkthrough', 'tests', 'build', 'code-review'],
    )
    expect(layout.visible.map((r) => r.id)).toEqual([
      'report',
      'walkthrough',
      'tests',
      'build',
      'diff',
    ])
  })

  it('places a chip with no proof yet where its method’s tab would be, and one with no tab last', () => {
    const layout = checkRowLayout(
      [
        opening('lint', 'unchecked'),
        opening('screens', 'passed', 'screens'),
        opening('tests', 'passed', 'tests'),
      ],
      true,
      ['screens', 'build'],
    )
    expect(layout.visible.map((r) => r.id)).toEqual(['screens', 'lint', 'tests'])
  })

  it('keeps tab order when absent chips fold away', () => {
    const layout = checkRowLayout(
      [
        opening('tests', 'passed', 'tests'),
        opening('lint', 'unchecked'),
        opening('format', 'unconfigured'),
        opening('types', 'unchecked'),
        opening('uitests', 'unchecked'),
        opening('walkthrough', 'passed', 'walkthrough'),
      ],
      false,
      ['walkthrough', 'tests', 'build'],
    )
    expect(layout.visible.map((r) => r.id)).toEqual(['walkthrough', 'tests'])
    expect(layout.collapsed.map((r) => r.id)).toEqual(['lint', 'format', 'types', 'uitests'])
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

  it('sends a device run to the WALKTHROUGH tab', () => {
    // A device run is proven by a screenshot OR a recording; the walkthrough is
    // where the path through the app lives, and pointing at Screens sent a
    // recording-only run to a tab that does not exist.
    expect(tabForMethod('device')).toBe('walkthrough')
  })

  it('sends the diff review to the changes tab', () => {
    expect(tabForMethod('diff')).toBe('changes')
  })
})

describe('the diff method, now that it has a producer', () => {
  it('is offered to reviewers — its producer landed with the judge step', () => {
    expect(UNIMPLEMENTED_CHECK_METHODS).not.toContain('diff')
    expect(IMPLEMENTED_CHECK_METHOD_ORDER).toContain('diff')
  })

  it('passes when the change was actually read', () => {
    const rows = checkMethodRows({
      verification: undefined,
      approaches: [],
      evidence: [],
      diffReview: { by: 'reviewer-agent', summary: 'Read all 4 files' },
    })
    expect(rows.find((r) => r.id === 'diff')).toMatchObject({
      state: 'passed',
      detail: 'Read all 4 files',
    })
  })

  it('is unchecked when nobody has read it', () => {
    const rows = checkMethodRows({ verification: undefined, approaches: [], evidence: [] })
    expect(rows.find((r) => r.id === 'diff')?.state).toBe('unchecked')
  })

  it('is NOT satisfied by a verdict — deciding and reading are different acts', () => {
    // An agent stamping the sign-off would be approving on the user's behalf,
    // which is exactly why reading got a field of its own.
    const rows = checkMethodRows({
      verification: undefined,
      approaches: [],
      evidence: [],
      verdictBy: 'reviewer-agent',
    })
    expect(rows.find((r) => r.id === 'diff')?.state).toBe('unchecked')
  })

  it('says who read it when the reader left no summary', () => {
    const rows = checkMethodRows({
      verification: undefined,
      approaches: [],
      evidence: [],
      diffReview: { by: 'user' },
    })
    expect(rows.find((r) => r.id === 'diff')?.detail).toBe('You read the change')
  })
})

describe('checkCallout', () => {
  const DEVICE_OFF =
    'Device automation is switched off for this project, so its runs drive no emulator or simulator.'

  it('leads with the withheld reason, once, when only the user can allow the capture', () => {
    const screens = row(
      rows({
        verification: verification(),
        approaches: [approach('screenshot-diff', { status: 'not-allowed', reason: DEVICE_OFF })],
      }),
      'screens',
    )
    expect(checkCallout(screens)).toEqual({ lead: DEVICE_OFF, detail: undefined })
  })

  it('asks for a method the project has not set up, with why beneath', () => {
    const lint = row(rows({ verification: verification() }), 'lint')
    expect(checkCallout(lint)).toEqual({
      lead: `There is no ${lint.noun} in this project, so there is no tab for it. Ask for it here.`,
      detail: lint.detail,
    })
  })

  it('states a passed method, and adds no detail to the proof', () => {
    const types = row(rows({ verification: verification() }), 'types')
    expect(checkCallout(types)).toEqual({ lead: CHECK_STATE_SENTENCES.passed, detail: undefined })
  })

  it('states a failed method, with what failed beneath', () => {
    const types = row(
      rows({
        verification: verification({
          checks: [check({ status: 'failed', summary: '3 type errors' })],
        }),
      }),
      'types',
    )
    expect(checkCallout(types)).toEqual({
      lead: CHECK_STATE_SENTENCES.failed,
      detail: '3 type errors',
    })
  })
})

describe('the diff method, read from the code review', () => {
  const review = (over: Partial<ReviewEvidenceRef> = {}): ReviewEvidenceRef =>
    ({
      id: 'cr',
      runId: 'r',
      projectId: 'p',
      kind: 'report',
      approach: CODE_REVIEW_APPROACH,
      label: 'Code review',
      path: 'cr.md',
      mediaType: 'text/markdown',
      bytes: 10,
      createdAt: 5,
      ...over,
    }) as ReviewEvidenceRef
  const diffRow = (evidence: ReviewEvidenceRef[], diffReview?: { by?: string; summary?: string }) =>
    checkMethodRows({
      verification: undefined,
      approaches: [],
      evidence,
      ...(diffReview ? { diffReview } : {}),
    }).find((r) => r.id === 'diff')

  it('is called Code review', () => {
    expect(diffRow([])?.label).toBe('Code review')
  })

  it('passes on an approving code review, and its chip opens the Code review tab', () => {
    expect(
      diffRow([review({ verdict: 'approved', verdictReason: 'Meets every criterion.' })]),
    ).toMatchObject({
      state: 'passed',
      detail: 'Meets every criterion.',
      action: { kind: 'open-proof', tab: 'code-review' },
    })
  })

  it('fails on a code review that requested changes, and still opens its finding', () => {
    const row = diffRow([review({ verdict: 'changes-requested', verdictReason: 'No test.' })])
    expect(row).toMatchObject({
      state: 'failed',
      detail: 'No test.',
      action: { kind: 'open-proof', tab: 'code-review' },
    })
    expect(signoffVerdict({ rows: [row as CheckMethodRow], verified: true })).toMatchObject({
      key: 'failed',
      title: 'Code review failed',
    })
  })

  it('says what the review concluded when it gave no reason', () => {
    expect(diffRow([review({ verdict: 'approved' })])?.detail).toBe(
      'The code review approved the change',
    )
    expect(diffRow([review({ verdict: 'changes-requested' })])?.detail).toBe(
      'The code review requested changes',
    )
  })

  it('reads the NEWEST code review', () => {
    expect(
      diffRow([
        review({ id: 'old', createdAt: 1, verdict: 'changes-requested' }),
        review({ id: 'new', createdAt: 9, verdict: 'approved' }),
      ])?.state,
    ).toBe('passed')
    expect(
      diffRow([
        review({ id: 'new', createdAt: 9, verdict: 'changes-requested' }),
        review({ id: 'old', createdAt: 1, verdict: 'approved' }),
      ])?.state,
    ).toBe('failed')
  })

  it('lets a code review outrank a recorded read of the diff', () => {
    expect(
      diffRow([review({ verdict: 'changes-requested' })], { by: 'reviewer-agent' })?.state,
    ).toBe('failed')
  })

  it('is unchecked over a code review that filed no verdict, even when the diff was read', () => {
    const row = diffRow([review()], { by: 'reviewer-agent', summary: 'Read it' })
    expect(row?.state).toBe('unchecked')
    expect(row?.detail).toBe('The code review filed no verdict.')
  })

  it.each([EVIDENCE_RECORD_UNVOUCHED_REASON, EVIDENCE_FILE_CHANGED_REASON])(
    'reads a code review that lost its verdict ("%s") as one that filed none',
    (reason) => {
      const row = diffRow([
        review({ id: 'old', createdAt: 1, verdict: 'approved' }),
        review({ id: 'new', createdAt: 9, unvouchedReason: reason }),
      ])
      expect(row).toMatchObject({
        state: 'unchecked',
        detail: 'The code review filed no verdict.',
      })
    },
  )

  it('keeps an old run’s read diff passing when no code review was filed', () => {
    expect(diffRow([], { by: 'reviewer-agent', summary: 'Read all 4 files' })).toMatchObject({
      state: 'passed',
      detail: 'Read all 4 files',
      action: { kind: 'open-proof', tab: 'changes' },
    })
  })

  it('never counts the verifier’s approval as a code review', () => {
    expect(
      diffRow([{ ...review({ verdict: 'approved' }), approach: undefined } as ReviewEvidenceRef])
        ?.state,
    ).toBe('unchecked')
  })

  it('never counts a code review or the final report as the written report', () => {
    const reportRow = (evidence: ReviewEvidenceRef[]) =>
      checkMethodRows({ verification: undefined, approaches: [], evidence }).find(
        (r) => r.id === 'report',
      )?.state
    expect(reportRow([review({ verdict: 'approved' })])).toBe('unchecked')
    expect(reportRow([review({ approach: FINAL_REPORT_APPROACH })])).toBe('unchecked')
    expect(reportRow([review({ approach: FEATURE_REPORT_APPROACH })])).toBe('passed')
    expect(reportRow([review({ approach: undefined })])).toBe('passed')
  })
})

describe('evidenceMethodFor, for a report', () => {
  it('routes a report by who wrote it', () => {
    expect(evidenceMethodFor({ kind: 'report', approach: CODE_REVIEW_APPROACH })).toBe('diff')
    expect(evidenceMethodFor({ kind: 'report', approach: FINAL_REPORT_APPROACH })).toBeUndefined()
    expect(evidenceMethodFor({ kind: 'report', approach: FEATURE_REPORT_APPROACH })).toBe('report')
    expect(evidenceMethodFor({ kind: 'report' })).toBe('report')
  })
})

describe('reviewTabs, with a code review', () => {
  const none = {
    screens: 0,
    walkthroughs: 0,
    reports: 0,
    testCount: 0,
    testChecks: 0,
    buildChecks: 0,
    changedFiles: undefined,
  }

  it('offers a Code review tab only when a code review was filed, after the Report tab', () => {
    expect(reviewTabs({ ...none, reports: 1 }).map((t) => t.id)).toEqual(['report'])
    const tabs = reviewTabs({ ...none, reports: 1, codeReviews: 1, testChecks: 1 })
    expect(tabs.map((t) => t.id)).toEqual(['tests', 'report', 'code-review'])
    expect(tabs.find((t) => t.id === 'code-review')).toEqual({
      id: 'code-review',
      label: 'Code review',
      count: undefined,
    })
  })

  it('leads with the tab asked to lead, when it is there', () => {
    expect(
      reviewTabs({ ...none, walkthroughs: 1, reports: 1, codeReviews: 1, lead: 'report' }).map(
        (t) => t.id,
      ),
    ).toEqual(['report', 'walkthrough', 'code-review'])
    expect(reviewTabs({ ...none, walkthroughs: 1, lead: 'report' }).map((t) => t.id)).toEqual([
      'walkthrough',
    ])
  })
})
