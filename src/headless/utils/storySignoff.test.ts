import { describe, expect, it } from 'vitest'
import {
  CODE_REVIEW_APPROACH,
  FEATURE_REPORT_APPROACH,
  FINAL_REPORT_APPROACH,
} from 'thefactory-tools/constants'
import type { ProcessRun } from 'thefactory-tools/types'

import type { ReviewEvidenceRef, RunVerification, VerificationCheckResult } from '../api/generated'
import { STORY_UNFINISHED_TITLE } from './checkMethodConstants'
import type { FeatureSignoff, StorySignoffProcessRun, StorySignoffRun } from './storySignoffTypes'
import {
  aggregateStoryVerdict,
  buildStorySignoff,
  signoffEvidence,
  signoffLoadStatus,
  signoffSectionProps,
  signoffSections,
} from './storySignoff'
import { toEvidenceTile } from './reviewEvidenceView'
import { featureVerifyView } from './verifyProof'
import { costDetailsView } from './costDetails'

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

/**
 * A claude-code run on an API key as its runner stamps it: billed per token,
 * its one model's row priced at `costUsd`.
 */
const meteredRun = (costUsd: number): Partial<StorySignoffRun> => ({
  cli: { tool: 'claude-code', version: '2.1.258' },
  status: 'succeeded',
  billing: 'metered',
  reportedModel: 'claude-sonnet-5',
  modelUsage: [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      billing: 'metered',
      inputTokens: 36,
      outputTokens: 6623,
      cacheReadTokens: 1_248_888,
      cacheWriteTokens: 52_624,
      costUsd,
      listCostUsd: costUsd,
    },
  ],
})

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
        run({ id: 'ra', processRunId: 'pr1', ...meteredRun(0.25), durationMs: 1000 }),
        run({ id: 'rb', processRunId: 'pr2', ...meteredRun(0.75), durationMs: 2000 }),
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
        ev({ id: 'own', runId: 'ra', featureId: 'f1', kind: 'report' }),
        ev({ id: 'other', runId: 'ra', featureId: 'f2', kind: 'report' }),
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
    expect(overall?.statusLine).toEqual({ tone: 'done', label: 'All green' })
  })

  it('heads the Overall as failed when a story-wide check failed', () => {
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
    expect(signoff.overall?.statusLine).toEqual({ tone: 'stuck', label: 'Checks failed' })
    expect(signoff.overall?.rows.find((r) => r.id === 'tests')?.state).toBe('failed')
  })

  it('routes a story-scoped run and walkthrough to the Overall, not to any feature', () => {
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [
        { ...proc('pr1', 'f1'), parentRunId: 'root' },
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
          ...meteredRun(0.1),
          durationMs: 1000,
          verification: passedVerification(),
        }),
        run({
          id: 'wt',
          processRunId: 'root',
          createdAt: 2,
          ...meteredRun(0.05),
          durationMs: 500,
        }),
      ],
      evidence: [ev({ id: 'rec', runId: 'wt', featureId: undefined, kind: 'recording' })],
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

  const root = {
    id: 'root',
    startedAt: 0,
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
  const child = (
    id: string,
    workMs: number,
    startedAt: number,
    parentRunId = 'root',
    featureId = 'f1',
  ) =>
    ({
      id,
      featureId,
      parentRunId,
      startedAt,
      ledger: [],
      plan: plan([{ id: 'implement', kind: 'agent' }]),
      totals: totals({ workMs, unpricedTokens: 32_700_000 }),
    }) as StorySignoffProcessRun

  const signoff = () =>
    buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [root, child('old', 3 * MIN, 1), child('pr1', 44 * MIN, 2)],
      cliRuns: [run({ id: 'ra', processRunId: 'pr1', ...meteredRun(30.25), durationMs: 9 * MIN })],
      evidence: [ev({ id: 'rec', runId: 'ra', featureId: undefined, kind: 'recording' })],
      storyRunId: 'root',
    })

  it('heads the story with its latest feature runs and its own steps — the charge on the chip, unpriced tokens in its details', () => {
    expect(signoff().facts).toEqual({
      durationLabel: '50m 00s',
      costLabel: '$0.19',
      cost: { costUsd: 0.19, unpricedTokens: 32_700_000 },
    })
  })

  it('gives a feature relaunched under one story run its newest run alone, never a CLI guess', () => {
    expect(signoff().features[0].facts).toEqual({
      durationLabel: '44m 00s',
      costLabel: 'No known price',
      cost: { unpricedTokens: 32_700_000 },
    })
  })

  it("gives the Overall the story's own steps, never its features", () => {
    expect(signoff().overall?.facts).toEqual({
      durationLabel: '6m 00s',
      costLabel: '$0.19',
      cost: { costUsd: 0.19 },
    })
  })

  describe('a story relaunched as a second root', () => {
    const rootRun = (
      id: string,
      startedAt: number,
      f1: number,
      walkthrough: number,
      cost: number,
    ) =>
      ({
        id,
        startedAt,
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
          rootRun('r2', 200, 1, 2, 1),
          child('c2', 1 * MIN, 200, 'r2'),
          rootRun('r1', 100, 50, 10, 20),
          child('c1', 50 * MIN, 100, 'r1'),
          { ...child('c-f2', 0, 100, 'r1', 'f2'), totals: undefined },
        ],
        cliRuns: [
          run({ id: 'd1', processRunId: 'c1' }),
          run({ id: 'd2', processRunId: 'c2' }),
          run({ id: 'd3', processRunId: 'c-f2', ...meteredRun(2.5), durationMs: 4 * MIN }),
        ],
        evidence: [ev({ id: 'rec', runId: 'd2', featureId: undefined, kind: 'recording' })],
        storyRunId: 'r2',
      })

    it('heads the story with the latest root, never the one before it', () => {
      expect(relaunched().facts).toEqual({
        durationLabel: '3m 00s',
        costLabel: 'No known price',
        cost: { unpricedTokens: 32_700_000 },
      })
    })

    it('gives a feature the run of it under the latest root only', () => {
      const f1 = relaunched().features.find((f) => f.featureId === 'f1')
      expect(f1?.facts).toEqual({
        durationLabel: '1m 00s',
        costLabel: 'No known price',
        cost: { unpricedTokens: 32_700_000 },
      })
    })

    it('leaves a feature its latest run did not measure without numbers rather than a CLI guess', () => {
      const f2 = relaunched().features.find((f) => f.featureId === 'f2')
      expect(f2?.facts).toEqual({ durationLabel: undefined, costLabel: undefined })
    })

    it("gives the Overall the latest root's own steps", () => {
      expect(relaunched().overall?.facts).toEqual({
        durationLabel: '2m 00s',
        costLabel: undefined,
      })
    })
  })

  it('counts a root that is itself one feature’s run wholly to that feature, never the Overall', () => {
    const standalone = { ...child('solo', 7 * MIN, 1), parentRunId: undefined }
    const story = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [standalone],
      cliRuns: [run({ id: 'ra', processRunId: 'solo' })],
      evidence: [ev({ id: 'rec', runId: 'ra', featureId: undefined, kind: 'recording' })],
    })
    expect(story.features[0].facts).toEqual({
      durationLabel: '7m 00s',
      costLabel: 'No known price',
      cost: { unpricedTokens: 32_700_000 },
    })
    expect(story.facts.durationLabel).toBe('7m 00s')
    expect(story.overall?.facts).toEqual({ durationLabel: undefined, costLabel: undefined })
  })
})

