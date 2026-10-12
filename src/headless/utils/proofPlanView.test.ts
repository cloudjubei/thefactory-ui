import { describe, expect, it } from 'vitest'
import { UI_CHANGE_PLAN_WARNING } from 'thefactory-tools/constants'
import type { ProcessProposal, ProcessRun } from 'thefactory-tools/types'

import {
  launchFeatureRows,
  launchProofPlanRows,
  proofKindOptions,
  proofPlanDraftOf,
  proofPlanDraftsEqual,
  proofPlanFieldText,
  proofPlanMarkRows,
  proofPlanMetadata,
  proofPlanOfDraft,
  proofPlanSummaryLine,
  setLaunchProofNotes,
  toggleLaunchProofKind,
  toggleProofPlanDraftKind,
} from './proofPlanView'

const proposal: Pick<ProcessProposal, 'proofPlans'> = {
  proofPlans: [
    {
      featureId: 'f1',
      title: 'ISO dates',
      plan: { kinds: ['unit-tests', 'code-review'], notes: 'A malformed row' },
      source: 'feature',
      unavailable: [{ kind: 'ui-before-after', reason: 'No app to capture.' }],
    },
    {
      featureId: 'f2',
      title: 'Locale dates',
      plan: { kinds: ['checks', 'code-review'] },
      source: 'suggested',
    },
  ],
}

describe('proofKindOptions', () => {
  it('offers every kind once, in the order a plan lists them', () => {
    expect(proofKindOptions().map((o) => o.kind)).toEqual([
      'unit-tests',
      'checks',
      'code-review',
      'ui-before-after',
      'live-backend',
      'manual',
    ])
  })

  it('says what each kind asks for', () => {
    expect(proofKindOptions()[3]).toEqual({
      kind: 'ui-before-after',
      label: 'Before/after screens',
      meaning:
        'A before and an after of every screen the change affects — a screen it adds needs only its after.',
    })
  })
})

describe('drafts', () => {
  it('reads no plan as an empty draft', () => {
    expect(proofPlanDraftOf(undefined)).toEqual({ kinds: [], notes: '' })
  })

  it('toggles a kind in, keeping the canonical order', () => {
    expect(toggleProofPlanDraftKind({ kinds: ['manual'], notes: '' }, 'checks').kinds).toEqual([
      'checks',
      'manual',
    ])
  })

  it('toggles a kind out, keeping the notes', () => {
    expect(toggleProofPlanDraftKind({ kinds: ['checks'], notes: 'n' }, 'checks')).toEqual({
      kinds: [],
      notes: 'n',
    })
  })

  it('saves an empty draft as no plan', () => {
    expect(proofPlanOfDraft({ kinds: [], notes: 'kept only while editing' })).toBeUndefined()
  })

  it('saves a draft canonically, notes trimmed', () => {
    expect(proofPlanOfDraft({ kinds: ['checks'], notes: '  a case ' })).toEqual({
      kinds: ['checks'],
      notes: 'a case',
    })
  })

  it('sees two drafts that save alike as equal', () => {
    expect(
      proofPlanDraftsEqual({ kinds: ['checks'], notes: 'x ' }, { kinds: ['checks'], notes: 'x' }),
    ).toBe(true)
  })

  it('sees a different kind as a change', () => {
    expect(
      proofPlanDraftsEqual({ kinds: ['checks'], notes: '' }, { kinds: ['manual'], notes: '' }),
    ).toBe(false)
  })
})

describe('proofPlanSummaryLine', () => {
  it('names the kinds in one line', () => {
    expect(proofPlanSummaryLine({ kinds: ['unit-tests', 'manual'] })).toBe(
      'Unit tests · Manual check',
    )
  })
})

