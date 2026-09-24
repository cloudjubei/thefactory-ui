import { describe, expect, it } from 'vitest'
import type { ProcessRun } from 'thefactory-tools/types'

import type { ReviewEvidenceRef, RunVerification, VerificationCheckResult } from '../api/generated'
import { STORY_UNFINISHED_TITLE } from './checkMethodConstants'
import type { FeatureSignoff, StorySignoffProcessRun, StorySignoffRun } from './storySignoffTypes'
import { aggregateStoryVerdict, buildStorySignoff } from './storySignoff'

// A FeatureSignoff reduced to just what the aggregate reads — its verdict key,
// title and where its verify attempt stands. Shapes vary by the MULTISET of
// keys, which is what the worst-wins rule turns on.
const fs = (key: FeatureSignoff['verdict']['key'], title: string = key): FeatureSignoff =>
  ({ title, verdict: { key }, standing: undefined }) as FeatureSignoff
const acceptedFs = (title: string): FeatureSignoff =>
  ({ title, verdict: { key: 'partly' }, standing: 'accepted' }) as FeatureSignoff

describe('aggregateStoryVerdict', () => {
  it('is proven only when every feature is proven', () => {
    expect(aggregateStoryVerdict([fs('proven'), fs('proven')], undefined).key).toBe('proven')
    expect(aggregateStoryVerdict([fs('proven')], undefined).title).toBe('The feature is proven')
    expect(aggregateStoryVerdict([fs('proven'), fs('proven')], undefined).title).toBe(
      'All 2 features proven',
    )
  })

  it('lets a single failure win over any number of proven features', () => {
    const v = aggregateStoryVerdict(
      [fs('proven'), fs('failed', 'Checkout'), fs('proven')],
      undefined,
    )
    expect(v.key).toBe('failed')
    expect(v.title).toBe('1 of 3 features failed')
    expect(v.detail).toContain('Checkout')
  })

  it('is partly when proven mixes with anything not yet proven', () => {
    expect(aggregateStoryVerdict([fs('proven'), fs('partly')], undefined).key).toBe('partly')
    expect(aggregateStoryVerdict([fs('proven'), fs('not-run')], undefined).key).toBe('partly')
    expect(aggregateStoryVerdict([fs('proven'), fs('not-run')], undefined).title).toBe(
      '1 of 2 features proven',
    )
  })

  it('is partly (not not-run) when features passed what ran but nothing is fully proven', () => {
    const v = aggregateStoryVerdict([fs('partly'), fs('partly')], undefined)
    expect(v.key).toBe('partly')
    expect(v.title).toBe('Nothing is fully proven yet')
  })

  it('is not-run only when nothing has a verdict at all', () => {
    expect(aggregateStoryVerdict([fs('not-run'), fs('not-run')], undefined).key).toBe('not-run')
    expect(aggregateStoryVerdict([], undefined).key).toBe('not-run')
  })

  it('demotes an all-proven story to partly when the story itself is unfinished', () => {
    const v = aggregateStoryVerdict([fs('proven'), fs('proven')], '1 of 3 features are unfinished')
    expect(v.key).toBe('partly')
    expect(v.title).toBe(STORY_UNFINISHED_TITLE)
    expect(v.detail).toBe('1 of 3 features are unfinished')
  })

  it('lets a failure win even when the story is unfinished', () => {
    // Incompleteness must not mask a real failure — failure is the harder signal.
    const v = aggregateStoryVerdict([fs('proven'), fs('failed')], 'a feature is unfinished')
    expect(v.key).toBe('failed')
  })

  it('never calls a story proven when a person accepted a feature over the gate', () => {
    const v = aggregateStoryVerdict([fs('proven'), acceptedFs('Checkout')], undefined)
    expect(v.key).toBe('partly')
    expect(v.title).toBe('1 of 2 features proven · 1 accepted by you')
    expect(v.detail).toBe('Accepted by you without the gate passing it: Checkout.')
  })

  it('names every accepted feature when nothing else is open', () => {
    const v = aggregateStoryVerdict([acceptedFs('Checkout'), acceptedFs('Cart')], undefined)
    expect(v.key).toBe('partly')
    expect(v.title).toBe('0 of 2 features proven · 2 accepted by you')
    expect(v.detail).toBe('Accepted by you without the gate passing them: Checkout · Cart.')
  })

  it('does not count an accepted feature as one still to prove', () => {
    const v = aggregateStoryVerdict(
      [fs('proven'), acceptedFs('Checkout'), fs('not-run')],
      undefined,
    )
    expect(v.title).toBe('1 of 3 features proven')
    expect(v.detail).toBe('1 still needs proving. 1 accepted by you without the gate passing it.')
  })

  it('does not read an accepted feature as one that passed what ran', () => {
    const v = aggregateStoryVerdict([acceptedFs('Checkout'), fs('not-run')], undefined)
    expect(v.key).toBe('partly')
    expect(v.title).toBe('Nothing is proven yet')
    expect(v.detail).toBe('1 accepted by you without the gate passing it.')
  })

  it('lets an unfinished story outrank acceptance, and a failure outrank both', () => {
    expect(aggregateStoryVerdict([acceptedFs('A')], 'a feature is unfinished').title).toBe(
      STORY_UNFINISHED_TITLE,
    )
    expect(aggregateStoryVerdict([acceptedFs('A'), fs('failed')], undefined).key).toBe('failed')
  })
})

