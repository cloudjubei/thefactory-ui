/**
 * The whole-story sign-off, derived once for both clients.
 *
 * A story is one unit of work even when it was split into features, so its
 * sign-off is one decision over everything. This joins the two things the story
 * scope can load in one request each — every process run (for the feature↔run
 * attribution) and every CLI run (for each run's verification/verdict/cost) —
 * into a per-feature verdict, a story digest, and one aggregate headline. Only
 * the LATEST run of each feature counts: a story relaunched after days of
 * failures is signed off on where it stands now, and the runs before it stay in
 * the pipeline for whoever drills in. Pure: no React, no I/O; the hook feeds it
 * what the list endpoints returned.
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
import { addCost, cliRunCost, pickCost } from './costDetails'
import type { CostSource } from './costDetailsTypes'
import { formatProcessDuration, PROCESS_OUTCOME_VIEW, type VerifyReviewStatus } from './processView'
import { runModelOf } from './runModel'
import {
  codeReviewVerdict,
  groupEvidence,
  isCodeReview,
  latestReport,
  newestOnly,
  reportAuthor,
  screenPairs,
} from './reviewEvidenceView'
import { STEP_REPORT_AUTHORS } from './reviewEvidenceViewConstants'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import { runReviewFacts } from './runReview'
import type { RunReviewFacts } from './runReviewTypes'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import {
  OVERALL_NOTE_STEP_KINDS,
  OVERALL_STATUS,
  SECTION_STEP_REPORT,
  STORY_STEP_NOTE_TONE,
  STORY_STEP_RUNNING,
} from './storySignoffConstants'
import type {
  BuildStorySignoffInput,
  FeatureSignoff,
  OverallSignoff,
  SignoffAgent,
  SignoffHeadline,
  SignoffLoadStatus,
  SignoffScope,
  SignoffSection,
  SignoffSectionProps,
  SignoffSources,
  SignoffTally,
  StoryDigest,
  StoryFeatureRef,
  StorySignoff,
  StorySignoffProcessRun,
  StorySignoffRun,
} from './storySignoffTypes'
import {
  acceptedVerifyAttempt,
  codeReviewVerdictNote,
  featureVerifySectionProps,
  verifyAttemptStanding,
  verifyAttemptStatus,
  verifyGateLine,
} from './verifyProof'
import { GATE_OUTCOME_SAID } from './verifyProofConstants'
import type {
  FeatureVerifyView,
  VerifyAttempt,
  VerifyReviewerVerdict,
  VerifyVerdictNote,
} from './verifyProofTypes'

/**
 * The capabilities that prove the STORY, not a single change: the full suite,
 * live/UI tests, the typecheck, build, lint/format, the code review of the
 * whole change and the end-to-end walkthrough. They cover the whole codebase, so they belong to the
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

function newestRun(runs: readonly StorySignoffProcessRun[]): StorySignoffProcessRun | undefined {
  return runs.reduce<StorySignoffProcessRun | undefined>(
    (newest, r) => (!newest || r.startedAt > newest.startedAt ? r : newest),
    undefined,
  )
}

/**
 * The runs the sign-off reads. A story is relaunched when it went wrong, so
 * every earlier run of a feature is a failure already superseded; showing its
 * attempts and time beside the current run read as if they were still open.
 * Each feature is read from its run under the story run being signed off, or —
 * when that run did not run it again — from its newest run anywhere, which is
 * where it still stands. Undefined when the story has no process run at all.
 */
function signoffScope(
  processRuns: readonly StorySignoffProcessRun[],
  features: readonly StoryFeatureRef[],
  storyRunId: string | undefined,
): SignoffScope | undefined {
  if (processRuns.length === 0) return undefined
  const storyRun =
    processRuns.find((p) => p.id === storyRunId) ??
    newestRun(processRuns.filter((p) => !p.parentRunId))
  const underStory = (p: StorySignoffProcessRun): boolean =>
    storyRun !== undefined && (p.id === storyRun.id || p.parentRunId === storyRun.id)
  const featureRuns = new Map<string, StorySignoffProcessRun>()
  for (const feature of features) {
    const runs = processRuns.filter((p) => p.featureId === feature.id)
    const latest = newestRun(runs.filter(underStory)) ?? newestRun(runs)
    if (latest) featureRuns.set(feature.id, latest)
  }
  const processRunIds = new Set([...featureRuns.values()].map((r) => r.id))
  if (storyRun) processRunIds.add(storyRun.id)
  return { storyRun, featureRuns, processRunIds }
}