describe('launchProofPlanRows', () => {
  it("shows each feature's plan, where it came from and what cannot be proven here", () => {
    const [row] = launchProofPlanRows(proposal, {})
    expect([
      row?.sourceLabel,
      row?.edited,
      row?.kinds.filter((k) => k.checked).map((k) => k.kind),
      row?.kinds.find((k) => k.kind === 'ui-before-after')?.unavailable,
      row?.notes,
    ]).toEqual([
      'Set on the feature',
      false,
      ['unit-tests', 'code-review'],
      'No app to capture.',
      'A malformed row',
    ])
  })

  it('marks a suggested plan as suggested', () => {
    expect(launchProofPlanRows(proposal, {})[1]?.sourceLabel).toBe(
      'Suggested — the feature has no plan',
    )
  })

  it('flags a picked kind this host cannot prove, with why', () => {
    const edits = toggleLaunchProofKind(proposal, {}, 'f1', 'ui-before-after')
    expect(launchProofPlanRows(proposal, edits)[0]?.flagged).toEqual([
      { kind: 'ui-before-after', label: 'Before/after screens', reason: 'No app to capture.' },
    ])
  })

  it('does not flag an unavailable kind nobody picked', () => {
    expect(launchProofPlanRows(proposal, {})[0]?.flagged).toEqual([])
  })

  it('says when a plan is left with nothing picked', () => {
    let edits = toggleLaunchProofKind(proposal, {}, 'f2', 'checks')
    edits = toggleLaunchProofKind(proposal, edits, 'f2', 'code-review')
    expect(launchProofPlanRows(proposal, edits)[1]?.empty).toBe(true)
  })

  it('shows nothing for a proposal without plans', () => {
    expect(launchProofPlanRows(undefined, {})).toEqual([])
  })
})

describe('launch edits', () => {
  it('marks a toggled feature as changed and leaves the others alone', () => {
    const rows = launchProofPlanRows(proposal, toggleLaunchProofKind(proposal, {}, 'f2', 'manual'))
    expect(rows.map((r) => r.edited)).toEqual([false, true])
  })

  it('keeps the notes a person wrote', () => {
    const edits = setLaunchProofNotes(proposal, {}, 'f2', 'The French locale')
    expect(launchProofPlanRows(proposal, edits)[1]?.notes).toBe('The French locale')
  })

  it('ignores a feature the proposal does not have', () => {
    const edits = {}
    expect(toggleLaunchProofKind(proposal, edits, 'ghost', 'manual')).toBe(edits)
  })

  it('ignores notes for a feature the proposal does not have', () => {
    const edits = {}
    expect(setLaunchProofNotes(proposal, edits, 'ghost', 'x')).toBe(edits)
  })
})

describe('proofPlanMetadata', () => {
  it("confirms every feature's plan as it stands", () => {
    const edits = toggleLaunchProofKind(proposal, {}, 'f2', 'unit-tests')
    expect(proofPlanMetadata(proposal, edits, false)).toEqual({
      proofPlans: {
        f1: { kinds: ['unit-tests', 'code-review'], notes: 'A malformed row' },
        f2: { kinds: ['unit-tests', 'checks', 'code-review'] },
      },
    })
  })

  it('turns what the person typed in the notes into ids, keeping the proposal’s own words', () => {
    const edits = setLaunchProofNotes(proposal, {}, 'f2', 'show #3')
    const seen: Array<[string, string | undefined]> = []
    const meta = proofPlanMetadata(proposal, edits, false, (text, before) => {
      seen.push([text, before])
      return text.replace('#3', '#ID')
    })
    expect(meta?.proofPlans.f2?.notes).toBe('show #ID')
    expect(seen).toContainEqual(['A malformed row', 'A malformed row'])
  })

  it('asks to save them when the person chose to', () => {
    expect(proofPlanMetadata(proposal, {}, true)?.saveProofPlans).toBe(true)
  })

  it('leaves out a feature with nothing picked', () => {
    let edits = toggleLaunchProofKind(proposal, {}, 'f2', 'checks')
    edits = toggleLaunchProofKind(proposal, edits, 'f2', 'code-review')
    expect(Object.keys(proofPlanMetadata(proposal, edits, false)?.proofPlans ?? {})).toEqual(['f1'])
  })

  it('is undefined when nothing is confirmed', () => {
    expect(proofPlanMetadata({ proofPlans: [] }, {}, true)).toBeUndefined()
  })
})