// --- buildStorySignoff join/ordering/attribution ---

const run = (over: Partial<StorySignoffRun>): StorySignoffRun =>
  ({ id: 'r', createdAt: 1, ...over }) as StorySignoffRun

const proc = (
  id: string,
  featureId: string | undefined,
  runIds: string[] = [],
): StorySignoffProcessRun =>
  ({
    id,
    featureId,
    ledger: runIds.map((runId) => ({ runRef: { runId } })),
  }) as StorySignoffProcessRun

const ev = (over: Partial<ReviewEvidenceRef>): ReviewEvidenceRef =>
  ({
    id: 'e',
    runId: 'r',
    projectId: 'p',
    kind: 'report',
    path: 'x',
    mediaType: 'text/markdown',
    bytes: 10,
    createdAt: 1,
    ...over,
  }) as ReviewEvidenceRef

const passedVerification = (): RunVerification =>
  ({
    status: 'passed',
    checks: [
      {
        id: 'c1',
        label: 'Unit tests',
        kind: 'tests',
        status: 'passed',
        durationMs: 10,
        summary: '5 passed',
      },
    ],
    uncheckedReason: { kind: 'nothing-declared' },
    startedAt: 1,
    finishedAt: 2,
  }) as RunVerification

const features = [
  { id: 'f1', title: 'One' },
  { id: 'f2', title: 'Two' },
]