describe('buildStorySignoff — cost details', () => {
  const MIN = 60_000
  const composer = (input: number) => ({
    provider: 'cursor',
    model: 'composer-2.5',
    label: 'Composer 2.5',
    billing: 'subscription' as const,
    inputTokens: input,
    outputTokens: 860,
    cacheReadTokens: 8016,
    cacheWriteTokens: 0,
    costUsd: 0,
    listCostUsd: 0.0066657,
  })

  it('opens a subscription story as $0.00 charged, its features merged per model in the details', () => {
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
          durationMs: 2 * MIN,
          billing: 'subscription',
          modelUsage: [composer(5825)],
        }),
        run({
          id: 'rb',
          processRunId: 'pr2',
          createdAt: 2,
          durationMs: MIN,
          billing: 'subscription',
          modelUsage: [composer(1000)],
        }),
      ],
      evidence: [],
    })
    expect(signoff.facts.costLabel).toBe('$0.00')
    expect(signoff.facts.cost).toMatchObject({
      costUsd: 0,
      includedTokens: 14_701 + 9_876,
      listCostUsd: 0.0133314,
      byModel: [{ model: 'composer-2.5', inputTokens: 6825, billing: 'subscription' }],
    })
  })

  it('sums what every run was charged, its known charges included when another of its models has no price', () => {
    const haiku = {
      provider: 'anthropic',
      model: 'claude-haiku-9',
      billing: 'metered' as const,
      inputTokens: 1200,
      outputTokens: 300,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }
    const mixed = meteredRun(5)
    const codex = {
      provider: 'openai',
      model: 'gpt-5.5',
      billing: 'metered' as const,
      inputTokens: 40_120,
      outputTokens: 3_010,
      cacheReadTokens: 88_064,
      cacheWriteTokens: 0,
      costUsd: 1,
      listCostUsd: 1,
    }
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
          ...mixed,
          modelUsage: [...(mixed.modelUsage ?? []), haiku],
        }),
        run({
          id: 'rb',
          processRunId: 'pr2',
          createdAt: 2,
          cli: { tool: 'codex', version: '0.130.0' },
          billing: 'metered',
          modelUsage: [codex],
        }),
      ],
      evidence: [],
    })
    const view = costDetailsView(signoff.facts.cost)
    expect(signoff.facts.costLabel).toBe('$6.00')
    expect(view?.summary[0]).toEqual({ label: 'Charged', value: '$6.00' })
    expect(view?.rows.map((r) => [r.model, r.charged])).toEqual([
      ['gpt-5.5', '$1.00'],
      ['claude-sonnet-5', '$5.00'],
      ['claude-haiku-9', 'Unknown'],
    ])
  })

  it('keeps the pipeline totals to their cost, never the step bookkeeping beside it', () => {
    const measured = {
      id: 'root',
      featureId: 'f1',
      ledger: [],
      plan: { steps: [], loops: [] },
      totals: {
        workMs: 5 * MIN,
        ticking: false,
        at: 0,
        costUsd: 0,
        includedTokens: 14_701,
        byModel: [composer(5825)],
        steps: {},
      },
    } as unknown as StorySignoffProcessRun
    const signoff = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [measured],
      cliRuns: [run({ id: 'ra', processRunId: 'root' })],
      evidence: [],
    })
    expect(signoff.facts.cost).toEqual({
      costUsd: 0,
      includedTokens: 14_701,
      byModel: [composer(5825)],
    })
  })
})

