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

import type { ProcessRunTotals } from 'thefactory-tools/types'

import type { ReviewEvidenceRef, RunVerification, VerificationCheckResult } from '../api/generated'
import {
  NOT_RUN_TITLE,
  SIGNOFF_VERDICT_TONES,
  SIGNOFF_VERDICT_WORDS,
  STORY_UNFINISHED_TITLE,
} from './checkMethodConstants'
import { checkMethodRows, signoffVerdict } from './checkMethods'
import type { CheckMethodId, SignoffVerdict, SignoffVerdictKey } from './checkMethodTypes'
import { formatProcessCost, formatProcessDuration, type VerifyReviewStatus } from './processView'
import { runModelOf } from './runModel'
import { runReviewFacts } from './runReview'
import type { RunReviewFacts } from './runReviewTypes'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import type {
  BuildStorySignoffInput,
  FeatureSignoff,
  OverallSignoff,
  SignoffAgent,
  StoryDigest,
  StoryFeatureRef,
  StorySignoff,
  StorySignoffProcessRun,
  StorySignoffRun,
} from './storySignoffTypes'
import {
  featureVerifySelection,
  verifyAttemptStanding,
  verifyAttemptStatus,
  verifyGateLine,
} from './verifyProof'
import { GATE_OUTCOME_SAID } from './verifyProofConstants'
import type { VerifyAttempt, VerifyAttemptSelection } from './verifyProofTypes'

/**
 * The capabilities that prove the STORY, not a single change: the full suite,
 * live/UI tests, the typecheck, build, lint/format, the whole diff and the
 * end-to-end walkthrough. They cover the whole codebase, so they belong to the
 * one Overall section, not to any feature. Everything else (screens, report, a
 * device drive) proves a specific change and stays on its feature.
 */
const OVERALL_METHODS: readonly CheckMethodId[] = [
  'tests',
  'uitests',
  'types',
  'lint',
  'format',
  'build',
  'diff',
  'walkthrough',
]

/** Developer before verifier before anything else — the order work happens in. */
const ROLE_ORDER: readonly string[] = ['developer', 'verifier']
function roleRank(role: string): number {
  const i = ROLE_ORDER.indexOf(role)
  return i === -1 ? ROLE_ORDER.length : i
}

const DIGEST_HEADLINES: Record<SignoffVerdictKey, string> = {
  proven: 'Every part did its job',
  failed: 'A check did not pass',
  partly: 'Some parts still need proving',
  'not-run': 'Nothing has been proven yet',
}

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
 * The ROLE each run was launched as — `developer`, `verifier`, …
 *
 * A run never records its own role, but the process run that launched it does:
 * its ledger links a run id to the step it ran, and its plan says what agent
 * that step was. Join the two so a section can show which agents ran it, not
 * only the one run its verdict came from.
 */
function roleAttribution(processRuns: readonly StorySignoffProcessRun[]): Map<string, string> {
  const roleOf = new Map<string, string>()
  for (const p of processRuns) {
    const stepRole = new Map<string, string>()
    for (const step of p.plan?.steps ?? []) {
      if (step.agentType) stepRole.set(step.id, step.agentType)
    }
    for (const entry of p.ledger) {
      const runId = entry.runRef?.runId
      if (!runId) continue
      const role = stepRole.get(entry.stepId)
      if (role) roleOf.set(runId, role)
    }
  }
  return roleOf
}