describe('buildStorySignoff', () => {
  it('attributes a run to its feature via the child process run id', () => {
    const signoff = buildStorySignoff({
      features,
      processRuns: [proc('pr1', 'f1'), proc('pr2', 'f2')],
      cliRuns: [run({ id: 'ra', processRunId: 'pr1' }), run({ id: 'rb', processRunId: 'pr2' })],
      evidence: [],
    })
    expect(signoff.features.map((f) => f.featureId)).toEqual(['f2', 'f1'])
    expect(signoff.features.find((f) => f.featureId === 'f1')?.runId).toBe('ra')
    expect(signoff.features.find((f) => f.featureId === 'f2')?.runId).toBe('rb')
  })

  it('falls back to the ledger runRef when a run carries no processRunId', () => {
    // A different attribution SHAPE: the link is on the ledger, not the run.
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1', ['ra'])],
      cliRuns: [run({ id: 'ra' })],
      evidence: [],
    })
    expect(signoff.features).toHaveLength(1)
    expect(signoff.features[0].runId).toBe('ra')
  })

  it('orders features newest-first and drops features that produced no run', () => {
    const signoff = buildStorySignoff({
      features: [
        { id: 'f1', title: 'One' },
        { id: 'f2', title: 'Two' },
        { id: 'f3', title: 'Three' },
      ],
      processRuns: [proc('pr1', 'f1'), proc('pr3', 'f3')],
      cliRuns: [run({ id: 'ra', processRunId: 'pr1' }), run({ id: 'rc', processRunId: 'pr3' })],
      evidence: [],
    })
    // f2 never ran → no section; f3 (later) before f1.
    expect(signoff.features.map((f) => f.featureId)).toEqual(['f3', 'f1'])
    expect(signoff.digest.total).toBe(2)
  })

  it('picks the latest DECIDED run when a feature has several', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1')],
      cliRuns: [
        // A later run with no verdict must NOT beat an earlier decided one only
        // when neither is decided; here the decided remedy run is also latest.
        run({ id: 'first', processRunId: 'pr1', createdAt: 1, verification: passedVerification() }),
        run({
          id: 'remedy',
          processRunId: 'pr1',
          createdAt: 3,
          verification: passedVerification(),
        }),
        run({ id: 'stray', processRunId: 'pr1', createdAt: 2 }),
      ],
      evidence: [],
    })
    expect(signoff.features[0].runId).toBe('remedy')
    expect(signoff.features[0].verified).toBe(true)
  })

  it('sums cost and duration across features, and drops a label when nothing recorded', () => {
    const withCost = buildStorySignoff({
      features,
      processRuns: [proc('pr1', 'f1'), proc('pr2', 'f2')],
      cliRuns: [
        run({ id: 'ra', processRunId: 'pr1', costUSD: 0.25, durationMs: 1000 }),
        run({ id: 'rb', processRunId: 'pr2', costUSD: 0.75, durationMs: 2000 }),
      ],
      evidence: [],
    })
    expect(withCost.facts.costLabel).toBe('$1.00')
    expect(withCost.facts.durationLabel).toBeDefined()

    const noCost = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1')],
      cliRuns: [run({ id: 'ra', processRunId: 'pr1' })],
      evidence: [],
    })
    expect(noCost.facts.costLabel).toBeUndefined()
    expect(noCost.facts.durationLabel).toBeUndefined()
  })

  it('feeds each feature only its OWN evidence into the chips', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1')],
      cliRuns: [run({ id: 'ra', processRunId: 'pr1', verification: passedVerification() })],
      // A report filed for f1, and one for a different feature that must not leak in.
      evidence: [
        ev({ id: 'own', featureId: 'f1', kind: 'report' }),
        ev({ id: 'other', featureId: 'f2', kind: 'report' }),
      ],
    })
    const report = signoff.features[0].rows.find((r) => r.id === 'report')
    expect(report?.state).toBe('passed')
    expect(report?.detail).toContain('report')
  })
})

// --- agents, the Overall section, and the digest line ---

/** A process run that carries a plan (roles) AND ledger (run↔step) attribution. */
const procRoles = (
  id: string,
  featureId: string | undefined,
  entries: Array<{ stepId: string; runId: string }>,
  steps: Array<{ id: string; agentType?: string }>,
): StorySignoffProcessRun =>
  ({
    id,
    featureId,
    plan: { steps },
    ledger: entries.map((e) => ({ stepId: e.stepId, runRef: { runId: e.runId } })),
  }) as unknown as StorySignoffProcessRun

const check = (
  over: Partial<VerificationCheckResult> & Pick<VerificationCheckResult, 'id' | 'kind' | 'status'>,
): VerificationCheckResult =>
  ({ label: over.id, durationMs: 0, summary: '', ...over }) as VerificationCheckResult

const verifWith = (checks: VerificationCheckResult[]): RunVerification =>
  ({ status: 'passed', checks, startedAt: 1, finishedAt: 2 }) as RunVerification