describe('buildStorySignoff — the head', () => {
  const featurePlan = {
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
    ],
    loops: [],
  }
  const gatedRun = (id: string, featureId: string, outcome: string): StorySignoffProcessRun =>
    ({
      id,
      featureId,
      parentRunId: 'root',
      plan: featurePlan,
      ledger: [
        {
          id: `${id}-i`,
          stepId: 'implement',
          iteration: 1,
          status: 'done',
          outcome: 'passed',
          runRef: { runId: `${id}-dev` },
          startedAt: 0,
          endedAt: 5,
        },
        {
          id: `${id}-v`,
          stepId: 'verify',
          iteration: 1,
          status: 'done',
          outcome,
          summary: outcome === 'passed' ? 'The change shows.' : 'No pair shows the change.',
          startedAt: 10,
          endedAt: 15,
        },
      ],
    }) as unknown as StorySignoffProcessRun
  const story = (outcomes: Array<[string, string]>, storyIncomplete?: string) =>
    buildStorySignoff({
      features,
      processRuns: outcomes.map(([featureId, outcome]) =>
        gatedRun(`pr-${featureId}`, featureId, outcome),
      ),
      cliRuns: outcomes.map(([featureId]) =>
        run({ id: `pr-${featureId}-dev`, processRunId: `pr-${featureId}` }),
      ),
      evidence: [],
      ...(storyIncomplete ? { storyIncomplete } : {}),
    })

  it('tallies the proven features beside the verdict, and explains a story that is not proven', () => {
    const signoff = story([
      ['f1', 'passed'],
      ['f2', 'failed'],
    ])
    expect(signoff.verdict.key).toBe('failed')
    expect(signoff.digest.tally).toEqual({ label: '1/2', title: '1 of 2 features proven' })
    expect(signoff.headline).toEqual({ title: '1 of 2 features failed', detail: 'Two' })
  })

  it('says nothing beside a clean all-proven verdict that its tally does not already say', () => {
    const signoff = story([
      ['f1', 'passed'],
      ['f2', 'passed'],
    ])
    expect(signoff.verdict.key).toBe('proven')
    expect(signoff.digest.tally).toEqual({ label: '2/2', title: '2 of 2 features proven' })
    expect(signoff.headline).toBeUndefined()
  })

  it('explains an all-proven story that is still unfinished', () => {
    const signoff = story([['f1', 'passed']], '1 of 2 features are unfinished')
    expect(signoff.digest.tally).toEqual({ label: '1/1', title: '1 of 1 feature proven' })
    expect(signoff.headline).toEqual({
      title: STORY_UNFINISHED_TITLE,
      detail: '1 of 2 features are unfinished',
    })
  })

  it('has no tally before any feature ran', () => {
    const signoff = buildStorySignoff({ features, processRuns: [], cliRuns: [], evidence: [] })
    expect(signoff.digest.tally).toBeUndefined()
    expect(signoff.headline?.title).toBe(signoff.verdict.title)
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
    expect(f1?.verify?.entry.id).toBe('v2')
    expect(f1?.verify?.entry.proof?.mode).toBe('dry')
    expect(f1?.verify?.review).toEqual({
      reviewedRunId: 'dev1',
      filedSince: 20,
      filedUntil: 25,
    })
    expect([f1?.verify?.attempt, f1?.verify?.total]).toEqual([2, 2])
    expect(f2?.verify?.entry.id).toBe('v3')
    expect(f2?.verify?.entry.outcome).toBe('failed')
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
    expect(story('passed').digest.tally?.label).toBe('1/1')
    expect(story('unchecked', { override: { choice: 'approve', at: 20 } }).digest).toMatchObject({
      accepted: 1,
      proven: 0,
      tally: { label: '0/1' },
    })
    expect(story('unchecked', { override: { choice: 'approve', at: 20 } }).headline?.title).toBe(
      '0 of 1 feature proven · 1 accepted by you',
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

describe('buildStorySignoff — the latest run of each feature', () => {
  const MIN = 60_000
  const DAY = 24 * 60 * MIN
  const featurePlan = {
    steps: [
      { id: 'implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', kind: 'agent', agentType: 'verifier' },
      { id: 'report', kind: 'report' },
    ],
    loops: [],
  }
  const rootPlan = (featureIds: string[]) => ({
    steps: [
      ...featureIds.map((id) => ({
        id: `features:${id}`,
        kind: 'process',
        subject: { kind: 'feature', id, title: id },
      })),
      { id: 'walkthrough', kind: 'capture' },
      { id: 'sign-off', kind: 'gate' },
    ],
    loops: [],
  })
  const totals = (workMs: number, costUsd: number, steps: Record<string, number> = {}) => ({
    workMs,
    costUsd,
    ticking: false,
    at: 0,
    steps: Object.fromEntries(
      Object.entries(steps).map(([id, ms]) => [id, { workMs: ms, attempts: [] }]),
    ),
  })
  const entry = (over: Record<string, unknown>) => ({ iteration: 1, status: 'done', ...over })
  const dev = (id: string, runId: string, startedAt: number) =>
    entry({
      id,
      stepId: 'implement',
      outcome: 'passed',
      runRef: { runId },
      startedAt,
      endedAt: startedAt + 5 * MIN,
    })
  const verifyEntry = (id: string, runId: string, outcome: string, startedAt: number) =>
    entry({
      id,
      stepId: 'verify',
      outcome,
      runRef: { runId },
      startedAt,
      endedAt: startedAt + 5 * MIN,
      summary: outcome === 'passed' ? 'The change shows.' : 'Old tooling could not build.',
    })

  const T_OLD = 1_790_000_000_000
  const T_NEW = T_OLD + 4 * DAY

  const oldRoot = {
    id: 'root-old',
    startedAt: T_OLD,
    plan: rootPlan(['f1', 'f2']),
    ledger: [
      entry({ id: 'e-f1-old', stepId: 'features:f1', childRunId: 'f1-old', startedAt: T_OLD }),
      entry({ id: 'e-f2-old', stepId: 'features:f2', childRunId: 'f2-old', startedAt: T_OLD }),
      entry({
        id: 'e-wt-old',
        stepId: 'walkthrough',
        runRef: { runId: 'wt-old' },
        startedAt: T_OLD + 60 * MIN,
      }),
    ],
    totals: totals(170 * MIN, 9, {
      'features:f1': 150 * MIN,
      'features:f2': 10 * MIN,
      walkthrough: 10 * MIN,
    }),
  } as unknown as StorySignoffProcessRun
  const oldF1 = {
    id: 'f1-old',
    featureId: 'f1',
    parentRunId: 'root-old',
    startedAt: T_OLD,
    plan: featurePlan,
    ledger: [0, 1, 2, 3, 4].flatMap((i) => [
      dev(`i-old-${i}`, `dev-old-${i}`, T_OLD + i * 20 * MIN),
      verifyEntry(`v-old-${i}`, `ver-old-${i}`, 'failed', T_OLD + i * 20 * MIN + 10 * MIN),
    ]),
    totals: totals(150 * MIN, 8),
  } as unknown as StorySignoffProcessRun
  const oldF2 = {
    id: 'f2-old',
    featureId: 'f2',
    parentRunId: 'root-old',
    startedAt: T_OLD + 2 * DAY,
    plan: featurePlan,
    ledger: [
      dev('i-f2', 'dev-f2', T_OLD + 2 * DAY),
      verifyEntry('v-f2', 'ver-f2', 'passed', T_OLD + 2 * DAY + 10 * MIN),
    ],
    totals: totals(10 * MIN, 0.5),
  } as unknown as StorySignoffProcessRun
  const newRoot = {
    id: 'root-new',
    startedAt: T_NEW,
    plan: rootPlan(['f1']),
    ledger: [
      entry({ id: 'e-f1-new', stepId: 'features:f1', childRunId: 'f1-new', startedAt: T_NEW }),
      entry({
        id: 'e-wt-new',
        stepId: 'walkthrough',
        runRef: { runId: 'wt-new' },
        startedAt: T_NEW + 23 * MIN,
      }),
      entry({ id: 'e-gate', stepId: 'sign-off', status: 'running', startedAt: T_NEW + 27 * MIN }),
    ],
    totals: totals(27 * MIN, 1.5, { 'features:f1': 23 * MIN, walkthrough: 4 * MIN }),
  } as unknown as StorySignoffProcessRun
  const newF1 = {
    id: 'f1-new',
    featureId: 'f1',
    parentRunId: 'root-new',
    startedAt: T_NEW,
    plan: featurePlan,
    ledger: [
      dev('i-new', 'dev-new', T_NEW),
      verifyEntry('v-new', 'ver-new', 'passed', T_NEW + 10 * MIN),
    ],
    totals: totals(23 * MIN, 1.25),
  } as unknown as StorySignoffProcessRun

  const lintFailed = verifWith([check({ id: 'lint', kind: 'command', status: 'failed' })])
  const unitPassed = verifWith([check({ id: 'unit', kind: 'tests', status: 'passed' })])
  const oldCliRuns = [0, 1, 2, 3, 4].flatMap((i) => [
    run({
      id: `dev-old-${i}`,
      processRunId: 'f1-old',
      createdAt: T_OLD + i * 20 * MIN,
      modelId: 'old-dev-model',
    }),
    run({
      id: `ver-old-${i}`,
      processRunId: 'f1-old',
      createdAt: T_OLD + i * 20 * MIN + 10 * MIN,
      modelId: 'old-verifier-model',
      verification: lintFailed,
    }),
  ])
  const cliRuns = [
    ...oldCliRuns,
    run({ id: 'dev-f2', processRunId: 'f2-old', createdAt: T_OLD + 2 * DAY }),
    run({
      id: 'ver-f2',
      processRunId: 'f2-old',
      createdAt: T_OLD + 2 * DAY + 10 * MIN,
      verification: unitPassed,
    }),
    run({ id: 'dev-new', processRunId: 'f1-new', createdAt: T_NEW, modelId: 'new-dev-model' }),
    run({
      id: 'ver-new',
      processRunId: 'f1-new',
      createdAt: T_NEW + 10 * MIN,
      modelId: 'new-verifier-model',
      verification: unitPassed,
    }),
  ]
  const evidence = [
    ev({ id: 'old-report', runId: 'dev-old-4', featureId: 'f1', kind: 'report', createdAt: T_OLD }),
    ev({
      id: 'old-shot',
      runId: 'dev-old-4',
      featureId: 'f1',
      kind: 'screenshot',
      createdAt: T_OLD,
    }),
    ev({ id: 'old-walkthrough', runId: 'wt-old', kind: 'recording', createdAt: T_OLD }),
    ev({ id: 'new-report', runId: 'dev-new', featureId: 'f1', kind: 'report', createdAt: T_NEW }),
    ev({ id: 'new-walkthrough', runId: 'wt-new', kind: 'recording', createdAt: T_NEW }),
    ev({ id: 'f2-report', runId: 'dev-f2', featureId: 'f2', kind: 'report', createdAt: T_OLD }),
    ev({ id: 'hand-filed', runId: 'manual-chat', featureId: 'f1', kind: 'report' }),
  ]
  const processRuns = [oldRoot, oldF1, oldF2, newRoot, newF1]

  const signoff = (storyRunId?: string) =>
    buildStorySignoff({
      features: [
        { id: 'f1', title: 'One' },
        { id: 'f2', title: 'Two' },
      ],
      processRuns,
      cliRuns,
      evidence,
      ...(storyRunId ? { storyRunId } : {}),
    })
  const f1Of = (s: ReturnType<typeof signoff>) => s.features.find((f) => f.featureId === 'f1')

  it('shows only the verify attempts of the feature run under the story run being signed off', () => {
    const verify = f1Of(signoff('root-new'))?.verify
    expect(verify?.entry.id).toBe('v-new')
    expect([verify?.attempt, verify?.total]).toEqual([1, 1])
  })

  it('reads the feature from the story run it is handed, not merely the newest', () => {
    const verify = f1Of(signoff('root-old'))?.verify
    expect(verify?.entry.id).toBe('v-old-4')
    expect([verify?.attempt, verify?.total]).toEqual([5, 5])
  })

  it('falls back to the newest run of a feature the story run did not run', () => {
    const f2 = signoff('root-new').features.find((f) => f.featureId === 'f2')
    expect(f2?.verify?.entry.id).toBe('v-f2')
    expect(f2?.runId).toBe('ver-f2')
  })

  it('takes the newest story run and its features when none is named', () => {
    expect(f1Of(signoff())?.verify?.entry.id).toBe('v-new')
  })

  it("gives a feature its latest run's time, cost, record and agents only", () => {
    const f1 = f1Of(signoff('root-new'))
    expect(f1?.facts.durationLabel).toBe('23m 00s')
    expect(f1?.facts.costLabel).toBe('$1.25')
    expect(f1?.runId).toBe('ver-new')
    expect(f1?.agents.map((a) => a.model.model)).toEqual(['new-dev-model', 'new-verifier-model'])
  })

  it('builds the story verdict, digest and Overall from the latest runs only', () => {
    const s = signoff('root-new')
    expect(s.verdict.key).toBe('proven')
    expect(s.digest.tally).toEqual({ label: '2/2', title: '2 of 2 features proven' })
    expect(s.overall?.statusLine).toEqual({ tone: 'done', label: 'All green' })
    expect(s.overall?.rows.find((r) => r.id === 'lint')?.state).not.toBe('failed')
  })

  it("heads the story with its latest runs' totals, and the Overall with the story run's own steps", () => {
    const s = signoff('root-new')
    expect(s.overall?.facts.durationLabel).toBe('4m 00s')
    expect(s.facts.durationLabel).toBe('37m 00s')
    expect(s.facts.costLabel).toBe('$1.75')
  })

  it('keeps to the evidence the latest runs filed', () => {
    const shown = signoffEvidence(
      signoff('root-new'),
      evidence.map((ref) => ({ ref })),
    ).map((t) => t.ref.id)
    expect(shown).toEqual(['new-report', 'new-walkthrough', 'f2-report'])
  })

  it('shows every filing when no process run scopes the story', () => {
    const cliOnly = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [],
      cliRuns: [run({ id: 'ra' })],
      evidence,
    })
    expect(
      signoffEvidence(
        cliOnly,
        evidence.map((ref) => ({ ref })),
      ).length,
    ).toBe(evidence.length)
  })
})

describe('signoffLoadStatus', () => {
  it('waits for the runs, the story and the evidence before the sign-off says anything', () => {
    expect(signoffLoadStatus({ runs: 'loading', stories: 'loaded', evidence: 'loaded' })).toBe(
      'loading',
    )
    expect(signoffLoadStatus({ runs: 'loaded', stories: 'loading', evidence: 'loaded' })).toBe(
      'loading',
    )
    expect(signoffLoadStatus({ runs: 'loaded', stories: 'loaded', evidence: 'loading' })).toBe(
      'loading',
    )
    expect(signoffLoadStatus({ runs: 'loaded', stories: 'loaded', evidence: 'loaded' })).toBe(
      'ready',
    )
  })

  it('fails when the runs or the story could not be read, since nothing can be computed', () => {
    expect(signoffLoadStatus({ runs: 'failed', stories: 'loaded', evidence: 'loading' })).toBe(
      'failed',
    )
    expect(signoffLoadStatus({ runs: 'loading', stories: 'failed', evidence: 'loaded' })).toBe(
      'failed',
    )
  })

  it('still signs off when only the evidence failed — each capture says it could not load', () => {
    expect(signoffLoadStatus({ runs: 'loaded', stories: 'loaded', evidence: 'failed' })).toBe(
      'ready',
    )
  })
})

describe('buildStorySignoff — the Overall of a story run that filed nothing story-wide', () => {
  const MIN = 60_000
  const T_OLD = 1_789_981_925_588
  const T_NEW = 1_790_347_372_871
  const SKIPPED = 'The walkthrough filed no recording, so it was skipped.'
  const featurePlan = {
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      { id: 'report', name: 'Report', kind: 'report' },
    ],
    loops: [],
  }
  const rootPlan = {
    steps: [
      {
        id: 'features:f1',
        name: 'Bundled fonts drive the Compose UI',
        kind: 'process',
        subject: { kind: 'feature', id: 'f1', title: 'Bundled fonts drive the Compose UI' },
      },
      {
        id: 'features:f2',
        name: 'WebView HTML uses the bundled fonts',
        kind: 'process',
        subject: { kind: 'feature', id: 'f2', title: 'WebView HTML uses the bundled fonts' },
      },
      { id: 'walkthrough', name: 'Walkthrough', kind: 'capture' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
  }
  const walkthroughEntry = (over: Record<string, unknown>) => ({
    id: 'e-wt',
    stepId: 'walkthrough',
    iteration: 1,
    status: 'done',
    runRef: { runId: 'wt-new', runner: 'api' },
    startedAt: T_NEW + 120 * MIN,
    ...over,
  })
  const storyRun = (walkthrough: Record<string, unknown> | undefined) =>
    ({
      id: 'root-new',
      startedAt: T_NEW,
      plan: rootPlan,
      ledger: [
        {
          id: 'e-f1',
          stepId: 'features:f1',
          iteration: 1,
          status: 'done',
          childRunId: 'f1-new',
          outcome: 'passed',
          startedAt: T_NEW,
        },
        {
          id: 'e-f2',
          stepId: 'features:f2',
          iteration: 1,
          status: 'done',
          childRunId: 'f2-new',
          outcome: 'passed',
          startedAt: T_NEW + 60 * MIN,
        },
        ...(walkthrough ? [walkthroughEntry(walkthrough)] : []),
        { id: 'e-gate', stepId: 'sign-off', iteration: 1, status: 'running', startedAt: T_NEW },
      ],
    }) as unknown as StorySignoffProcessRun
  const oldRoot = {
    id: 'root-old',
    startedAt: T_OLD,
    plan: rootPlan,
    ledger: [
      {
        id: 'e-old-wt',
        stepId: 'walkthrough',
        iteration: 1,
        status: 'done',
        outcome: 'passed',
        runRef: { runId: 'wt-old' },
        startedAt: T_OLD,
      },
    ],
  } as unknown as StorySignoffProcessRun
  const child = (id: string, featureId: string, dev: string, ver: string, at: number) =>
    ({
      id,
      featureId,
      parentRunId: 'root-new',
      startedAt: at,
      plan: featurePlan,
      ledger: [
        {
          id: `${id}-i`,
          stepId: 'implement',
          iteration: 1,
          status: 'done',
          outcome: 'passed',
          runRef: { runId: dev, runner: 'cli' },
          startedAt: at,
          endedAt: at + 20 * MIN,
        },
        {
          id: `${id}-v`,
          stepId: 'verify',
          iteration: 1,
          status: 'done',
          outcome: 'passed',
          summary: '1 before/after pair shows the change, approved by the reviewer.',
          runRef: { runId: ver, runner: 'cli' },
          review: { reviewedRunId: dev, filedSince: at + 20 * MIN, filedUntil: at + 40 * MIN },
          startedAt: at + 20 * MIN,
          endedAt: at + 40 * MIN,
        },
      ],
    }) as unknown as StorySignoffProcessRun
  const nothingDeclared = {
    status: 'unchecked',
    checks: [],
    uncheckedReason: {
      kind: 'nothing-declared',
      summary: 'This project declares no verification checks.',
    },
    startedAt: T_NEW,
    finishedAt: T_NEW,
  } as unknown as RunVerification
  const cliRuns = [
    run({ id: 'dev-1', processRunId: 'f1-new', createdAt: T_NEW, verification: nothingDeclared }),
    run({ id: 'ver-1', processRunId: 'f1-new', createdAt: T_NEW + 20 * MIN }),
    run({
      id: 'dev-2',
      processRunId: 'f2-new',
      createdAt: T_NEW + 60 * MIN,
      verification: nothingDeclared,
    }),
    run({ id: 'ver-2', processRunId: 'f2-new', createdAt: T_NEW + 80 * MIN }),
    run({ id: 'old-verifier', createdAt: T_OLD }),
  ]
  const evidence = [
    ev({ id: 'f1-shot', runId: 'dev-1', featureId: 'f1', kind: 'screenshot', createdAt: T_NEW }),
    ev({ id: 'f1-report', runId: 'dev-1', featureId: 'f1', kind: 'report', createdAt: T_NEW }),
    ev({ id: 'f2-report', runId: 'dev-2', featureId: 'f2', kind: 'report', createdAt: T_NEW }),
    ev({ id: 'old-wide-shot', runId: 'wt-old', featureId: '', kind: 'screenshot' }),
    ev({ id: 'old-wide-report', runId: 'wt-old', featureId: '', kind: 'report' }),
    ev({ id: 'older-wide-report', runId: 'old-verifier', kind: 'report', createdAt: T_OLD }),
  ]
  const signoffOf = (walkthrough: Record<string, unknown> | undefined, extra = evidence) =>
    buildStorySignoff({
      features: [
        { id: 'f1', title: 'Bundled fonts drive the Compose UI' },
        { id: 'f2', title: 'WebView HTML uses the bundled fonts' },
      ],
      processRuns: [
        oldRoot,
        storyRun(walkthrough),
        child('f1-new', 'f1', 'dev-1', 'ver-1', T_NEW),
        child('f2-new', 'f2', 'dev-2', 'ver-2', T_NEW + 60 * MIN),
      ],
      storyRunId: 'root-new',
      cliRuns,
      evidence: extra,
    })

  it('keeps the Overall with its story-wide checks, none of which ran', () => {
    const overall = signoffOf({ outcome: 'skipped', summary: SKIPPED }).overall
    expect(overall).toBeDefined()
    expect(overall?.rows.map((r) => r.id)).toEqual(
      expect.arrayContaining(['tests', 'types', 'build', 'walkthrough']),
    )
    expect(overall?.rows.every((r) => r.state !== 'passed' && r.state !== 'failed')).toBe(true)
    expect(overall?.statusLine).toEqual({ tone: 'review', label: 'Not checked' })
  })

  it('says why the walkthrough was skipped', () => {
    expect(signoffOf({ outcome: 'skipped', summary: SKIPPED }).overall?.notes).toEqual([
      { label: 'Walkthrough · skipped', reason: SKIPPED, tone: 'review' },
    ])
  })

  it('names how the walkthrough ended, toned by it', () => {
    expect(
      signoffOf({ outcome: 'passed', summary: 'Recorded one walkthrough.' }).overall?.notes,
    ).toEqual([
      { label: 'Walkthrough · passed', reason: 'Recorded one walkthrough.', tone: 'done' },
    ])
    expect(signoffOf({ outcome: 'errored' }).overall?.notes).toEqual([
      { label: 'Walkthrough · errored', tone: 'stuck' },
    ])
    expect(signoffOf({ status: 'running' }).overall?.notes).toEqual([
      { label: 'Walkthrough · running', tone: 'review' },
    ])
  })

  it('reads the walkthrough from its latest attempt', () => {
    const s = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [
        {
          ...storyRun(undefined),
          ledger: [
            walkthroughEntry({ id: 'wt-1', outcome: 'errored', summary: 'The device went away.' }),
            walkthroughEntry({ id: 'wt-2', iteration: 2, outcome: 'skipped', summary: SKIPPED }),
          ],
        } as unknown as StorySignoffProcessRun,
      ],
      storyRunId: 'root-new',
      cliRuns: [],
      evidence: [],
    })
    expect(s.overall?.notes).toEqual([
      { label: 'Walkthrough · skipped', reason: SKIPPED, tone: 'review' },
    ])
  })

  it('keeps the Overall before the walkthrough has run, with nothing to say about it', () => {
    const overall = signoffOf(undefined).overall
    expect(overall).toBeDefined()
    expect(overall?.notes).toEqual([])
  })

  it('never shows an earlier story run’s story-wide filings as this run’s', () => {
    const s = signoffOf({ outcome: 'skipped', summary: SKIPPED })
    const shown = signoffEvidence(
      s,
      evidence.map((ref) => ({ ref })),
    ).map((t) => t.ref.id)
    expect(shown).toEqual(['f1-shot', 'f1-report', 'f2-report'])
  })

  it('shows a story-wide report the current story run filed', () => {
    const own = ev({ id: 'own-wide-report', runId: 'wt-new', kind: 'report', createdAt: T_NEW })
    const s = signoffOf({ outcome: 'passed' }, [...evidence, own])
    expect(
      signoffEvidence(
        s,
        [...evidence, own].map((ref) => ({ ref })),
      )
        .filter((t) => !t.ref.featureId)
        .map((t) => t.ref.id),
    ).toEqual(['own-wide-report'])
  })

  it('heads the story with its tally alone when every feature is proven', () => {
    const s = signoffOf({ outcome: 'skipped', summary: SKIPPED })
    expect(s.verdict.key).toBe('proven')
    expect(s.digest.tally).toEqual({ label: '2/2', title: '2 of 2 features proven' })
    expect(s.headline).toBeUndefined()
  })
})

describe('buildStorySignoff — the Overall without a story run', () => {
  it('is absent when nothing story-wide ran or was filed', () => {
    const s = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [proc('pr1', 'f1')],
      cliRuns: [run({ id: 'ra', processRunId: 'pr1', createdAt: 1 })],
      evidence: [ev({ id: 'x', runId: 'ra', featureId: 'f1' })],
    })
    expect(s.overall).toBeUndefined()
  })

  it('heads a story-wide section nothing checked as not checked, never all green', () => {
    const s = buildStorySignoff({
      features: [{ id: 'f1', title: 'One' }],
      processRuns: [],
      cliRuns: [run({ id: 'ra', createdAt: 1 })],
      evidence: [ev({ id: 'x', runId: 'ra', featureId: undefined, kind: 'report' })],
    })
    expect(s.overall?.statusLine).toEqual({ tone: 'review', label: 'Not checked' })
    expect(s.overall?.notes).toEqual([])
  })
})