/** The process run that launched each run its ledger names. */
function ledgerOwners(processRuns: readonly StorySignoffProcessRun[]): Map<string, string> {
  const owners = new Map<string, string>()
  for (const p of processRuns) {
    for (const entry of p.ledger) {
      const runId = entry.runRef?.runId
      if (runId) owners.set(runId, p.id)
    }
  }
  return owners
}

/**
 * The runs whose filings the sign-off shows: every run the scope's process runs
 * launched, whichever runner ran it, and every CLI run kept in scope.
 */
function scopedRunIds(
  scope: SignoffScope,
  processRuns: readonly StorySignoffProcessRun[],
  cliRuns: readonly StorySignoffRun[],
): Set<string> {
  const ids = new Set(cliRuns.map((r) => r.id))
  for (const p of processRuns) {
    if (!scope.processRunIds.has(p.id)) continue
    for (const entry of p.ledger) {
      const runId = entry.runRef?.runId
      if (runId) ids.add(runId)
    }
  }
  return ids
}

/**
 * The filings a sign-off shows — those its latest runs filed. A capture from an
 * earlier run is still found by id where a proof names it; it is only never
 * shown as this run's own.
 */
export function signoffEvidence<T extends { ref: Pick<ReviewEvidenceRef, 'runId'> }>(
  signoff: Pick<StorySignoff, 'evidenceRunIds'>,
  tiles: readonly T[],
): T[] {
  return tiles.filter((t) => filedInScope(signoff.evidenceRunIds, t.ref))
}

function filedInScope(
  runIds: ReadonlySet<string> | undefined,
  ref: Pick<ReviewEvidenceRef, 'runId'>,
): boolean {
  return runIds === undefined || runIds.has(ref.runId)
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
  verify: VerifyAttempt | undefined,
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
  const verdict = verify ? gateVerdict(verify) : signoffVerdict({ rows, verified })
  return {
    featureId: feature.id,
    title: feature.title,
    runId: run?.id,
    verified,
    verification: run?.verification,
    rows,
    verdict,
    statusLine: verify ? verifyAttemptStatus(verify.entry) : CHECKS_STATUS_LINE[verdict.key],
    standing: verify ? verifyAttemptStanding(verify.entry) : undefined,
    facts,
    runModel: run ? runModelOf(run) : undefined,
    agents,
    verify,
  }
}

/** A scope's work time and cost, as the pipeline sums them. */
type Measure = { workMs: number; cost?: CostSource }

function addMeasure(sum: Measure | undefined, m: Measure): Measure {
  const cost = addCost(sum?.cost, m.cost)
  return { workMs: (sum?.workMs ?? 0) + m.workMs, ...(cost ? { cost } : {}) }
}

/** The measure a totals record holds — its cost fields only, not its step bookkeeping. */
function measureOf(totals: Pick<ProcessRunTotals, 'workMs'> & CostSource): Measure {
  const cost = pickCost(totals)
  return { workMs: totals.workMs, ...(cost ? { cost } : {}) }
}

function measuredFacts(m: Measure | undefined): RunReviewFacts {
  return {
    ...runReviewFacts({ cost: m?.cost, durationMs: undefined }),
    durationLabel: m ? formatProcessDuration(m.workMs) : undefined,
  }
}

/** A story's time and cost as its pipeline counts them, split the way the sign-off shows them. */
type PipelineTotals = {
  story: Measure | undefined
  features: Map<string, Measure>
  own: Measure | undefined
}

/** The story run's own steps — everything it ran that is not a feature's run. */
function ownMeasure(storyRun: StorySignoffProcessRun | undefined): Measure | undefined {
  const totals = storyRun?.totals
  if (!storyRun || !totals || storyRun.featureId) return undefined
  let own: Measure | undefined
  for (const step of storyRun.plan.steps) {
    const stepTotals = totals.steps[step.id]
    if (stepTotals && step.subject?.kind !== 'feature') own = addMeasure(own, measureOf(stepTotals))
  }
  return own
}