describe('buildStorySignoff — agents', () => {
  it('names the agents that ran a feature — developer and verifier, latest run per role', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [
        procRoles(
          'pr1',
          'f1',
          // A fix loop: two developer attempts around one verify.
          [
            { stepId: 'implement', runId: 'dev1' },
            { stepId: 'verify', runId: 'ver1' },
            { stepId: 'implement', runId: 'dev2' },
          ],
          [
            { id: 'implement', agentType: 'developer' },
            { id: 'verify', agentType: 'verifier' },
          ],
        ),
      ],
      cliRuns: [
        run({ id: 'dev1', processRunId: 'pr1', createdAt: 1, modelId: 'gpt-5-codex' }),
        run({
          id: 'ver1',
          processRunId: 'pr1',
          createdAt: 2,
          modelId: 'claude-sonnet-5',
          verification: passedVerification(),
        }),
        run({ id: 'dev2', processRunId: 'pr1', createdAt: 3, modelId: 'gpt-5-codex-2' }),
      ],
      evidence: [],
    })
    const agents = signoff.features[0].agents
    // developer FIRST, then verifier — the order work happens in.
    expect(agents.map((a) => a.role)).toEqual(['developer', 'verifier'])
    // The LATEST developer run's model, not the first attempt's.
    expect(agents.find((a) => a.role === 'developer')?.model.model).toBe('gpt-5-codex-2')
    expect(agents.find((a) => a.role === 'verifier')?.model.model).toBe('claude-sonnet-5')
  })

  it('leaves agents empty when the process run carries no plan (no role to read)', () => {
    // A DIFFERENT shape: attribution present, roles absent.
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1', ['ra'])],
      cliRuns: [run({ id: 'ra', modelId: 'x' })],
      evidence: [],
    })
    expect(signoff.features[0].agents).toEqual([])
  })
})

describe('buildStorySignoff — the Overall section', () => {
  it('aggregates the story-wide checks across features, keeping the latest per check id', () => {
    const signoff = buildStorySignoff({
      features: [
        { id: 'f1', title: 'One' },
        { id: 'f2', title: 'Two' },
      ],
      processRuns: [proc('pr1', 'f1'), proc('pr2', 'f2')],
      cliRuns: [
        run({
          id: 'ra',
          processRunId: 'pr1',
          createdAt: 1,
          verification: verifWith([check({ id: 'unit', kind: 'tests', status: 'passed' })]),
        }),
        run({
          id: 'rb',
          processRunId: 'pr2',
          createdAt: 2,
          verification: verifWith([
            check({ id: 'unit', kind: 'tests', status: 'passed' }),
            check({ id: 'tsc', kind: 'compile', status: 'passed' }),
          ]),
        }),
      ],
      evidence: [],
    })
    const overall = signoff.overall
    expect(overall).toBeDefined()
    // Story-wide capabilities ONLY — a feature-scoped screens/report chip never
    // belongs to the Overall.
    const overallIds = new Set(overall?.rows.map((r) => r.id))
    expect(overallIds.has('screens')).toBe(false)
    expect(overallIds.has('report')).toBe(false)
    expect(overall?.rows.find((r) => r.id === 'tests')?.state).toBe('passed')
    expect(overall?.rows.find((r) => r.id === 'types')?.state).toBe('passed')
    expect(overall?.allGreen).toBe(true)
  })

  it('marks the Overall not-all-green when a story-wide check failed', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1')],
      cliRuns: [
        run({
          id: 'ra',
          processRunId: 'pr1',
          createdAt: 1,
          verification: verifWith([check({ id: 'unit', kind: 'tests', status: 'failed' })]),
        }),
      ],
      evidence: [],
    })
    expect(signoff.overall?.allGreen).toBe(false)
    expect(signoff.overall?.rows.find((r) => r.id === 'tests')?.state).toBe('failed')
  })

  it('routes a story-scoped run and walkthrough to the Overall, not to any feature', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [
        proc('pr1', 'f1'),
        // The root story run that launched the overall walkthrough capture.
        procRoles(
          'root',
          undefined,
          [{ stepId: 'walkthrough', runId: 'wt' }],
          [{ id: 'walkthrough', agentType: 'verifier' }],
        ),
      ],
      cliRuns: [
        run({
          id: 'ra',
          processRunId: 'pr1',
          createdAt: 1,
          costUSD: 0.1,
          durationMs: 1000,
          verification: passedVerification(),
        }),
        run({ id: 'wt', processRunId: 'root', createdAt: 2, costUSD: 0.05, durationMs: 500 }),
      ],
      evidence: [ev({ id: 'rec', featureId: undefined, kind: 'recording' })],
    })
    // The story-scoped run is not a feature section.
    expect(signoff.features).toHaveLength(1)
    expect(signoff.features[0].runId).toBe('ra')
    // Overall facts = the story-scoped run only; head total spans both.
    expect(signoff.overall?.facts.costLabel).toBe('$0.05')
    expect(signoff.facts.costLabel).toBe('$0.15')
    // Its agent is read from the root run's plan role.
    expect(signoff.overall?.agents.some((a) => a.role === 'verifier')).toBe(true)
  })
})

