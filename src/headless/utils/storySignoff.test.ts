import { describe, expect, it } from 'vitest'

import type { ReviewEvidenceRef, RunVerification, VerificationCheckResult } from '../api/generated'
import { STORY_UNFINISHED_TITLE } from './checkMethodConstants'
import type { FeatureSignoff, StorySignoffProcessRun, StorySignoffRun } from './storySignoffTypes'
import { aggregateStoryVerdict, buildStorySignoff } from './storySignoff'

// A FeatureSignoff reduced to just what the aggregate reads — its verdict key
// and title. Shapes vary by the MULTISET of keys, which is what the worst-wins
// rule turns on.
const fs = (key: FeatureSignoff['verdict']['key'], title: string = key): FeatureSignoff =>
  ({ title, verdict: { key } }) as FeatureSignoff

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