/**
 * Time and cost as the pipeline counts them, for the runs the sign-off reads:
 * a feature is its latest run's own totals, the Overall is the story run's own
 * steps, and the head is those added up — so the numbers on a section always
 * belong to the attempt it shows. Undefined when none of those runs carries
 * totals, so a story with no process run falls back to its CLI records.
 */
function pipelineTotals(scope: SignoffScope | undefined): PipelineTotals | undefined {
  if (!scope) return undefined
  const features = new Map<string, Measure>()
  for (const [featureId, run] of scope.featureRuns) {
    if (run.totals) features.set(featureId, measureOf(run.totals))
  }
  const own = ownMeasure(scope.storyRun)
  if (features.size === 0 && own === undefined) return undefined
  let story = own
  for (const m of features.values()) story = addMeasure(story, m)
  return { story, features, own }
}

/** Sum cost + duration across runs, dropping a total nothing recorded. */
function sumFacts(runs: readonly StorySignoffRun[]): {
  cost: CostSource | undefined
  durationMs: number | undefined
} {
  let cost: CostSource | undefined
  let duration = 0
  let hasDuration = false
  for (const r of runs) {
    cost = addCost(cost, cliRunCost(r))
    if (r.durationMs != null) {
      duration += r.durationMs
      hasDuration = true
    }
  }
  return { cost, durationMs: hasDuration ? duration : undefined }
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

/** The story run being signed off, when the scope has one — never a feature's own run. */
function storyRunOf(scope: SignoffScope | undefined): StorySignoffProcessRun | undefined {
  const run = scope?.storyRun
  return run && !run.featureId ? run : undefined
}

/**
 * The verdict a finished code review filed — its own run's newest finding — or
 * undefined when it filed none. An earlier attempt's finding is never said for
 * the attempt that ended.
 */
function filedCodeReview(
  entry: StorySignoffProcessRun['ledger'][number],
  storyEvidence: readonly ReviewEvidenceRef[],
): VerifyReviewerVerdict | undefined {
  const runId = entry.runRef?.runId
  if (!runId) return undefined
  const reading = codeReviewVerdict(storyEvidence.filter((r) => r.runId === runId))
  return reading.state === 'concluded' ? reading.verdict : undefined
}

/**
 * How each of the story run's own steps ended — the walkthrough, the code review
 * and the final report — from its latest attempt. Each can end without filing
 * anything: a walkthrough is best-effort and skipped when it records nothing, so
 * its outcome and reason live only on the ledger — without this the Overall
 * could not say why no walkthrough is there. A finished code review that filed a
 * finding is said by its verdict, which says more than that its step passed.
 */
function captureNotes(
  storyRun: StorySignoffProcessRun | undefined,
  storyEvidence: readonly ReviewEvidenceRef[],
): VerifyVerdictNote[] {
  if (!storyRun) return []
  const notes: VerifyVerdictNote[] = []
  for (const step of storyRun.plan?.steps ?? []) {
    if (!OVERALL_NOTE_STEP_KINDS.includes(step.kind) || step.subject) continue
    const latest = storyRun.ledger.filter((e) => e.stepId === step.id).at(-1)
    if (!latest) continue
    const name = step.name ?? step.id
    if (latest.status === 'running') {
      notes.push({ label: `${name} · ${STORY_STEP_RUNNING}`, tone: 'review' })
      continue
    }
    const verdict = step.kind === 'judge' ? filedCodeReview(latest, storyEvidence) : undefined
    if (verdict) {
      notes.push(codeReviewVerdictNote(verdict))
      continue
    }
    if (!latest.outcome) continue
    const view = PROCESS_OUTCOME_VIEW[latest.outcome]
    const reason = latest.summary?.trim()
    notes.push({
      label: `${name} · ${view.label}`,
      ...(reason ? { reason } : {}),
      tone: STORY_STEP_NOTE_TONE[view.tone],
    })
  }
  return notes
}

/** What the story-wide checks came to: any failure fails them; green only over something that passed. */
function overallStatus(rows: readonly { state: string }[]): VerifyReviewStatus {
  if (rows.some((r) => r.state === 'failed')) return OVERALL_STATUS.failed
  if (rows.some((r) => r.state === 'passed')) return OVERALL_STATUS.green
  return OVERALL_STATUS.unchecked
}

/**
 * The story-wide section: the whole-codebase checks aggregated across features,
 * the story's own runs' cost, the agents that ran them, and how its walkthrough
 * ended. Always there for a story run — it is where the story's own steps are
 * read, even when none of them filed anything; without one, present only when a
 * story-wide check ran or something story-wide was filed.
 */
function buildOverall(
  storyRun: StorySignoffProcessRun | undefined,
  featureRuns: readonly StorySignoffRun[],
  featureAgents: readonly SignoffAgent[][],
  storyRuns: readonly StorySignoffRun[],
  storyEvidence: readonly ReviewEvidenceRef[],
  roleOf: Map<string, string>,
  facts: RunReviewFacts,
): OverallSignoff | undefined {
  const mergedChecks = mergeChecks(featureRuns)
  const hasEvidence = storyEvidence.length > 0
  if (!storyRun && mergedChecks.length === 0 && !hasEvidence) return undefined

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
  // If any feature's change was read, the story's diff was read — what the Code
  // review chip falls back to for a story from before code reviews.
  const diffReview = featureRuns.map((r) => r.diffReview).find((d) => d !== undefined)
  const allRows = checkMethodRows({
    verification,
    approaches: [],
    evidence: storyEvidence,
    ...(diffReview ? { diffReview } : {}),
  })
  const rows = allRows.filter((r) => OVERALL_METHODS.includes(r.id))

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
    statusLine: overallStatus(rows),
    notes: captureNotes(storyRun, storyEvidence),
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

/** The proven features over those shown — what the verdict word is counted against. */
function tallyOf(proven: number, total: number): SignoffTally | undefined {
  if (total === 0) return undefined
  return {
    label: `${proven}/${total}`,
    title: `${proven} of ${total} ${featureWord(total)} proven`,
  }
}

function digestOf(features: readonly FeatureSignoff[]): StoryDigest {
  const count = (k: SignoffVerdictKey): number => features.filter((f) => f.verdict.key === k).length
  return {
    total: features.length,
    proven: count('proven'),
    partly: count('partly'),
    failed: count('failed'),
    notRun: count('not-run'),
    accepted: features.filter(isAccepted).length,
    tally: tallyOf(count('proven'), features.length),
  }
}

/**
 * The verdict's own line, for an outcome that needs explaining. A clean proven
 * verdict is already said in full by its badge and tally; anything else — a
 * failure, an acceptance, an unfinished story — says what went otherwise.
 */
function headlineOf(verdict: SignoffVerdict): SignoffHeadline | undefined {
  return verdict.key === 'proven' ? undefined : { title: verdict.title, detail: verdict.detail }
}

/**
 * Whether a sign-off can be shown yet. Until the runs, the story and the
 * evidence have all loaded it would be computed from part of them — no runs
 * means no scope, so every run's filings show and every feature reads as not
 * verified — and that verdict then flips once the rest arrives. Only the runs
 * and the story are needed to compute it at all; evidence that failed to load
 * does not hold it back, since each capture says it could not be loaded.
 */
export function signoffLoadStatus(sources: SignoffSources): SignoffLoadStatus {
  if (sources.runs === 'failed' || sources.stories === 'failed') return 'failed'
  const states = [sources.runs, sources.stories, sources.evidence]
  return states.includes('loading') ? 'loading' : 'ready'
}

export function buildStorySignoff(input: BuildStorySignoffInput): StorySignoff {
  const { features, processRuns, storyIncomplete } = input
  const scope = signoffScope(processRuns, features, input.storyRunId)
  const owners = ledgerOwners(processRuns)
  const cliRuns = scope
    ? input.cliRuns.filter((r) => {
        const owner = r.processRunId ?? owners.get(r.id)
        return owner !== undefined && scope.processRunIds.has(owner)
      })
    : input.cliRuns
  const evidenceRunIds = scope ? scopedRunIds(scope, processRuns, cliRuns) : undefined
  const evidence = input.evidence.filter((ref) => filedInScope(evidenceRunIds, ref))
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

  const pipeline = pipelineTotals(scope)

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
    const featureRun = scope?.featureRuns.get(feature.id)
    const agents = agentsFor(runs, roleOf)
    featureAgents.push(agents)
    const featureEvidence = evidence.filter((e) => (e.featureId ?? '') === feature.id)
    featureSignoffs.push(
      featureSignoffFor(
        feature,
        run,
        featureEvidence,
        agents,
        featureRun ? acceptedVerifyAttempt(featureRun) : undefined,
        pipeline
          ? measuredFacts(pipeline.features.get(feature.id))
          : runReviewFacts({
              cost: run ? cliRunCost(run) : undefined,
              durationMs: run?.durationMs,
            }),
      ),
    )
  }

  const storyEvidence = evidence.filter((e) => (e.featureId ?? '') === '')
  const overall = buildOverall(
    storyRunOf(scope),
    chosenRuns,
    featureAgents,
    storyRuns,
    storyEvidence,
    roleOf,
    pipeline ? measuredFacts(pipeline.own) : runReviewFacts(sumFacts(storyRuns)),
  )

  const verdict = aggregateStoryVerdict(featureSignoffs, storyIncomplete)
  return {
    features: featureSignoffs,
    overall,
    verdict,
    headline: headlineOf(verdict),
    digest: digestOf(featureSignoffs),
    // The head total spans what the sections show: each feature's latest run
    // and the story run's own steps when it ran under a process, else the
    // features it chose to show AND its own story-scoped runs (the walkthrough).
    facts: pipeline
      ? measuredFacts(pipeline.story)
      : runReviewFacts(sumFacts([...chosenRuns, ...storyRuns])),
    evidenceRunIds,
  }
}

function isStepReport(t: EvidenceTile): boolean {
  return STEP_REPORT_AUTHORS.includes(reportAuthor(t.ref))
}

function signoffSection(featureId: string, tiles: readonly EvidenceTile[]): SignoffSection {
  const isStory = featureId === ''
  const reports = tiles.filter((t) => t.ref.kind === 'report')
  const stepReport = newestOnly(
    reports.filter(
      (t) => reportAuthor(t.ref) === SECTION_STEP_REPORT[isStory ? 'story' : 'feature'],
    ),
  )
  const reviews = tiles.filter((t) => isCodeReview(t.ref))
  const reading = codeReviewVerdict(reviews.map((t) => t.ref))
  return {
    pairs: screenPairs(groupEvidence(tiles)).map((p) => ({ ...p, key: `${featureId}::${p.key}` })),
    recordings: tiles.filter((t) => t.ref.kind === 'recording'),
    reports: [...stepReport, ...latestReport(reports)],
    codeReviews: newestOnly(reviews),
    notes:
      !isStory && reading.state === 'concluded' ? [codeReviewVerdictNote(reading.verdict)] : [],
    leadTab: isStory && stepReport.length > 0 ? 'report' : undefined,
  }
}

/**
 * Each section's filings — the story-wide Overall under `''`, a feature under
 * its id — of those the sign-off shows, each routed by who filed it: a code
 * review to its own tab, the story's final report to the Overall's Report tab,
 * a feature's report to the feature's, leading the verifier's newest. Pair keys
 * are namespaced by section, so they stay unique across the one overlay.
 */
export function signoffSections(
  signoff: Pick<StorySignoff, 'evidenceRunIds'>,
  tiles: readonly EvidenceTile[],
): Map<string, SignoffSection> {
  const bySection = new Map<string, EvidenceTile[]>()
  for (const t of signoffEvidence(signoff, tiles)) {
    const id = t.ref.featureId ?? ''
    const list = bySection.get(id)
    if (list) list.push(t)
    else bySection.set(id, [t])
  }
  const sections = new Map<string, SignoffSection>()
  for (const [id, list] of bySection) sections.set(id, signoffSection(id, list))
  return sections
}

/**
 * What a sign-off section is handed. A feature with a verify attempt shows that
 * attempt — its proof, its notes, its report — with its own report step's
 * account leading the Report tab and its code review after the reviewer's word.
 */
export function signoffSectionProps(
  section: SignoffSection,
  view: FeatureVerifyView | undefined,
): SignoffSectionProps {
  const tabs = {
    codeReviews: section.codeReviews,
    ...(section.leadTab ? { leadTab: section.leadTab } : {}),
  }
  if (!view) {
    return {
      pairs: section.pairs,
      recordings: section.recordings,
      reports: section.reports,
      notes: section.notes,
      ...tabs,
    }
  }
  const verified = featureVerifySectionProps(view)
  return {
    ...verified,
    reports: [...section.reports.filter(isStepReport), ...verified.reports],
    notes: [...verified.notes, ...section.notes],
    ...tabs,
  }
}