describe("buildStorySignoff — time and cost are the pipeline's", () => {
  const MIN = 60_000
  const plan = (steps: Array<{ id: string; kind: string }>) =>
    ({
      steps: steps.map((s) => ({ ...s, name: s.id })),
      loops: [],
    }) as unknown as ProcessRun['plan']
  const totals = (
    over: Partial<NonNullable<ProcessRun['totals']>>,
  ): NonNullable<ProcessRun['totals']> => ({ workMs: 0, ticking: false, at: 0, steps: {}, ...over })

  const featureStep = (id: string, featureId: string) => ({
    id,
    kind: 'process',
    subject: { kind: 'feature', id: featureId, title: featureId },
  })

  // A feature retried under one root: its step totals are both children's work.
  const root = {
    id: 'root',
    ledger: [],
    plan: plan([
      featureStep('features:f1', 'f1'),
      { id: 'walkthrough', kind: 'capture' },
      { id: 'sign-off', kind: 'gate' },
    ]),
    totals: totals({
      workMs: 53 * MIN,
      costUsd: 0.19,
      unpricedTokens: 65_400_000,
      steps: {
        'features:f1': { workMs: 47 * MIN, unpricedTokens: 65_400_000, attempts: [] },
        walkthrough: { workMs: 6 * MIN, costUsd: 0.19, attempts: [] },
        'sign-off': { workMs: 0, attempts: [] },
      },
    }),
  } as unknown as StorySignoffProcessRun
  const child = (id: string, workMs: number, parentRunId = 'root', featureId = 'f1') =>
    ({
      id,
      featureId,
      parentRunId,
      ledger: [],
      plan: plan([{ id: 'implement', kind: 'agent' }]),
      totals: totals({ workMs, unpricedTokens: 32_700_000 }),
    }) as StorySignoffProcessRun

  const signoff = () =>
    buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [root, child('old', 3 * MIN), child('pr1', 44 * MIN)],
      // A CLI record that priced an unpriced model at a guess must not leak into the head.
      cliRuns: [run({ id: 'ra', processRunId: 'pr1', costUSD: 30.25, durationMs: 9 * MIN })],
      evidence: [ev({ id: 'rec', featureId: undefined, kind: 'recording' })],
    })

  it("heads the story with the root run's totals — every attempt, and tokens it could not price", () => {
    expect(signoff().facts).toEqual({
      durationLabel: '53m 00s',
      costLabel: '$0.19 + 65.4M unpriced tokens',
    })
  })

  it("gives a feature the pipeline's step for it — every child that ran it, not the newest alone", () => {
    expect(signoff().features[0].facts).toEqual({
      durationLabel: '47m 00s',
      costLabel: '65.4M unpriced tokens',
    })
  })

  it("gives the Overall the story's own steps, never its features", () => {
    expect(signoff().overall?.facts).toEqual({ durationLabel: '6m 00s', costLabel: '$0.19' })
  })

  describe('a story relaunched as a second root', () => {
    const rootRun = (id: string, f1: number, walkthrough: number, cost: number) =>
      ({
        id,
        ledger: [],
        plan: plan([
          featureStep(`${id}:f1`, 'f1'),
          featureStep(`${id}:f2`, 'f2'),
          { id: 'walkthrough', kind: 'capture' },
        ]),
        totals: totals({
          workMs: (f1 + walkthrough) * MIN,
          costUsd: cost,
          steps: {
            [`${id}:f1`]: { workMs: f1 * MIN, costUsd: cost, attempts: [] },
            walkthrough: { workMs: walkthrough * MIN, attempts: [] },
          },
        }),
      }) as unknown as StorySignoffProcessRun

    const relaunched = () =>
      buildStorySignoff({
        features: [
          { id: 'f1', title: 'One' },
          { id: 'f2', title: 'Two' },
        ],
        processRuns: [
          rootRun('r2', 1, 2, 1),
          child('c2', 1 * MIN, 'r2'),
          rootRun('r1', 50, 10, 20),
          child('c1', 50 * MIN, 'r1'),
          { ...child('c-f2', 0, 'r1', 'f2'), totals: undefined },
        ],
        cliRuns: [
          run({ id: 'd1', processRunId: 'c1' }),
          run({ id: 'd2', processRunId: 'c2' }),
          run({ id: 'd3', processRunId: 'c-f2', costUSD: 2.5, durationMs: 4 * MIN }),
        ],
        evidence: [ev({ id: 'rec', featureId: undefined, kind: 'recording' })],
      })

    it('heads the story with every root it ran under', () => {
      expect(relaunched().facts).toEqual({ durationLabel: '1h 03m', costLabel: '$21.00' })
    })

    it('gives a feature its steps across every root', () => {
      const f1 = relaunched().features.find((f) => f.featureId === 'f1')
      expect(f1?.facts).toEqual({ durationLabel: '51m 00s', costLabel: '$21.00' })
    })

    it('leaves a feature no root measured without numbers rather than a CLI guess', () => {
      const f2 = relaunched().features.find((f) => f.featureId === 'f2')
      expect(f2?.facts).toEqual({ durationLabel: undefined, costLabel: undefined })
    })

    it("sums the story's own steps across every root for the Overall", () => {
      expect(relaunched().overall?.facts).toEqual({
        durationLabel: '12m 00s',
        costLabel: undefined,
      })
    })
  })

  it('counts a root that is itself one feature’s run wholly to that feature, never the Overall', () => {
    const standalone = { ...child('solo', 7 * MIN), parentRunId: undefined }
    const story = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [standalone],
      cliRuns: [run({ id: 'ra', processRunId: 'solo' })],
      evidence: [ev({ id: 'rec', featureId: undefined, kind: 'recording' })],
    })
    expect(story.features[0].facts).toEqual({
      durationLabel: '7m 00s',
      costLabel: '32.7M unpriced tokens',
    })
    expect(story.facts.durationLabel).toBe('7m 00s')
    expect(story.overall?.facts).toEqual({ durationLabel: undefined, costLabel: undefined })
  })
})

