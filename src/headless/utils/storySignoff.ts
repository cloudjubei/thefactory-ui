/**
 * The whole-story sign-off, derived once for both clients.
 *
 * A story is one unit of work even when it was split into features, so its
 * sign-off is one decision over everything. This joins the two things the story
 * scope can load in one request each — every process run (for the feature↔run
 * attribution) and every CLI run (for each run's verification/verdict/cost) —
 * into a per-feature verdict, a story digest, and one aggregate headline. Pure:
 * no React, no I/O; the hook feeds it what the list endpoints returned.
 */

import type { ReviewEvidenceRef } from '../api/generated'
import {
  NOT_RUN_TITLE,
  SIGNOFF_VERDICT_TONES,
  SIGNOFF_VERDICT_WORDS,
  STORY_UNFINISHED_TITLE,
} from './checkMethodConstants'
import { checkMethodRows, signoffVerdict } from './checkMethods'
import type { SignoffVerdict, SignoffVerdictKey } from './checkMethodTypes'
import { runModelOf } from './runModel'
import { runReviewFacts } from './runReview'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import type {
  BuildStorySignoffInput,
  FeatureSignoff,
  StoryDigest,
  StoryFeatureRef,
  StorySignoff,
  StorySignoffProcessRun,
  StorySignoffRun,
} from './storySignoffTypes'

/**
 * The feature a run belongs to.
 *
 * A launched run carries `processRunId` (the per-feature child process run's id)
 * but never a `featureId` of its own, so the feature is recovered from the
 * process runs: primarily by the child run's id, and as a fallback by the run id
 * its ledger recorded — the two ways the attribution is written at launch.
 */
function featureAttribution(processRuns: readonly StorySignoffProcessRun[]): {
  byProcessRun: Map<string, string>
  byRunId: Map<string, string>
} {
  const byProcessRun = new Map<string, string>()
  const byRunId = new Map<string, string>()
  for (const p of processRuns) {
    if (!p.featureId) continue
    byProcessRun.set(p.id, p.featureId)
    for (const entry of p.ledger) {
      const runId = entry.runRef?.runId
      if (runId) byRunId.set(runId, p.featureId)
    }
  }
  return { byProcessRun, byRunId }
}

/**
 * The run whose state a feature's section reflects.
 *
 * A feature's child run can own a developer run plus verifier/remedy/retry runs.
 * The one that carries the stamped verification/verdict is what a reviewer is
 * deciding on, and the LATEST such run is the current state — a remedy pass
 * supersedes the first attempt. With nothing decided yet, the latest run at all.
 */
function pickImplementingRun(runs: readonly StorySignoffRun[]): StorySignoffRun | undefined {
  if (runs.length === 0) return undefined
  const decided = runs.filter((r) => r.verdict !== undefined || r.verification !== undefined)
  const pool = decided.length > 0 ? decided : runs
  return [...pool].sort((a, b) => b.createdAt - a.createdAt)[0]
}

function featureSignoffFor(
  feature: StoryFeatureRef,
  run: StorySignoffRun | undefined,
  evidence: readonly ReviewEvidenceRef[],
): FeatureSignoff {
  const rows = checkMethodRows({
    verification: run?.verification,
    // The story gate is read-only: it never offers to run or request a check, so
    // it does not need the per-run verification PLAN that tells "not run" from
    // "not set up" — the chips still colour by state from the record + evidence.
    approaches: [],
    evidence,
    ...(run?.verdict?.by ? { verdictBy: run.verdict.by } : {}),
    ...(run?.diffReview ? { diffReview: run.diffReview } : {}),
  })
  const verified = run?.verification !== undefined
  return {
    featureId: feature.id,
    title: feature.title,
    runId: run?.id,
    verified,
    verification: run?.verification,
    rows,
    verdict: signoffVerdict({ rows, verified }),
    facts: runReviewFacts({ costUSD: run?.costUSD, durationMs: run?.durationMs }),
    runModel: run ? runModelOf(run) : undefined,
  }
}

function makeVerdict(key: SignoffVerdictKey, title: string, detail: string): SignoffVerdict {
  return {
    key,
    tone: SIGNOFF_VERDICT_TONES[key],
    word: SIGNOFF_VERDICT_WORDS[key],
    // A verdict nobody has proven yet is hollow; a decided one is solid — the
    // same rule the single-run headline follows.
    hollow: key === 'partly' || key === 'not-run',
    title,
    detail,
  }
}