/** The agents that ran a set of runs — the LATEST run per role, developer first. */
function agentsFor(runs: readonly StorySignoffRun[], roleOf: Map<string, string>): SignoffAgent[] {
  const latest = new Map<string, StorySignoffRun>()
  for (const r of runs) {
    const role = roleOf.get(r.id)
    if (!role) continue
    const cur = latest.get(role)
    if (!cur || r.createdAt > cur.createdAt) latest.set(role, r)
  }
  return [...latest.entries()]
    .sort(([a], [b]) => roleRank(a) - roleRank(b) || a.localeCompare(b))
    .map(([role, run]) => ({ role, model: runModelOf(run) }))
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

/** A feature no verify gate judged is headed by what its checks came to — never "Verify passed". */
const CHECKS_STATUS_LINE: Record<SignoffVerdictKey, VerifyReviewStatus> = {
  proven: { tone: 'done', label: 'Checks passed' },
  failed: { tone: 'stuck', label: 'Checks failed' },
  partly: { tone: 'review', label: 'Partly checked' },
  'not-run': { tone: 'review', label: 'Not verified' },
}

const STILL_VERIFYING = 'The reviewer is still working.'

/**
 * A feature's verdict from the verify gate's outcome on its accepted attempt.
 * An attempt a person accepted is theirs, not the gate's pass, so it is never
 * proven; one the gate could not confirm is never a failure.
 */
function gateVerdict(accepted: VerifyAttempt): SignoffVerdict {
  const { entry } = accepted
  const title = verifyAttemptStatus(entry).label
  const said = verifyGateLine(entry) ?? `${GATE_OUTCOME_SAID[entry.outcome ?? 'skipped']}.`
  switch (verifyAttemptStanding(entry)) {
    case 'passed':
      return makeVerdict('proven', title, said)
    case 'accepted':
    case 'unchecked':
      return makeVerdict('partly', title, said)
    case 'failed':
      return makeVerdict('failed', title, said)
    case 'running':
      return makeVerdict('not-run', title, STILL_VERIFYING)
  }
}

function featureSignoffFor(
  feature: StoryFeatureRef,
  run: StorySignoffRun | undefined,
  evidence: readonly ReviewEvidenceRef[],
  agents: SignoffAgent[],
  verify: VerifyAttemptSelection | undefined,
  facts: RunReviewFacts,
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
  const verdict = verify ? gateVerdict(verify.accepted) : signoffVerdict({ rows, verified })
  return {
    featureId: feature.id,
    title: feature.title,
    runId: run?.id,
    verified,
    verification: run?.verification,
    rows,
    verdict,
    statusLine: verify
      ? verifyAttemptStatus(verify.accepted.entry)
      : CHECKS_STATUS_LINE[verdict.key],
    standing: verify ? verifyAttemptStanding(verify.accepted.entry) : undefined,
    facts,
    runModel: run ? runModelOf(run) : undefined,
    agents,
    verify,
  }
}

type Measure = Pick<ProcessRunTotals, 'workMs' | 'costUsd' | 'unpricedTokens'>

const addOptional = (a: number | undefined, b: number | undefined): number | undefined =>
  a === undefined ? b : b === undefined ? a : a + b

function addMeasure(sum: Measure | undefined, m: Measure): Measure {
  const costUsd = addOptional(sum?.costUsd, m.costUsd)
  const unpricedTokens = addOptional(sum?.unpricedTokens, m.unpricedTokens)
  return {
    workMs: (sum?.workMs ?? 0) + m.workMs,
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(unpricedTokens !== undefined ? { unpricedTokens } : {}),
  }
}

function measuredFacts(m: Measure | undefined): RunReviewFacts {
  return {
    durationLabel: m ? formatProcessDuration(m.workMs) : undefined,
    costLabel: formatProcessCost(m),
  }
}

/** A story's time and cost as its pipeline counts them, split the way the sign-off shows them. */
type PipelineTotals = {
  story: Measure | undefined
  features: Map<string, Measure>
  own: Measure | undefined
}

/**
 * Time and cost as the pipeline shows them — one set of numbers. The head is
 * every root run of the story; a feature is the step it ran as, summed over
 * every root (so every child that ran it, retries and relaunches included); the
 * Overall is the story's own steps over every root. A root that is itself one
 * feature's run counts wholly to that feature. Undefined when no root carries
 * totals, so a story with no process run falls back to its CLI records.
 */
function pipelineTotals(
  processRuns: readonly StorySignoffProcessRun[],
): PipelineTotals | undefined {
  const measured = processRuns.flatMap((run) =>
    !run.parentRunId && run.totals ? [{ run, totals: run.totals }] : [],
  )
  if (measured.length === 0) return undefined
  const features = new Map<string, Measure>()
  const addTo = (featureId: string, m: Measure) =>
    features.set(featureId, addMeasure(features.get(featureId), m))
  let story: Measure | undefined
  let own: Measure | undefined
  for (const { run, totals } of measured) {
    story = addMeasure(story, totals)
    if (run.featureId) {
      addTo(run.featureId, totals)
      continue
    }
    for (const step of run.plan.steps) {
      const stepTotals = totals.steps[step.id]
      if (!stepTotals) continue
      if (step.subject?.kind === 'feature') addTo(step.subject.id, stepTotals)
      else own = addMeasure(own, stepTotals)
    }
  }
  return { story, features, own }
}

/** Sum cost + duration across runs, dropping a total nothing recorded. */
function sumFacts(runs: readonly StorySignoffRun[]): {
  costUSD: number | undefined
  durationMs: number | undefined
} {
  let cost = 0
  let hasCost = false
  let duration = 0
  let hasDuration = false
  for (const r of runs) {
    if (r.costUSD != null) {
      cost += r.costUSD
      hasCost = true
    }
    if (r.durationMs != null) {
      duration += r.durationMs
      hasDuration = true
    }
  }
  return {
    costUSD: hasCost ? cost : undefined,
    durationMs: hasDuration ? duration : undefined,
  }
}

/**
 * The distinct checks across the story, latest state per check id.
 *
 * A check that runs on every feature (typecheck, build, the full suite) reports
 * the same id each time; keeping only the LATEST means the Overall reflects the
 * final branch, never a stale early failure and never a double-counted suite.
 * Distinct targeted checks each keep their own id, so they all survive.
 */
function mergeChecks(runs: readonly StorySignoffRun[]): VerificationCheckResult[] {
  const byId = new Map<string, { check: VerificationCheckResult; at: number }>()
  for (const r of runs) {
    for (const check of r.verification?.checks ?? []) {
      const prev = byId.get(check.id)
      if (!prev || r.createdAt >= prev.at) byId.set(check.id, { check, at: r.createdAt })
    }
  }
  return [...byId.values()].map((v) => v.check)
}

/**
 * The story-wide section: the whole-codebase checks aggregated across features,
 * the story's own runs' cost, and the agents that ran them. Present whenever any
 * story-wide check ran or a story-scoped walkthrough was filed.
 */
function buildOverall(
  featureRuns: readonly StorySignoffRun[],
  featureAgents: readonly SignoffAgent[][],
  storyRuns: readonly StorySignoffRun[],
  storyEvidence: readonly ReviewEvidenceRef[],
  roleOf: Map<string, string>,
  facts: RunReviewFacts,
): OverallSignoff | undefined {
  const mergedChecks = mergeChecks(featureRuns)
  const hasEvidence = storyEvidence.length > 0
  if (mergedChecks.length === 0 && !hasEvidence) return undefined

  const failed = mergedChecks.some((c) => c.status === 'failed' || c.status === 'error')
  const verification: RunVerification | undefined =
    mergedChecks.length > 0
      ? ({
          status: failed ? 'failed' : 'passed',
          checks: mergedChecks,
          startedAt: 0,
          finishedAt: 0,
        } as RunVerification)
      : undefined
  // If any feature's change was read, the story's diff was read.
  const diffReview = featureRuns.map((r) => r.diffReview).find((d) => d !== undefined)
  const allRows = checkMethodRows({
    verification,
    approaches: [],
    evidence: storyEvidence,
    ...(diffReview ? { diffReview } : {}),
  })
  const rows = allRows.filter((r) => OVERALL_METHODS.includes(r.id))
  const allGreen = !rows.some((r) => r.state === 'failed')

  // The verifier ran the checks; a story-scoped capture run (walkthrough) may add
  // its own agent. Dedupe by role, verifier first.
  const byRole = new Map<string, SignoffAgent>()
  for (const agents of featureAgents) {
    for (const a of agents)
      if (a.role === 'verifier' && !byRole.has('verifier')) byRole.set(a.role, a)
  }
  for (const a of agentsFor(storyRuns, roleOf)) if (!byRole.has(a.role)) byRole.set(a.role, a)
  const agents = [...byRole.values()].sort(
    (x, y) => roleRank(x.role) - roleRank(y.role) || x.role.localeCompare(y.role),
  )

  return {
    rows,
    verification,
    allGreen,
    agents,
    facts,
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

const isAccepted = (f: FeatureSignoff): boolean => f.standing === 'accepted'

function acceptedLine(accepted: number): string {
  return `${accepted} accepted by you without the gate passing ${accepted === 1 ? 'it' : 'them'}.`
}

/**
 * The story headline — the WORST feature verdict wins.
 *
 * Any failure fails the story; a mix of proven and not-yet-proven is partly; all
 * proven is proven, unless the story itself is unfinished, which demotes it the
 * same way a single run's does. A feature a person accepted over the gate is
 * settled but not proven, so the story is never called proven over it — and it
 * is named, not counted among what still needs proving.
 */
export function aggregateStoryVerdict(
  features: readonly FeatureSignoff[],
  storyIncomplete: string | undefined,
): SignoffVerdict {
  const total = features.length
  const failed = features.filter((f) => f.verdict.key === 'failed')
  const accepted = features.filter(isAccepted)
  const proven = features.filter((f) => f.verdict.key === 'proven').length
  const partly = features.filter((f) => f.verdict.key === 'partly' && !isAccepted(f)).length
  const open = total - failed.length - accepted.length - proven
  const acceptedSuffix = accepted.length > 0 ? ` ${acceptedLine(accepted.length)}` : ''

  if (failed.length > 0) {
    return makeVerdict(
      'failed',
      `${failed.length} of ${total} ${featureWord(total)} failed`,
      failed.map((f) => f.title).join(' · '),
    )
  }
  if (total > 0 && open === 0) {
    // Every feature that ran is settled — but if the story itself is unfinished
    // (a feature never ran at all), "proven" would sit above the count of what
    // is outstanding. Demote exactly as the single-run headline does.
    if (storyIncomplete) return makeVerdict('partly', STORY_UNFINISHED_TITLE, storyIncomplete)
    if (accepted.length === 0) {
      return makeVerdict(
        'proven',
        total === 1 ? 'The feature is proven' : `All ${total} features proven`,
        'Built, checked, and captured across every feature.',
      )
    }
    return makeVerdict(
      'partly',
      `${proven} of ${total} ${featureWord(total)} proven · ${accepted.length} accepted by you`,
      `Accepted by you without the gate passing ${accepted.length === 1 ? 'it' : 'them'}: ${accepted.map((f) => f.title).join(' · ')}.`,
    )
  }
  if (proven > 0) {
    return makeVerdict(
      'partly',
      `${proven} of ${total} ${featureWord(total)} proven`,
      `${open} still ${open === 1 ? 'needs' : 'need'} proving.${acceptedSuffix}`,
    )
  }
  if (partly > 0) {
    return makeVerdict(
      'partly',
      `Nothing is fully proven yet`,
      `${partly} ${featureWord(partly)} passed what ran.${acceptedSuffix}`,
    )
  }
  if (accepted.length > 0) {
    return makeVerdict('partly', 'Nothing is proven yet', acceptedLine(accepted.length))
  }
  return makeVerdict('not-run', NOT_RUN_TITLE, NOT_VERIFIED_DETAIL)
}

/**
 * The green strip's supporting line: how many features verified, whether the
 * story-wide checks were green, and how many walkthroughs were filed — the whole
 * story in one sentence so nothing needs reading twice.
 */
function digestLine(
  features: readonly FeatureSignoff[],
  overall: OverallSignoff | undefined,
  walkthroughs: number,
): string {
  const total = features.length
  const proven = features.filter((f) => f.verdict.key === 'proven').length
  const accepted = features.filter(isAccepted).length
  const parts: string[] = [`${proven} of ${total} ${featureWord(total)} verified`]
  if (accepted > 0) parts.push(`${accepted} accepted by you`)
  if (overall) {
    const failed = overall.rows.filter((r) => r.state === 'failed')
    const passed = overall.rows.filter((r) => r.state === 'passed')
    if (failed.length > 0) {
      parts.push(`${failed.length} ${failed.length === 1 ? 'check' : 'checks'} failed`)
    } else if (passed.length > 0) {
      parts.push('all checks green')
    }
  }
  if (walkthroughs > 0) {
    parts.push(`${walkthroughs} ${walkthroughs === 1 ? 'walkthrough' : 'walkthroughs'}`)
  }
  return parts.join(' · ')
}

function digestOf(
  features: readonly FeatureSignoff[],
  verdict: SignoffVerdict,
  overall: OverallSignoff | undefined,
  walkthroughs: number,
): StoryDigest {
  const count = (k: SignoffVerdictKey): number => features.filter((f) => f.verdict.key === k).length
  return {
    total: features.length,
    proven: count('proven'),
    partly: count('partly'),
    failed: count('failed'),
    notRun: count('not-run'),
    accepted: features.filter(isAccepted).length,
    headline: DIGEST_HEADLINES[verdict.key],
    line: digestLine(features, overall, walkthroughs),
  }
}

export function buildStorySignoff(input: BuildStorySignoffInput): StorySignoff {
  const { features, processRuns, cliRuns, evidence, storyIncomplete } = input
  const { byProcessRun, byRunId } = featureAttribution(processRuns)
  const roleOf = roleAttribution(processRuns)
  const featureOf = (r: StorySignoffRun): string | undefined =>
    (r.processRunId ? byProcessRun.get(r.processRunId) : undefined) ?? byRunId.get(r.id)

  const runsByFeature = new Map<string, StorySignoffRun[]>()
  // Runs that belong to no feature are story-scoped (the overall walkthrough
  // capture, any story-level agent) — they feed the Overall section, never a
  // feature, and are never double-counted into a feature's cost.
  const storyRuns: StorySignoffRun[] = []
  for (const r of cliRuns) {
    const fid = featureOf(r)
    if (!fid) {
      storyRuns.push(r)
      continue
    }
    const list = runsByFeature.get(fid)
    if (list) list.push(r)
    else runsByFeature.set(fid, [r])
  }

  const pipeline = pipelineTotals(processRuns)

  // Newest feature first (highest id / latest declared), per the settled design.
  const ordered = [...features].reverse()

  const featureSignoffs: FeatureSignoff[] = []
  const chosenRuns: StorySignoffRun[] = []
  const featureAgents: SignoffAgent[][] = []
  for (const feature of ordered) {
    const runs = runsByFeature.get(feature.id) ?? []
    // A feature that has produced no run has nothing to sign off yet — its
    // unfinished state is carried by `storyIncomplete`, not an empty section.
    if (runs.length === 0) continue
    const run = pickImplementingRun(runs)
    if (run) chosenRuns.push(run)
    const agents = agentsFor(runs, roleOf)
    featureAgents.push(agents)
    const featureEvidence = evidence.filter((e) => (e.featureId ?? '') === feature.id)
    featureSignoffs.push(
      featureSignoffFor(
        feature,
        run,
        featureEvidence,
        agents,
        featureVerifySelection(processRuns, feature.id),
        pipeline
          ? measuredFacts(pipeline.features.get(feature.id))
          : runReviewFacts({ costUSD: run?.costUSD, durationMs: run?.durationMs }),
      ),
    )
  }

  const storyEvidence = evidence.filter((e) => (e.featureId ?? '') === '')
  const overall = buildOverall(
    chosenRuns,
    featureAgents,
    storyRuns,
    storyEvidence,
    roleOf,
    pipeline ? measuredFacts(pipeline.own) : runReviewFacts(sumFacts(storyRuns)),
  )
  const walkthroughs = storyEvidence.filter((e) => e.kind === 'recording').length

  const verdict = aggregateStoryVerdict(featureSignoffs, storyIncomplete)
  return {
    features: featureSignoffs,
    overall,
    verdict,
    digest: digestOf(featureSignoffs, verdict, overall, walkthroughs),
    // The head total spans everything the story spent: every root run's totals
    // when it ran under a process, else the features it chose to show AND its own
    // story-scoped runs (the walkthrough capture).
    facts: pipeline
      ? measuredFacts(pipeline.story)
      : runReviewFacts(sumFacts([...chosenRuns, ...storyRuns])),
  }
}