describe('buildStorySignoff — the digest', () => {
  it('tones the headline by the story verdict and summarises in one line', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1')],
      cliRuns: [
        run({
          id: 'ra',
          processRunId: 'pr1',
          createdAt: 1,
          verification: verifWith([check({ id: 'unit', kind: 'tests', status: 'failed' })]),
        }),
      ],
      evidence: [ev({ id: 'rec', featureId: undefined, kind: 'recording' })],
    })
    expect(signoff.verdict.key).toBe('failed')
    expect(signoff.digest.headline).toBe('A check did not pass')
    expect(signoff.digest.line).toContain('0 of 1 feature verified')
    expect(signoff.digest.line).toContain('1 check failed')
    expect(signoff.digest.line).toContain('1 walkthrough')
  })
})

describe('buildStorySignoff — the accepted verify attempt', () => {
  const plan = {
    steps: [
      { id: 'implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', kind: 'agent', agentType: 'verifier' },
    ],
    loops: [],
  }
  const child = (
    id: string,
    featureId: string | undefined,
    ledger: Record<string, unknown>[],
  ): StorySignoffProcessRun =>
    ({
      id,
      featureId,
      plan,
      ledger: ledger.map((e) => ({ iteration: 1, status: 'done', ...e })),
    }) as unknown as StorySignoffProcessRun
  const dryProof = { mode: 'dry', pairs: [], newScreenIds: ['a-new'], recordingIds: [] }

  it('carries the attempt each feature was accepted on, read from its own child run', () => {
    const signoff = buildStorySignoff({
      features,
      processRuns: [
        child('pr1', 'f1', [
          { id: 'i1', stepId: 'implement', runRef: { runId: 'dev1' }, startedAt: 0, endedAt: 5 },
          { id: 'v1', stepId: 'verify', outcome: 'failed', startedAt: 10, endedAt: 15 },
          {
            id: 'v2',
            stepId: 'verify',
            outcome: 'passed',
            startedAt: 20,
            endedAt: 25,
            proof: dryProof,
          },
        ]),
        child('pr2', 'f2', [
          { id: 'i2', stepId: 'implement', runRef: { runId: 'dev2' }, startedAt: 0, endedAt: 5 },
          { id: 'v3', stepId: 'verify', outcome: 'failed', startedAt: 30, endedAt: 35 },
        ]),
        child('root', undefined, [
          { id: 'v-root', stepId: 'verify', outcome: 'passed', startedAt: 99 },
        ]),
      ],
      cliRuns: [run({ id: 'dev1', processRunId: 'pr1' }), run({ id: 'dev2', processRunId: 'pr2' })],
      evidence: [],
    })
    const f1 = signoff.features.find((f) => f.featureId === 'f1')
    const f2 = signoff.features.find((f) => f.featureId === 'f2')
    expect(f1?.verify?.accepted.entry.id).toBe('v2')
    expect(f1?.verify?.accepted.entry.proof?.mode).toBe('dry')
    expect(f1?.verify?.accepted.review).toEqual({
      reviewedRunId: 'dev1',
      filedSince: 20,
      filedUntil: 25,
    })
    expect(f1?.verify?.others.map((o) => o.entry.id)).toEqual(['v1'])
    expect(f2?.verify?.accepted.entry.id).toBe('v3')
    expect(f2?.verify?.accepted.entry.outcome).toBe('failed')
  })

  const gated = (
    verifyEntry: Record<string, unknown>,
    verification?: RunVerification,
  ): FeatureSignoff =>
    buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [
        child('pr1', 'f1', [
          { id: 'i1', stepId: 'implement', runRef: { runId: 'dev1' }, startedAt: 0, endedAt: 5 },
          { id: 'v1', stepId: 'verify', startedAt: 10, endedAt: 15, ...verifyEntry },
        ]),
      ],
      cliRuns: [
        run({ id: 'dev1', processRunId: 'pr1', ...(verification ? { verification } : {}) }),
      ],
      evidence: [],
    }).features[0]

  const failingChecks = verifWith([
    check({ id: 'lint', kind: 'command', status: 'failed', summary: '3 lint errors' }),
    check({ id: 'unit', kind: 'tests', status: 'passed', summary: '10 passed' }),
  ])

  it('heads a feature with the verify gate’s pass, even over a failing check it still lists', () => {
    const f = gated(
      { outcome: 'passed', proof: dryProof, summary: '1 new screen the change adds.' },
      failingChecks,
    )
    expect(f.statusLine).toEqual({ tone: 'done', label: 'Verify passed' })
    expect(f.verdict.key).toBe('proven')
    expect(f.verdict.detail).toBe('1 new screen the change adds.')
    expect(f.standing).toBe('passed')
    expect(f.rows.some((r) => r.state === 'failed')).toBe(true)
  })

  it('heads a feature with the verify gate’s failure, even over checks that all passed', () => {
    const f = gated(
      { outcome: 'failed', summary: 'No pair shows the change.' },
      passedVerification(),
    )
    expect(f.statusLine).toEqual({ tone: 'stuck', label: 'Verify failed' })
    expect(f.verdict.key).toBe('failed')
    expect(f.verdict.detail).toBe('No pair shows the change.')
  })

  it('never reads an unconfirmed proof as a failure', () => {
    const f = gated(
      { outcome: 'unchecked', summary: 'The reviewer did not say whether it ran on live data.' },
      passedVerification(),
    )
    expect(f.statusLine.tone).toBe('review')
    expect(f.verdict.key).toBe('partly')
    expect(f.verdict.detail).toBe('The reviewer did not say whether it ran on live data.')
  })

  it('heads a feature a person accepted over the gate as accepted by them, saying what the gate said', () => {
    const f = gated({
      outcome: 'failed',
      summary: 'No pair shows the change.',
      override: { choice: 'continue', at: 20 },
    })
    expect(f.statusLine).toEqual({ tone: 'review', label: 'Accepted by you' })
    expect(f.standing).toBe('accepted')
    expect(f.verdict.key).toBe('partly')
    expect(f.verdict.title).toBe('Accepted by you')
    expect(f.verdict.detail).toBe('The gate did not pass it: No pair shows the change.')
  })

  it('reads a verify still running as not yet verified', () => {
    const f = gated({ status: 'running', endedAt: undefined })
    expect(f.statusLine).toEqual({ tone: 'review', label: 'Verifying…' })
    expect(f.verdict.key).toBe('not-run')
    expect(f.standing).toBe('running')
  })

  it('heads a feature no verify gate judged by its checks, and says so', () => {
    const fromChecks = (verification: RunVerification | undefined) =>
      buildStorySignoff({
        features: [{ id: 'f1', title: 'One' }],
        processRuns: [proc('pr1', 'f1', ['ra'])],
        cliRuns: [run({ id: 'ra', ...(verification ? { verification } : {}) })],
        evidence: [],
      }).features[0]
    expect(fromChecks(failingChecks).statusLine).toEqual({ tone: 'stuck', label: 'Checks failed' })
    expect(fromChecks(passedVerification()).statusLine).toEqual({
      tone: 'review',
      label: 'Partly checked',
    })
    expect(fromChecks(undefined).statusLine).toEqual({ tone: 'review', label: 'Not verified' })
    expect(fromChecks(undefined).standing).toBeUndefined()
  })

  it('carries a feature’s gate outcome into the story verdict', () => {
    const story = (outcome: string, override?: Record<string, unknown>) =>
      buildStorySignoff({
        features: [{ id: 'f1', title: 'One' }],
        processRuns: [
          child('pr1', 'f1', [
            { id: 'i1', stepId: 'implement', runRef: { runId: 'dev1' }, startedAt: 0, endedAt: 5 },
            { id: 'v1', stepId: 'verify', outcome, startedAt: 10, endedAt: 15, ...override },
          ]),
        ],
        cliRuns: [run({ id: 'dev1', processRunId: 'pr1', verification: failingChecks })],
        evidence: [],
      })
    expect(story('passed').verdict.key).toBe('proven')
    expect(story('unchecked', { override: { choice: 'approve', at: 20 } }).verdict.title).toBe(
      '0 of 1 feature proven · 1 accepted by you',
    )
    expect(story('passed').digest.line).toContain('1 of 1 feature verified')
    expect(story('unchecked', { override: { choice: 'approve', at: 20 } }).digest).toMatchObject({
      accepted: 1,
      proven: 0,
    })
    expect(story('unchecked', { override: { choice: 'approve', at: 20 } }).digest.line).toContain(
      '1 accepted by you',
    )
  })

  it('has no accepted attempt for a feature whose runs never verified', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1', ['ra'])],
      cliRuns: [run({ id: 'ra' })],
      evidence: [],
    })
    expect(signoff.features[0].verify).toBeUndefined()
  })
})