function featureWord(n: number): string {
  return n === 1 ? 'feature' : 'features'
}

/**
 * The story headline — the WORST feature verdict wins.
 *
 * Any failure fails the story; a mix of proven and not-yet-proven is partly; all
 * proven is proven, unless the story itself is unfinished, which demotes it the
 * same way a single run's does.
 */
export function aggregateStoryVerdict(
  features: readonly FeatureSignoff[],
  storyIncomplete: string | undefined,
): SignoffVerdict {
  const keys = features.map((f) => f.verdict.key)
  const count = (k: SignoffVerdictKey): number => keys.filter((x) => x === k).length
  const failed = count('failed')
  const proven = count('proven')
  const partly = count('partly')
  const notRun = count('not-run')
  const total = features.length

  if (failed > 0) {
    const names = features.filter((f) => f.verdict.key === 'failed').map((f) => f.title)
    return makeVerdict(
      'failed',
      `${failed} of ${total} ${featureWord(total)} failed`,
      names.join(' · '),
    )
  }
  if (proven > 0 && (partly > 0 || notRun > 0)) {
    return makeVerdict(
      'partly',
      `${proven} of ${total} ${featureWord(total)} proven`,
      `${total - proven} still ${total - proven === 1 ? 'needs' : 'need'} proving.`,
    )
  }
  if (proven > 0) {
    // Every feature that ran is proven — but if the story itself is unfinished
    // (a feature never ran at all), "proven" would sit above the count of what
    // is outstanding. Demote exactly as the single-run headline does.
    if (storyIncomplete) return makeVerdict('partly', STORY_UNFINISHED_TITLE, storyIncomplete)
    return makeVerdict(
      'proven',
      total === 1 ? 'The feature is proven' : `All ${total} features proven`,
      'Built, checked, and captured across every feature.',
    )
  }
  if (partly > 0) {
    return makeVerdict(
      'partly',
      `Nothing is fully proven yet`,
      `${partly} ${featureWord(partly)} passed what ran.`,
    )
  }
  return makeVerdict('not-run', NOT_RUN_TITLE, NOT_VERIFIED_DETAIL)
}

function digestOf(features: readonly FeatureSignoff[]): StoryDigest {
  const count = (k: SignoffVerdictKey): number => features.filter((f) => f.verdict.key === k).length
  return {
    total: features.length,
    proven: count('proven'),
    partly: count('partly'),
    failed: count('failed'),
    notRun: count('not-run'),
  }
}

export function buildStorySignoff(input: BuildStorySignoffInput): StorySignoff {
  const { features, processRuns, cliRuns, evidence, storyIncomplete } = input
  const { byProcessRun, byRunId } = featureAttribution(processRuns)
  const featureOf = (r: StorySignoffRun): string | undefined =>
    (r.processRunId ? byProcessRun.get(r.processRunId) : undefined) ?? byRunId.get(r.id)

  const runsByFeature = new Map<string, StorySignoffRun[]>()
  for (const r of cliRuns) {
    const fid = featureOf(r)
    if (!fid) continue
    const list = runsByFeature.get(fid)
    if (list) list.push(r)
    else runsByFeature.set(fid, [r])
  }

  // Newest feature first (highest id / latest declared), per the settled design.
  const ordered = [...features].reverse()

  let totalCost = 0
  let hasCost = false
  let totalDuration = 0
  let hasDuration = false

  const featureSignoffs: FeatureSignoff[] = []
  for (const feature of ordered) {
    const runs = runsByFeature.get(feature.id) ?? []
    // A feature that has produced no run has nothing to sign off yet — its
    // unfinished state is carried by `storyIncomplete`, not an empty section.
    if (runs.length === 0) continue
    const run = pickImplementingRun(runs)
    if (run?.costUSD != null) {
      totalCost += run.costUSD
      hasCost = true
    }
    if (run?.durationMs != null) {
      totalDuration += run.durationMs
      hasDuration = true
    }
    const featureEvidence = evidence.filter((e) => (e.featureId ?? '') === feature.id)
    featureSignoffs.push(featureSignoffFor(feature, run, featureEvidence))
  }

  return {
    features: featureSignoffs,
    verdict: aggregateStoryVerdict(featureSignoffs, storyIncomplete),
    digest: digestOf(featureSignoffs),
    facts: runReviewFacts({
      costUSD: hasCost ? totalCost : undefined,
      durationMs: hasDuration ? totalDuration : undefined,
    }),
  }
}