describe('buildStorySignoff — the story’s code review and final report', () => {
  const MIN = 60_000
  const T = 1_790_347_372_871
  const REASON = 'The fonts are never loaded on Android.'
  const featurePlan = {
    steps: [
      { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
      { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'report', name: 'Report', kind: 'report' },
    ],
    loops: [],
  }
  const rootPlan = {
    steps: [
      {
        id: 'features:f1',
        name: 'Fonts',
        kind: 'process',
        subject: { kind: 'feature', id: 'f1', title: 'Fonts' },
      },
      { id: 'walkthrough', name: 'Walkthrough', kind: 'capture' },
      { id: 'code-review', name: 'Code review', kind: 'judge' },
      { id: 'report', name: 'Report', kind: 'report' },
      { id: 'sign-off', name: 'Sign-off', kind: 'gate' },
    ],
    loops: [],
  }
  type Entry = Record<string, unknown>
  const step = (stepId: string, runId: string, over: Entry = {}): Entry => ({
    id: `e-${stepId}-${runId}`,
    stepId,
    iteration: 1,
    status: 'done',
    runRef: { runId, runner: 'cli' },
    startedAt: T + 60 * MIN,
    ...over,
  })
  const root = (entries: Entry[]) =>
    ({
      id: 'root',
      startedAt: T,
      plan: rootPlan,
      ledger: [
        {
          id: 'e-f1',
          stepId: 'features:f1',
          iteration: 1,
          status: 'done',
          childRunId: 'f1-run',
          outcome: 'passed',
          startedAt: T,
        },
        ...entries,
        { id: 'e-gate', stepId: 'sign-off', iteration: 1, status: 'running', startedAt: T },
      ],
    }) as unknown as StorySignoffProcessRun
  const child = (entries: Entry[] = []) =>
    ({
      id: 'f1-run',
      featureId: 'f1',
      parentRunId: 'root',
      startedAt: T,
      plan: featurePlan,
      ledger: [
        step('implement', 'dev', { outcome: 'passed', startedAt: T }),
        step('verify', 'ver', {
          outcome: 'passed',
          review: { reviewedRunId: 'dev', filedSince: T, filedUntil: T + 20 * MIN },
          startedAt: T + 10 * MIN,
        }),
        ...entries,
      ],
    }) as unknown as StorySignoffProcessRun
  const codeReview = (over: Partial<ReviewEvidenceRef>) =>
    ev({
      id: 'cr',
      runId: 'cr-run',
      kind: 'report',
      approach: CODE_REVIEW_APPROACH,
      label: 'Code review',
      createdAt: T + 70 * MIN,
      ...over,
    })
  const signoffOf = (
    rootEntries: Entry[],
    evidence: ReviewEvidenceRef[],
    opts: { childEntries?: Entry[]; devDiffReview?: boolean } = {},
  ) =>
    buildStorySignoff({
      features: [{ id: 'f1', title: 'Fonts' }],
      processRuns: [root(rootEntries), child(opts.childEntries)],
      storyRunId: 'root',
      cliRuns: [
        run({
          id: 'dev',
          processRunId: 'f1-run',
          createdAt: T,
          ...(opts.devDiffReview
            ? { diffReview: { by: 'reviewer-agent', at: T }, verification: passedVerification() }
            : {}),
        }),
        run({ id: 'ver', processRunId: 'f1-run', createdAt: T + 10 * MIN }),
        run({ id: 'cr-run', processRunId: 'root', createdAt: T + 60 * MIN }),
      ],
      evidence,
    })
  const overallDiff = (s: ReturnType<typeof signoffOf>) =>
    s.overall?.rows.find((r) => r.id === 'diff')

  describe('the Overall’s notes', () => {
    it('says a code review is still running', () => {
      expect(
        signoffOf([step('code-review', 'cr-run', { status: 'running' })], []).overall?.notes,
      ).toEqual([{ label: 'Code review · running', tone: 'review' }])
    })

    it('says the verdict of a finished code review, not that its step passed', () => {
      const approved = signoffOf(
        [step('code-review', 'cr-run', { outcome: 'passed', summary: 'Approved.' })],
        [codeReview({ verdict: 'approved', verdictReason: 'Meets every criterion.' })],
      )
      expect(approved.overall?.notes).toEqual([
        { label: 'Code review · Approved', reason: 'Meets every criterion.', tone: 'done' },
      ])
      const turnedBack = signoffOf(
        [step('code-review', 'cr-run', { outcome: 'failed', summary: 'Changes requested.' })],
        [codeReview({ verdict: 'changes-requested', verdictReason: REASON })],
      )
      expect(turnedBack.overall?.notes).toEqual([
        { label: 'Code review · Changes requested', reason: REASON, tone: 'stuck' },
      ])
    })

    it('says how the code review ended when it filed no finding', () => {
      expect(
        signoffOf(
          [step('code-review', 'cr-run', { outcome: 'errored', summary: 'The agent crashed.' })],
          [],
        ).overall?.notes,
      ).toEqual([{ label: 'Code review · errored', reason: 'The agent crashed.', tone: 'stuck' }])
    })

    it('never says an earlier attempt’s verdict for the attempt that ended', () => {
      expect(
        signoffOf(
          [step('code-review', 'cr-run-2', { outcome: 'errored' })],
          [codeReview({ verdict: 'approved' })],
        ).overall?.notes,
      ).toEqual([{ label: 'Code review · errored', tone: 'stuck' }])
    })

    it('says a running code review is running, even over a finding it filed', () => {
      expect(
        signoffOf(
          [step('code-review', 'cr-run', { status: 'running' })],
          [codeReview({ verdict: 'approved' })],
        ).overall?.notes,
      ).toEqual([{ label: 'Code review · running', tone: 'review' }])
    })

    it('says how the report step ended, and why', () => {
      expect(
        signoffOf(
          [step('report', 'rep-run', { outcome: 'skipped', summary: 'Nothing to report on.' })],
          [],
        ).overall?.notes,
      ).toEqual([{ label: 'Report · skipped', reason: 'Nothing to report on.', tone: 'review' }])
    })

    it('reads the story’s own steps in plan order, never a feature’s', () => {
      const s = signoffOf(
        [
          step('report', 'rep-run', { outcome: 'passed' }),
          step('code-review', 'cr-run', { outcome: 'passed' }),
          step('walkthrough', 'wt', { outcome: 'skipped' }),
        ],
        [codeReview({ verdict: 'approved' })],
        { childEntries: [step('code-review', 'dev', { outcome: 'failed' })] },
      )
      expect(s.overall?.notes.map((n) => n.label)).toEqual([
        'Walkthrough · skipped',
        'Code review · Approved',
        'Report · passed',
      ])
    })
  })

  describe('the Code review chip', () => {
    it('passes the Overall on an approving story code review', () => {
      const s = signoffOf(
        [step('code-review', 'cr-run', { outcome: 'passed' })],
        [codeReview({ verdict: 'approved' })],
      )
      expect(overallDiff(s)).toMatchObject({
        label: 'Code review',
        state: 'passed',
        action: { kind: 'open-proof', tab: 'code-review' },
      })
      expect(s.overall?.statusLine).toEqual({ tone: 'done', label: 'All green' })
    })

    it('fails the Overall when the code review requested changes', () => {
      const s = signoffOf(
        [step('code-review', 'cr-run', { outcome: 'failed' })],
        [codeReview({ verdict: 'changes-requested', verdictReason: REASON })],
      )
      expect(overallDiff(s)).toMatchObject({ state: 'failed', detail: REASON })
      expect(s.overall?.statusLine).toEqual({ tone: 'stuck', label: 'Checks failed' })
    })

    it('lets the code review outrank a feature’s read diff', () => {
      const s = signoffOf(
        [step('code-review', 'cr-run', { outcome: 'failed' })],
        [codeReview({ verdict: 'changes-requested' })],
        { devDiffReview: true },
      )
      expect(overallDiff(s)?.state).toBe('failed')
    })

    it('keeps an old story’s read diff passing when no code review was filed', () => {
      const s = signoffOf([], [], { devDiffReview: true })
      expect(overallDiff(s)).toMatchObject({
        state: 'passed',
        action: { kind: 'open-proof', tab: 'changes' },
      })
    })

    it('leaves the Overall unchecked when nothing reviewed the code', () => {
      const s = signoffOf([], [])
      expect(overallDiff(s)?.state).toBe('unchecked')
      expect(s.overall?.statusLine).toEqual({ tone: 'review', label: 'Not checked' })
    })

    it('reads a feature’s own code review on the feature, never on the Overall', () => {
      const s = signoffOf(
        [],
        [codeReview({ runId: 'dev', featureId: 'f1', verdict: 'changes-requested' })],
        { childEntries: [step('code-review', 'cr-f1', { outcome: 'failed' })] },
      )
      expect(s.features[0].rows.find((r) => r.id === 'diff')?.state).toBe('failed')
      expect(overallDiff(s)?.state).toBe('unchecked')
    })
  })

  describe('the verify attempt a feature’s code review is filed beside', () => {
    it('never reads the feature’s code review as the reviewer’s verdict', () => {
      const s = signoffOf(
        [],
        [
          ev({
            id: 'ver-report',
            runId: 'dev',
            featureId: 'f1',
            kind: 'report',
            verdict: 'approved',
            createdAt: T + 15 * MIN,
          }),
          codeReview({
            runId: 'dev',
            featureId: 'f1',
            verdict: 'changes-requested',
            createdAt: T + 16 * MIN,
          }),
        ],
      )
      const tiles = [
        ev({
          id: 'ver-report',
          runId: 'dev',
          featureId: 'f1',
          kind: 'report',
          verdict: 'approved',
          createdAt: T + 15 * MIN,
        }),
        codeReview({
          runId: 'dev',
          featureId: 'f1',
          verdict: 'changes-requested',
          createdAt: T + 16 * MIN,
        }),
      ].map(toEvidenceTile)
      const view = featureVerifyView(s.features[0].verify!, tiles)
      expect(view.accepted.evidence.reports.map((t) => t.ref.id)).toEqual(['ver-report'])
      expect(view.accepted.evidence.verdict).toEqual({ verdict: 'approved' })
    })
  })
})

describe('signoffSections', () => {
  const T = 1_000
  const tileOf = (over: Partial<ReviewEvidenceRef>) => toEvidenceTile(ev(over))
  const story = { evidenceRunIds: undefined }
  const verifierReport = (over: Partial<ReviewEvidenceRef> = {}) =>
    tileOf({ id: 'ver', runId: 'dev', kind: 'report', createdAt: T, ...over })
  const final = (over: Partial<ReviewEvidenceRef> = {}) =>
    tileOf({
      id: 'final',
      runId: 'rep-run',
      kind: 'report',
      approach: FINAL_REPORT_APPROACH,
      createdAt: T + 5,
      ...over,
    })
  const featureReport = (over: Partial<ReviewEvidenceRef> = {}) =>
    tileOf({
      id: 'feat',
      runId: 'feat-rep',
      featureId: 'f1',
      kind: 'report',
      approach: FEATURE_REPORT_APPROACH,
      createdAt: T - 5,
      ...over,
    })
  const review = (over: Partial<ReviewEvidenceRef> = {}) =>
    tileOf({
      id: 'cr',
      runId: 'cr-run',
      kind: 'report',
      approach: CODE_REVIEW_APPROACH,
      createdAt: T + 3,
      ...over,
    })
  const ids = (tiles: readonly { ref: { id: string } }[]) => tiles.map((t) => t.ref.id)

  describe('the Overall', () => {
    it('leads with the final report, the story-wide verifier report reachable after it', () => {
      const overall = signoffSections(story, [verifierReport({ createdAt: T + 9 }), final()]).get(
        '',
      )
      expect(ids(overall?.reports ?? [])).toEqual(['final', 'ver'])
      expect(overall?.leadTab).toBe('report')
    })

    it('opens on its first tab as before when the story has no final report', () => {
      const overall = signoffSections(story, [verifierReport()]).get('')
      expect(ids(overall?.reports ?? [])).toEqual(['ver'])
      expect(overall?.leadTab).toBeUndefined()
    })

    it('shows the newest code review in its own tab, never in the Report tab', () => {
      const overall = signoffSections(story, [
        review({ id: 'cr-old', createdAt: T }),
        review({ id: 'cr-new', createdAt: T + 8, verdict: 'approved' }),
        final(),
      ]).get('')
      expect(ids(overall?.codeReviews ?? [])).toEqual(['cr-new'])
      expect(ids(overall?.reports ?? [])).toEqual(['final'])
    })

    it('leaves the code review’s verdict to the Overall’s step notes', () => {
      expect(signoffSections(story, [review({ verdict: 'approved' })]).get('')?.notes).toEqual([])
    })
  })

  describe('a feature', () => {
    it('leads with its feature report, the verifier’s newest reachable after it', () => {
      const f1 = signoffSections(story, [
        verifierReport({ id: 'ver-old', featureId: 'f1', createdAt: T }),
        verifierReport({ id: 'ver-new', featureId: 'f1', createdAt: T + 1 }),
        featureReport(),
      ]).get('f1')
      expect(ids(f1?.reports ?? [])).toEqual(['feat', 'ver-new'])
      expect(f1?.leadTab).toBeUndefined()
    })

    it('shows its own code review in its Code review tab, with its verdict as a note', () => {
      const f1 = signoffSections(story, [
        verifierReport({ featureId: 'f1' }),
        review({
          featureId: 'f1',
          runId: 'dev',
          verdict: 'changes-requested',
          verdictReason: 'No test.',
        }),
      ]).get('f1')
      expect(ids(f1?.codeReviews ?? [])).toEqual(['cr'])
      expect(ids(f1?.reports ?? [])).toEqual(['ver'])
      expect(f1?.notes).toEqual([
        { label: 'Code review · Changes requested', reason: 'No test.', tone: 'stuck' },
      ])
    })

    it('has no Code review tab or note without a code review of its own', () => {
      const sections = signoffSections(story, [verifierReport({ featureId: 'f1' }), review()])
      expect(sections.get('f1')?.codeReviews).toEqual([])
      expect(sections.get('f1')?.notes).toEqual([])
    })
  })

  it('never shows the story’s final report on a feature, nor a feature report on the Overall', () => {
    const sections = signoffSections(story, [
      final({ featureId: 'f1' }),
      featureReport({ featureId: undefined }),
      verifierReport({ id: 'ver-f1', featureId: 'f1' }),
    ])
    expect(ids(sections.get('f1')?.reports ?? [])).toEqual(['ver-f1'])
    expect(sections.get('')?.reports).toEqual([])
    expect(sections.get('')?.leadTab).toBeUndefined()
  })

  it('shows only what the sign-off’s runs filed', () => {
    const sections = signoffSections({ evidenceRunIds: new Set(['cr-run']) }, [review(), final()])
    expect(ids(sections.get('')?.codeReviews ?? [])).toEqual(['cr'])
    expect(sections.get('')?.reports).toEqual([])
  })

  describe('signoffSectionProps', () => {
    it('hands a section without a verify attempt what it filed', () => {
      const section = signoffSections(story, [featureReport(), review({ featureId: 'f1' })]).get(
        'f1',
      )!
      expect(signoffSectionProps(section, undefined)).toEqual({
        pairs: [],
        recordings: [],
        reports: section.reports,
        codeReviews: section.codeReviews,
        notes: [],
      })
    })

    it('hands the Overall the tab it leads with', () => {
      const section = signoffSections(story, [final()]).get('')!
      expect(signoffSectionProps(section, undefined).leadTab).toBe('report')
    })
  })
})

describe('signoffSectionProps, over a feature’s accepted verify attempt', () => {
  const T = 1_790_347_372_871
  const MIN = 60_000
  const featureRun = {
    id: 'f1-run',
    featureId: 'f1',
    startedAt: T,
    plan: {
      steps: [
        { id: 'implement', name: 'Implement', kind: 'agent', agentType: 'developer' },
        { id: 'verify', name: 'Verify', kind: 'agent', agentType: 'verifier' },
        { id: 'report', name: 'Report', kind: 'report' },
      ],
      loops: [],
    },
    ledger: [
      {
        id: 'e-i',
        stepId: 'implement',
        iteration: 1,
        status: 'done',
        outcome: 'passed',
        runRef: { runId: 'dev' },
        startedAt: T,
      },
      {
        id: 'e-v',
        stepId: 'verify',
        iteration: 1,
        status: 'done',
        outcome: 'failed',
        summary: 'The reviewer requested changes.',
        runRef: { runId: 'ver' },
        review: { reviewedRunId: 'dev', filedSince: T },
        startedAt: T + MIN,
      },
      {
        id: 'e-r',
        stepId: 'report',
        iteration: 1,
        status: 'done',
        outcome: 'passed',
        runRef: { runId: 'rep', runner: 'api' },
        startedAt: T + 4 * MIN,
      },
    ],
  } as unknown as StorySignoffProcessRun
  const evidence = [
    ev({
      id: 'ver-report',
      runId: 'dev',
      featureId: 'f1',
      kind: 'report',
      verdict: 'changes-requested',
      verdictReason: 'Wrong font.',
      createdAt: T + 2 * MIN,
    }),
    ev({
      id: 'cr',
      runId: 'dev',
      featureId: 'f1',
      kind: 'report',
      approach: CODE_REVIEW_APPROACH,
      verdict: 'approved',
      createdAt: T + 3 * MIN,
    }),
    ev({
      id: 'feat',
      runId: 'rep',
      featureId: 'f1',
      kind: 'report',
      approach: FEATURE_REPORT_APPROACH,
      createdAt: T + MIN,
    }),
  ]

  it('leads the Report tab with the feature report and keeps the reviewer’s notes before the code review’s', () => {
    const s = buildStorySignoff({
      features: [{ id: 'f1', title: 'Fonts' }],
      processRuns: [featureRun],
      cliRuns: [
        run({ id: 'dev', processRunId: 'f1-run', createdAt: T }),
        run({ id: 'ver', processRunId: 'f1-run', createdAt: T + MIN }),
      ],
      evidence,
    })
    const tiles = evidence.map(toEvidenceTile)
    const view = featureVerifyView(s.features[0].verify!, tiles)
    const props = signoffSectionProps(signoffSections(s, tiles).get('f1')!, view)
    expect(props.reports.map((t) => t.ref.id)).toEqual(['feat', 'ver-report'])
    expect(props.codeReviews.map((t) => t.ref.id)).toEqual(['cr'])
    expect(props.notes.map((n) => n.label)).toEqual([
      'The gate did not pass it',
      'Reviewer · Changes requested',
      'Code review · Approved',
    ])
    expect(props.attemptLabel).toBeDefined()
  })
})
