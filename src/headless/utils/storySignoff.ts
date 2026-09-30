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
  CHECK_STATE_TONES,
  NOT_RUN_TITLE,
  SIGNOFF_VERDICT_TONES,
  SIGNOFF_VERDICT_WORDS,
  STORY_UNFINISHED_TITLE,
} from './checkMethodConstants'
import { checkMethodRows, joinNames, signoffVerdict } from './checkMethods'
import type {
  CheckMethodId,
  CheckMethodRow,
  SignoffVerdict,
  SignoffVerdictKey,
} from './checkMethodTypes'
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
import { REVIEWER_VERDICT_LABEL, STEP_REPORT_AUTHORS } from './reviewEvidenceViewConstants'
import type { EvidenceTile } from './reviewEvidenceViewTypes'
import { runReviewFacts } from './runReview'
import type { RunReviewFacts } from './runReviewTypes'
import { NOT_VERIFIED_DETAIL } from './runReviewConstants'
import {
  CODE_REVIEW_SUMMARY,
  CODE_REVIEW_SUMMARY_VERDICTS,
  CODE_REVIEWER_ROLE,
  FIX_EMPTY_LABEL,
  FIX_NOTE_LABEL,
  FIX_SECTION_PREFIX,
  FIX_SENT_BY_TITLE,
  FIX_SENT_BY_UNKNOWN,
  FIXER_ROLE,
  FEATURE_REVIEW_ACCEPTED_SUFFIX,
  FEATURE_REVIEW_TURNED_BACK,
  OVERALL_STATUS,
  SECTION_STEP_REPORT,
  STORY_STEP_KINDS,
  STORY_STEP_METHODS,
  STORY_STEP_NOT_RUN,
  STORY_STEP_NOTE_TONE,
  STORY_STEP_TABS,
  STORY_STEP_WORDS,
  STORY_REVIEW_TURNED_BACK,
  STORY_WIDE_ONLY_TITLE,
} from './storySignoffConstants'
import type {
  BuildStorySignoffInput,
  FeatureSignoff,
  FixPass,
  FixSignoff,
  SectionCodeReview,
  SectionSignoff,
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
  StoryStepKey,
  StoryStepLine,
} from './storySignoffTypes'
import {
  acceptedVerifyAttempt,
  codeReviewVerdictNote,
  featureVerifySectionProps,
  featureVerifyView,
  verifyAttemptStanding,
  verifyAttemptStatus,
  verifyGateLine,
} from './verifyProof'
import { ACCEPTED_BY_YOU, ACCEPTING_CHOICES, GATE_OUTCOME_SAID } from './verifyProofConstants'
import type {
  EvidenceLoadState,
  FeatureVerifyView,
  VerifyAttempt,
  VerifyReviewerVerdict,
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

/** Whoever changed the code, then whoever read it, then whoever checked it — the order work happens in. */
const ROLE_ORDER: readonly string[] = ['developer', FIXER_ROLE, CODE_REVIEWER_ROLE, 'verifier']
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
  const fixPasses = fixPassesOf(storyRun, processRuns)
  const processRunIds = new Set([
    ...[...featureRuns.values()].map((r) => r.id),
    ...fixPasses.map((f) => f.run.id),
  ])
  if (storyRun) processRunIds.add(storyRun.id)
  return { storyRun, featureRuns, fixPasses, processRunIds }
}

/**
 * The story run's fix passes: each nested run a non-feature `process` step of it
 * launched, in the order its ledger ran them, with what sent the work back —
 * read, as the backend reads it, from the ledger entry right before the fix's.
 */