describe('proofPlanMarkRows', () => {
  const run = (over: Partial<ProcessRun> = {}) => ({
    featureId: 'f1',
    plan: {
      definitionId: 'feature-default',
      definitionScope: 'global' as const,
      definitionVersion: 4,
      name: 'F',
      steps: [
        { id: 'review', name: 'Review', kind: 'judge' as const },
        { id: 'verify', name: 'Verify', kind: 'agent' as const, agentType: 'verifier' },
      ],
      loops: [],
      frozenAt: 0,
    },
    ledger: [
      {
        id: 'r1',
        stepId: 'review',
        iteration: 1,
        status: 'done' as const,
        outcome: 'failed' as const,
        summary: 'Missing null check',
        review: { verdict: 'changes-requested' as const },
        startedAt: 1,
      },
    ],
    input: { proofPlans: { f1: { kinds: ['code-review', 'manual'] } } },
    ...over,
  })

  it("marks each kind of the run's plan, toned by where it stands", () => {
    expect(proofPlanMarkRows(run())).toEqual([
      {
        kind: 'code-review',
        label: 'Code review',
        word: 'Not met',
        detail: 'Missing null check',
        tone: 'stuck',
      },
      {
        kind: 'manual',
        label: 'Manual check',
        word: 'Yours to check',
        detail: 'Left for you to check at sign-off.',
        tone: 'neutral',
      },
    ])
  })

  it('reads a finished run with no verifier attempt as unchecked, never pending', () => {
    const rows = proofPlanMarkRows(
      run({ input: { proofPlans: { f1: { kinds: ['live-backend'] } } }, status: 'succeeded' }),
    )
    expect(rows?.[0]?.word).toBe('Unchecked')
  })

  it('reads a running run whose verifier has not finished as not judged yet', () => {
    const rows = proofPlanMarkRows(
      run({ input: { proofPlans: { f1: { kinds: ['live-backend'] } } }, status: 'running' }),
    )
    expect([rows?.[0]?.word, rows?.[0]?.tone]).toEqual(['Not judged yet', 'review'])
  })

  it('is undefined for a run launched without a plan', () => {
    expect(proofPlanMarkRows(run({ input: {} }))).toBeUndefined()
  })
})

describe('proofPlanFieldText', () => {
  it('prints a plan as its kinds and what must be shown', () => {
    expect(proofPlanFieldText({ kinds: ['checks', 'unit-tests'], notes: 'A 0-byte file' })).toBe(
      'Unit tests · Checks\nWhat must be shown: A 0-byte file',
    )
  })

  it('prints a cleared plan as no plan', () => {
    expect(proofPlanFieldText({ kinds: [] })).toBe('(no plan — the run chooses automatically)')
  })

  it('is undefined for anything that is not a plan', () => {
    expect([
      proofPlanFieldText('text'),
      proofPlanFieldText(['a']),
      proofPlanFieldText({ a: 1 }),
    ]).toEqual([undefined, undefined, undefined])
  })
})

describe('launchProofPlanRows — a feature that changes what users see', () => {
  const uiProposal: Pick<ProcessProposal, 'proofPlans'> = {
    proofPlans: [
      {
        featureId: 'f1',
        title: 'Viewer headings',
        plan: { kinds: ['unit-tests'] },
        source: 'feature',
        looksUi: true,
      },
    ],
  }

  it('warns while its plan asks for no screens', () => {
    expect(launchProofPlanRows(uiProposal, {})[0]?.uiWarning).toBe(UI_CHANGE_PLAN_WARNING)
  })

  it('stops warning once the person adds screens', () => {
    const edits = toggleLaunchProofKind(uiProposal, {}, 'f1', 'ui-before-after')
    expect(launchProofPlanRows(uiProposal, edits)[0]).not.toHaveProperty('uiWarning')
  })

  it('does not warn for a feature that does not look like one', () => {
    expect(launchProofPlanRows(proposal, {})[0]).not.toHaveProperty('uiWarning')
  })
})

describe('launchFeatureRows', () => {
  const view = {
    features: [
      { id: 'f2', title: 'Locale dates', chain: [{ id: 'impl', name: 'Implement', agent: true }] },
      { id: 'f9', title: 'No plan here', chain: [] },
    ],
    tail: [],
    agentStepCount: 1,
  }

  it('reads each feature once, in the order the run works them, with its steps and its proof', () => {
    // The launch card listed every feature twice — once for its steps, again for
    // its proof — and grew past the screen on a story with a dozen of them.
    const rows = launchFeatureRows(view, launchProofPlanRows(proposal, {}))
    expect(rows.map((r) => [r.featureId, r.chain.length, r.proof?.featureId])).toEqual([
      ['f2', 1, 'f2'],
      ['f9', 0, undefined],
      ['f1', 0, 'f1'],
    ])
  })

  it('names the proof a row asks for, in a few words, for its collapsed summary', () => {
    const rows = launchFeatureRows(view, launchProofPlanRows(proposal, {}))
    expect(rows[0]?.proofLabels).toEqual(['Checks', 'Code review'])
    expect(rows[1]?.proofLabels).toEqual([])
  })

  it('reads the proof rows alone while the plan is not known', () => {
    expect(
      launchFeatureRows(undefined, launchProofPlanRows(proposal, {})).map((r) => r.title),
    ).toEqual(['ISO dates', 'Locale dates'])
  })
})