function fixPassesOf(
  storyRun: StorySignoffProcessRun | undefined,
  processRuns: readonly StorySignoffProcessRun[],
): FixPass[] {
  if (!storyRun || storyRun.featureId) return []
  const steps = storyRun.plan?.steps ?? []
  const passes: FixPass[] = []
  storyRun.ledger.forEach((entry, i) => {
    const step = steps.find((s) => s.id === entry.stepId)
    if (step?.kind !== 'process' || step.subject?.kind === 'feature') return
    const run = processRuns.find((p) => p.id === entry.childRunId)
    if (!run) return
    const before = storyRun.ledger[i - 1]
    const kind = steps.find((s) => s.id === before?.stepId)?.kind
    const request: Pick<FixPass, 'sentBy' | 'note'> =
      kind === 'judge' && before?.outcome === 'failed'
        ? { sentBy: 'code-review', note: undefined }
        : kind === 'gate' && before?.override?.choice === 'request-changes'
          ? { sentBy: 'sign-off', note: before.override.note?.trim() || undefined }
          : { sentBy: undefined, note: undefined }
    passes.push({ run, pass: passes.length + 1, stepName: step.name, ...request })
  })
  return passes
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
      const role =
        step.agentType ??
        (step.kind === STORY_STEP_KINDS['code-review'] ? CODE_REVIEWER_ROLE : undefined)
      if (role) stepRole.set(step.id, role)
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

/** The runs a code review step launched — a reading of the change, never the change. */
function codeReviewRuns(processRuns: readonly StorySignoffProcessRun[]): Set<string> {
  const ids = new Set<string>()
  for (const p of processRuns) {
    const judges = new Set(
      (p.plan?.steps ?? [])
        .filter((s) => s.kind === STORY_STEP_KINDS['code-review'])
        .map((s) => s.id),
    )
    for (const entry of p.ledger) {
      const runId = entry.runRef?.runId
      if (runId && judges.has(entry.stepId)) ids.add(runId)
    }
  }
  return ids
}

/**
 * The run whose state a feature's section reflects.
 *
 * A feature's child run can own a developer run plus verifier/remedy/retry runs.
 * The one that carries the stamped verification/verdict is what a reviewer is
 * deciding on, and the LATEST such run is the current state — a remedy pass
 * supersedes the first attempt. With nothing decided yet, the latest run that
 * did the work: a feature's code review runs right after it, and only reads it.
 */
function pickImplementingRun(
  runs: readonly StorySignoffRun[],
  reviews: ReadonlySet<string>,
): StorySignoffRun | undefined {
  if (runs.length === 0) return undefined
  const decided = runs.filter((r) => r.verdict !== undefined || r.verification !== undefined)
  const worked = runs.filter((r) => !reviews.has(r.id))
  const pool = decided.length > 0 ? decided : worked.length > 0 ? worked : runs
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

/** Where a section stands: its verdict, the line beside its title, and its standing. */
type SectionStanding = Pick<SectionSignoff, 'verdict' | 'statusLine' | 'standing'>

/**
 * A feature's standing once its code review is read over it. A review that
 * turned the change back fails the feature whatever its verify gate said — its
 * back edge sends the work to be fixed, so a verify passing beside it is a pass
 * on something the review would not let through. A person who carried it on
 * past that review accepted it; it is never proven over the review.
 */
function reviewedStanding(
  base: SectionStanding,
  review: SectionCodeReview | undefined,
): SectionStanding {
  const line = review?.line
  if (!line || line.check !== 'failed') return base
  const title = `${line.name}: ${line.word.toLowerCase()}`
  const detail = line.line ?? FEATURE_REVIEW_TURNED_BACK
  if (!review.accepted) {
    return {
      ...base,
      verdict: makeVerdict('failed', title, detail),
      statusLine: { tone: 'stuck', label: line.word },
    }
  }
  if (base.verdict.key !== 'proven') return base
  return {
    verdict: makeVerdict('partly', `${title}${FEATURE_REVIEW_ACCEPTED_SUFFIX}`, detail),
    statusLine: { tone: 'review', label: ACCEPTED_BY_YOU },
    standing: 'accepted',
  }
}

/** What a feature's or a fix pass's section shows, from its chosen run, its filings and its own run's ledger. */
function sectionSignoffFor(
  run: StorySignoffRun | undefined,
  evidence: readonly ReviewEvidenceRef[],
  agents: SignoffAgent[],
  verify: VerifyAttempt | undefined,
  codeReview: SectionCodeReview | undefined,
  facts: RunReviewFacts,
): SectionSignoff {
  const filedRows = checkMethodRows({
    verification: run?.verification,
    // The story gate is read-only: it never offers to run or request a check, so
    // it does not need the per-run verification PLAN that tells "not run" from
    // "not set up" — the chips still colour by state from the record + evidence.
    approaches: [],
    evidence,
    ...(run?.verdict?.by ? { verdictBy: run.verdict.by } : {}),
    ...(run?.diffReview ? { diffReview: run.diffReview } : {}),
  })
  const rows = codeReview
    ? filedRows.map((row) =>
        row.id === STORY_STEP_METHODS['code-review']
          ? stepRow(row, 'code-review', codeReview.line)
          : row,
      )
    : filedRows
  const verified = run?.verification !== undefined
  const verdict = verify ? gateVerdict(verify) : signoffVerdict({ rows, verified })
  const standing = reviewedStanding(
    {
      verdict,
      statusLine: verify ? verifyAttemptStatus(verify.entry) : CHECKS_STATUS_LINE[verdict.key],
      standing: verify ? verifyAttemptStanding(verify.entry) : undefined,
    },
    codeReview,
  )
  return {
    runId: run?.id,
    verified,
    verification: run?.verification,
    rows,
    ...standing,
    facts,
    runModel: run ? runModelOf(run) : undefined,
    agents,
    verify,
    codeReview,
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
  /** Each fix pass's own totals, by its process run's id. */
  fixes: Map<string, Measure>
  own: Measure | undefined
}

/** The story run's own steps — everything it ran that is not a nested run: a feature's, or a fix pass's. */
function ownMeasure(storyRun: StorySignoffProcessRun | undefined): Measure | undefined {
  const totals = storyRun?.totals
  if (!storyRun || !totals || storyRun.featureId) return undefined
  let own: Measure | undefined
  for (const step of storyRun.plan.steps) {
    const stepTotals = totals.steps[step.id]
    if (stepTotals && step.kind !== 'process') own = addMeasure(own, measureOf(stepTotals))
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
  const fixes = new Map<string, Measure>()
  for (const { run } of scope.fixPasses) {
    if (run.totals) fixes.set(run.id, measureOf(run.totals))
  }
  const own = ownMeasure(scope.storyRun)
  if (features.size === 0 && fixes.size === 0 && own === undefined) return undefined
  let story = own
  for (const m of [...features.values(), ...fixes.values()]) story = addMeasure(story, m)
  return { story, features, fixes, own }
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

type LedgerEntry = StorySignoffProcessRun['ledger'][number]

/**
 * The verdict a finished code review filed — its own run's newest finding — or
 * undefined when it filed none. An earlier attempt's finding is never said for
 * the attempt that ended.
 */
function filedCodeReview(
  entry: LedgerEntry,
  storyEvidence: readonly ReviewEvidenceRef[],
): VerifyReviewerVerdict | undefined {
  const runId = entry.runRef?.runId
  if (!runId) return undefined
  const reading = codeReviewVerdict(storyEvidence.filter((r) => r.runId === runId))
  return reading.state === 'concluded' ? reading.verdict : undefined
}

/**
 * A code review attempt's verdict as its ledger entry keeps it: the verdict the
 * driver copied onto it, or — on an entry written before it kept one — read back
 * from the summary the driver wrote from it. Either way it was read while the
 * finding could still be vouched for, so a restart never loses it.
 */
export function ledgerCodeReview(entry: LedgerEntry): VerifyReviewerVerdict | undefined {
  if (entry.review) return entry.review
  const said = CODE_REVIEW_SUMMARY.exec(entry.summary?.trim() ?? '')
  if (!said) return undefined
  const reason = said[2]?.trim()
  return {
    verdict: CODE_REVIEW_SUMMARY_VERDICTS[said[1]],
    ...(reason ? { reason } : {}),
  }
}

/**
 * The verdict a feature's code review attempt filed while it ran — only a
 * filing that attempt made, so an earlier attempt's verdict is never said for it.
 */
function reviewFiledWithin(
  entry: LedgerEntry,
  evidence: readonly ReviewEvidenceRef[],
): VerifyReviewerVerdict | undefined {
  const reading = codeReviewVerdict(
    evidence.filter(
      (r) =>
        r.createdAt >= entry.startedAt &&
        (entry.endedAt === undefined || r.createdAt <= entry.endedAt),
    ),
  )
  return reading.state === 'concluded' ? reading.verdict : undefined
}

/**
 * A finished code review attempt's verdict: what its ledger entry kept, else
 * what it filed. Nothing while it still runs.
 */
function attemptReview(
  entry: LedgerEntry,
  filed: (entry: LedgerEntry) => VerifyReviewerVerdict | undefined,
): VerifyReviewerVerdict | undefined {
  if (entry.status === 'running') return undefined
  return ledgerCodeReview(entry) ?? filed(entry)
}

/**
 * A section's own code review — a feature's or a fix pass's — from its run's
 * latest attempt at it. Undefined when the run has no code review step — then
 * what was filed decides.
 */
function runCodeReview(
  run: StorySignoffProcessRun | undefined,
  evidence: readonly ReviewEvidenceRef[],
): SectionCodeReview | undefined {
  const step = run?.plan?.steps.find(
    (s) => s.kind === STORY_STEP_KINDS['code-review'] && !s.subject,
  )
  if (!run || !step) return undefined
  const entry = run.ledger.filter((e) => e.stepId === step.id).at(-1)
  if (!entry) return { line: undefined, verdict: undefined, accepted: false }
  const verdict = attemptReview(entry, (e) => reviewFiledWithin(e, evidence))
  const line = storyStepLine('code-review', step.name, entry, verdict)
  const accepted =
    line.check === 'failed' &&
    entry.override !== undefined &&
    ACCEPTING_CHOICES.includes(entry.override.choice)
  return { line, verdict, accepted }
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * How one of the story run's own steps came out, from its latest attempt. Only a
 * recorded walkthrough, an approving code review and a written report pass their
 * chip; a code review that turned the change back fails it whatever its step's
 * outcome — a story's review never blocks, so its step always "passed".
 */
function storyStepLine(
  key: StoryStepKey,
  name: string,
  entry: LedgerEntry,
  review: VerifyReviewerVerdict | undefined,
): StoryStepLine {
  const reason = entry.summary?.trim() || undefined
  const line = (
    word: string,
    tone: StoryStepLine['tone'],
    check: StoryStepLine['check'],
    said: string | undefined,
  ): StoryStepLine => ({ key, name, word, line: said, tone, check })
  if (entry.status === 'running') {
    return line(STORY_STEP_WORDS.running, 'review', 'unchecked', undefined)
  }
  if (key === 'code-review') {
    if (review) {
      const approved = review.verdict === 'approved'
      return line(
        REVIEWER_VERDICT_LABEL[review.verdict],
        approved ? 'done' : 'stuck',
        approved ? 'passed' : 'failed',
        review.reason,
      )
    }
    if (entry.outcome === 'passed' || entry.outcome === 'failed') {
      return line(STORY_STEP_WORDS.noVerdict, 'review', 'unchecked', reason)
    }
  }
  if (key === 'walkthrough' && entry.outcome === 'passed') {
    return line(STORY_STEP_WORDS.recorded, 'done', 'passed', undefined)
  }
  if (key === 'walkthrough' && entry.outcome === 'failed') {
    return line(STORY_STEP_WORDS.failed, 'stuck', 'failed', reason)
  }
  if (key === 'report' && entry.outcome === 'passed') {
    return line(STORY_STEP_WORDS.written, 'neutral', 'passed', reason)
  }
  if (key === 'report' && entry.outcome === 'skipped') {
    return line(STORY_STEP_WORDS.notWritten, 'review', 'unchecked', reason)
  }
  const view = PROCESS_OUTCOME_VIEW[entry.outcome ?? 'skipped']
  return line(capitalized(view.label), STORY_STEP_NOTE_TONE[view.tone], 'unchecked', reason)
}

/**
 * The story run's own steps its plan holds — the walkthrough, the code review and
 * the final report — each with its latest attempt, absent until it has run.
 */
function storyStepsOf(
  storyRun: StorySignoffProcessRun,
): { key: StoryStepKey; name: string; entry: LedgerEntry | undefined }[] {
  const keys = Object.keys(STORY_STEP_KINDS) as StoryStepKey[]
  return (storyRun.plan?.steps ?? []).flatMap((step) => {
    const key = keys.find((k) => STORY_STEP_KINDS[k] === step.kind)
    if (!key || step.subject) return []
    const entry = storyRun.ledger.filter((e) => e.stepId === step.id).at(-1)
    return [{ key, name: step.name ?? step.id, entry }]
  })
}

/**
 * A chip one of the story run's own steps decides, from how that step came out
 * rather than from what it filed: what it filed is sealed per backend process,
 * so a restart strips every verdict and leaves the chip unable to say anything.
 */
function stepRow(
  row: CheckMethodRow,
  key: StoryStepKey,
  step: StoryStepLine | undefined,
): CheckMethodRow {
  const state = step?.check ?? 'unchecked'
  const concluded = state === 'passed' || state === 'failed'
  return {
    ...row,
    state,
    tone: CHECK_STATE_TONES[state],
    detail: step ? (step.line ?? step.word) : STORY_STEP_NOT_RUN,
    action: concluded ? { kind: 'open-proof', tab: STORY_STEP_TABS[key] } : row.action,
  }
}

/**
 * What the story-wide checks came to: any failure fails them; green only over
 * something that passed. A written report is an account of the run, not a check
 * of it, so on its own it never makes them green.
 */
function overallStatus(rows: readonly CheckMethodRow[]): VerifyReviewStatus {
  if (rows.some((r) => r.state === 'failed')) return OVERALL_STATUS.failed
  if (rows.some((r) => r.state === 'passed' && r.id !== 'report')) return OVERALL_STATUS.green
  return OVERALL_STATUS.unchecked
}

/**
 * The story-wide section: the whole-codebase checks aggregated across features,
 * the story's own runs' cost, the agents that ran them, and how its own steps
 * came out. Always there for a story run — it is where the story's own steps are
 * read, even when none of them filed anything; without one, present only when a
 * story-wide check ran or something story-wide was filed, its chips read from
 * what was filed.
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

  const planned = storyRun ? storyStepsOf(storyRun) : []
  const steps = planned.flatMap(({ key, name, entry }) =>
    entry
      ? [
          storyStepLine(
            key,
            name,
            entry,
            key === 'code-review'
              ? attemptReview(entry, (e) => filedCodeReview(e, storyEvidence))
              : undefined,
          ),
        ]
      : [],
  )
  const methods = [
    ...OVERALL_METHODS,
    ...(planned.some((p) => p.key === 'report') ? (['report'] as const) : []),
  ]
  const rows = allRows
    .filter((r) => methods.includes(r.id))
    .map((row) => {
      const key = planned.find((p) => STORY_STEP_METHODS[p.key] === row.id)?.key
      return key
        ? stepRow(
            row,
            key,
            steps.find((l) => l.key === key),
          )
        : row
    })

  // The verifier ran the checks; a story-scoped capture run (walkthrough) may add
  // its own agent. Dedupe by role, verifier first.
  const byRole = new Map<string, SignoffAgent>()
  for (const agents of featureAgents) {
    for (const a of agents)
      if (a.role === 'verifier' && !byRole.has('verifier')) byRole.set(a.role, a)
  }
  for (const a of agentsFor(storyRuns, roleOf)) {
    if (a.role !== FIXER_ROLE && !byRole.has(a.role)) byRole.set(a.role, a)
  }
  const agents = [...byRole.values()].sort(
    (x, y) => roleRank(x.role) - roleRank(y.role) || x.role.localeCompare(y.role),
  )

  return {
    rows,
    verification,
    statusLine: overallStatus(rows),
    steps,
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
 * is named, not counted among what still needs proving. The newest fix pass is
 * checked like a feature: one that failed fails the story, and one nobody proved
 * keeps it from reading proven. An earlier pass is history the newest superseded.
 */
export function aggregateStoryVerdict(
  features: readonly FeatureSignoff[],
  storyIncomplete: string | undefined,
  overall?: Pick<OverallSignoff, 'rows' | 'steps'>,
  fixes: readonly FixSignoff[] = [],
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
  const newestFix = fixes.at(0)
  if (newestFix?.verdict.key === 'failed') {
    return makeVerdict('failed', `${newestFix.label} failed`, newestFix.verdict.detail)
  }
  const turnedBack = overall ? reviewTurnedBack(overall.steps) : undefined
  if (turnedBack) return turnedBack
  if (total > 0 && open === 0) {
    // Every feature that ran is settled — but if the story itself is unfinished
    // (a feature never ran at all), "proven" would sit above the count of what
    // is outstanding. Demote exactly as the single-run headline does.
    if (storyIncomplete) return makeVerdict('partly', STORY_UNFINISHED_TITLE, storyIncomplete)
    if (newestFix && newestFix.verdict.key !== 'proven') {
      return makeVerdict('partly', `${newestFix.label} is not proven`, newestFix.verdict.detail)
    }
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
  return (
    (overall ? storyWideVerdict(overall) : undefined) ??
    makeVerdict('not-run', NOT_RUN_TITLE, NOT_VERIFIED_DETAIL)
  )
}

/**
 * The story's code review turning the change back, as the headline. The story's
 * review never blocks — the person signing off decides — so every feature can be
 * proven beneath it; "Proven" over a review that asked for changes contradicts
 * it. Only the review demotes the story: a walkthrough is best-effort.
 */
function reviewTurnedBack(steps: readonly StoryStepLine[]): SignoffVerdict | undefined {
  const review = steps.find((l) => l.key === 'code-review' && l.check === 'failed')
  if (!review) return undefined
  return {
    ...makeVerdict(
      'failed',
      `${review.name}: ${review.word.toLowerCase()}`,
      review.line ?? STORY_REVIEW_TURNED_BACK,
    ),
    word: review.word,
  }
}

/**
 * The story headline when no feature has a verdict but the story's own checks
 * concluded something: "nothing has been checked" over a walkthrough that was
 * recorded and a code review that turned the change back is false. What failed
 * is named — a story step by what it came to — and a pass is only partly proven,
 * since no feature was verified.
 */
function storyWideVerdict(
  overall: Pick<OverallSignoff, 'rows' | 'steps'>,
): SignoffVerdict | undefined {
  const failed = overall.rows.filter((r) => r.state === 'failed')
  if (failed.length > 0) {
    const titleOf = (row: CheckMethodRow): string => {
      const step = overall.steps.find((l) => STORY_STEP_METHODS[l.key] === row.id)
      return step ? `${step.name}: ${step.word.toLowerCase()}` : `${row.label} failed`
    }
    return makeVerdict(
      'failed',
      failed.length === 1 ? titleOf(failed[0]) : `${failed.length} story-wide checks failed`,
      failed.map((r) => r.detail).join(' · '),
    )
  }
  const passed = overall.rows.filter((r) => r.state === 'passed' && r.id !== 'report')
  if (passed.length === 0) return undefined
  return makeVerdict('partly', STORY_WIDE_ONLY_TITLE, `${joinNames(passed)} passed story-wide.`)
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
  const reviewRuns = codeReviewRuns(processRuns)
  const featureOf = (r: StorySignoffRun): string | undefined =>
    (r.processRunId ? byProcessRun.get(r.processRunId) : undefined) ?? byRunId.get(r.id)
  const fixPasses = scope?.fixPasses ?? []
  const fixIds = new Set(fixPasses.map((f) => f.run.id))

  const runsByFeature = new Map<string, StorySignoffRun[]>()
  const runsByFix = new Map<string, StorySignoffRun[]>()
  // Runs that belong to no feature and no fix pass are story-scoped (the overall
  // walkthrough capture, any story-level agent) — they feed the Overall section,
  // and are never double-counted into a feature's or a fix pass's cost.
  const storyRuns: StorySignoffRun[] = []
  const add = (bucket: Map<string, StorySignoffRun[]>, key: string, r: StorySignoffRun) =>
    bucket.set(key, [...(bucket.get(key) ?? []), r])
  for (const r of cliRuns) {
    const fid = featureOf(r)
    const owner = r.processRunId ?? owners.get(r.id)
    if (fid) add(runsByFeature, fid, r)
    else if (owner && fixIds.has(owner)) add(runsByFix, owner, r)
    else storyRuns.push(r)
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
    const run = pickImplementingRun(runs, reviewRuns)
    if (run) chosenRuns.push(run)
    const featureRun = scope?.featureRuns.get(feature.id)
    const agents = agentsFor(runs, roleOf)
    featureAgents.push(agents)
    const featureEvidence = evidence.filter((e) => (e.featureId ?? '') === feature.id)
    featureSignoffs.push({
      featureId: feature.id,
      title: feature.title,
      ...sectionSignoffFor(
        run,
        featureEvidence,
        agents,
        featureRun ? acceptedVerifyAttempt(featureRun) : undefined,
        runCodeReview(featureRun, featureEvidence),
        pipeline
          ? measuredFacts(pipeline.features.get(feature.id))
          : runReviewFacts({
              cost: run ? cliRunCost(run) : undefined,
              durationMs: run?.durationMs,
            }),
      ),
    })
  }

  const fixSignoffs: FixSignoff[] = []
  const fixRunIds = new Set<string>()
  for (const fix of [...fixPasses].reverse()) {
    const runs = runsByFix.get(fix.run.id) ?? []
    const run = pickImplementingRun(runs, reviewRuns)
    if (run) chosenRuns.push(run)
    const runIds = [...new Set(fix.run.ledger.flatMap((e) => (e.runRef ? [e.runRef.runId] : [])))]
    for (const id of runIds) fixRunIds.add(id)
    const owned = new Set(runIds)
    const fixEvidence = evidence.filter((e) => !e.featureId && owned.has(e.runId))
    fixSignoffs.push({
      processRunId: fix.run.id,
      sectionId: `${FIX_SECTION_PREFIX}${fix.run.id}`,
      pass: fix.pass,
      label: `${fix.stepName} · pass ${fix.pass}`,
      title: fix.sentBy ? FIX_SENT_BY_TITLE[fix.sentBy] : FIX_SENT_BY_UNKNOWN,
      sentBy: fix.sentBy,
      note: fix.note,
      runIds,
      ...sectionSignoffFor(
        run,
        fixEvidence,
        agentsFor(runs, roleOf),
        acceptedVerifyAttempt(fix.run),
        runCodeReview(fix.run, fixEvidence),
        pipeline
          ? measuredFacts(pipeline.fixes.get(fix.run.id))
          : runReviewFacts({
              cost: run ? cliRunCost(run) : undefined,
              durationMs: run?.durationMs,
            }),
      ),
    })
  }

  const storyEvidence = evidence.filter((e) => !e.featureId && !fixRunIds.has(e.runId))
  const overall = buildOverall(
    storyRunOf(scope),
    chosenRuns,
    featureAgents,
    storyRuns,
    storyEvidence,
    roleOf,
    pipeline ? measuredFacts(pipeline.own) : runReviewFacts(sumFacts(storyRuns)),
  )

  const verdict = aggregateStoryVerdict(featureSignoffs, storyIncomplete, overall, fixSignoffs)
  return {
    features: featureSignoffs,
    fixes: fixSignoffs,
    overall,
    verdict,
    headline: headlineOf(verdict),
    digest: digestOf(featureSignoffs),
    // The head total spans what the sections show: each feature's latest run,
    // each fix pass and the story run's own steps when it ran under a process,
    // else the runs it chose to show AND its own story-scoped runs.
    facts: pipeline
      ? measuredFacts(pipeline.story)
      : runReviewFacts(sumFacts([...chosenRuns, ...storyRuns])),
    evidenceRunIds,
  }
}

function isStepReport(t: EvidenceTile): boolean {
  return STEP_REPORT_AUTHORS.includes(reportAuthor(t.ref))
}

function signoffSection(sectionId: string, tiles: readonly EvidenceTile[]): SignoffSection {
  const isStory = sectionId === ''
  const reports = tiles.filter((t) => t.ref.kind === 'report')
  const stepReport = newestOnly(
    reports.filter(
      (t) => reportAuthor(t.ref) === SECTION_STEP_REPORT[isStory ? 'story' : 'feature'],
    ),
  )
  const reviews = tiles.filter((t) => isCodeReview(t.ref))
  const reading = codeReviewVerdict(reviews.map((t) => t.ref))
  return {
    pairs: screenPairs(groupEvidence(tiles)).map((p) => ({ ...p, key: `${sectionId}::${p.key}` })),
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
 * its id, a fix pass under its `sectionId` by the runs it launched — of those
 * the sign-off shows, each routed by who filed it: a code
 * review to its own tab, the story's final report to the Overall's Report tab,
 * a feature's report to the feature's, leading the verifier's newest. Pair keys
 * are namespaced by section, so they stay unique across the one overlay.
 */
export function signoffSections(
  signoff: Pick<StorySignoff, 'evidenceRunIds' | 'fixes'>,
  tiles: readonly EvidenceTile[],
): Map<string, SignoffSection> {
  const fixOf = new Map<string, string>()
  for (const fix of signoff.fixes) for (const id of fix.runIds) fixOf.set(id, fix.sectionId)
  const bySection = new Map<string, EvidenceTile[]>()
  for (const t of signoffEvidence(signoff, tiles)) {
    const id = t.ref.featureId || fixOf.get(t.ref.runId) || ''
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
 * A feature whose run reviewed its code says that review's verdict as its run's
 * ledger keeps it — the latest attempt's — never what a filing still shows.
 */
export function signoffSectionProps(
  section: SignoffSection,
  view: FeatureVerifyView | undefined,
  codeReview?: SectionCodeReview,
): SignoffSectionProps {
  const tabs = {
    codeReviews: section.codeReviews,
    ...(section.leadTab ? { leadTab: section.leadTab } : {}),
  }
  const reviewNotes = !codeReview
    ? section.notes
    : codeReview.verdict
      ? [codeReviewVerdictNote(codeReview.verdict)]
      : []
  if (!view) {
    return {
      pairs: section.pairs,
      recordings: section.recordings,
      reports: section.reports,
      notes: reviewNotes,
      ...tabs,
    }
  }
  const verified = featureVerifySectionProps(view)
  return {
    ...verified,
    reports: [...section.reports.filter(isStepReport), ...verified.reports],
    notes: [...verified.notes, ...reviewNotes],
    ...tabs,
  }
}

/**
 * What a fix pass's section is handed: what a feature's is, led by the note the
 * person sent the work back with, when they wrote one, and naming the fix when
 * nothing was filed for it.
 */
export function signoffFixSectionProps(
  section: SignoffSection,
  view: FeatureVerifyView | undefined,
  fix: Pick<FixSignoff, 'note' | 'codeReview'>,
): SignoffSectionProps {
  const props = {
    emptyLabel: FIX_EMPTY_LABEL,
    ...signoffSectionProps(section, view, fix.codeReview),
  }
  if (!fix.note) return props
  return {
    ...props,
    notes: [{ label: FIX_NOTE_LABEL, reason: fix.note, tone: 'review' }, ...props.notes],
  }
}

/**
 * The verify attempt each section is read on, opened over the filings — every
 * fix pass under its `sectionId`, then every feature under its id — with pair
 * keys namespaced by section so they stay unique across the one overlay.
 */
export function signoffVerifyViews(
  signoff: Pick<StorySignoff, 'features' | 'fixes'>,
  tiles: readonly EvidenceTile[],
  evidence: EvidenceLoadState,
): Map<string, FeatureVerifyView> {
  const views = new Map<string, FeatureVerifyView>()
  const sections = [
    ...signoff.fixes.map((f) => ({ id: f.sectionId, verify: f.verify })),
    ...signoff.features.map((f) => ({ id: f.featureId, verify: f.verify })),
  ]
  for (const { id, verify } of sections) {
    if (verify) views.set(id, featureVerifyView(verify, tiles, { keyPrefix: `${id}::`, evidence }))
  }
  return views
}
