/**
 * What a verify attempt proved, derived once for both clients.
 *
 * The verify gate records its own judgement on the ledger entry — which pairs
 * counted, why the others did not, the new screens and recordings the approval
 * covered, and whether the change was seen on live or faked data. Every surface
 * that shows a verification renders THAT, never a regrouping of whatever was
 * filed: a sign-off that re-paired every capture of a story by subject showed 48
 * tiles, none of them the pair the pass rested on. Pure: no React, no I/O.
 */

import type {
  ProcessLedgerEntry,
  ProcessProofPair,
  ProcessResumeChoice,
  ProcessStepOutcome,
  ProcessVerifyProof,
} from 'thefactory-tools/types'
import { processVerifyReview } from 'thefactory-tools/utils'

import type { ReviewEvidenceRef } from '../api/generated'
import {
  formatProcessCost,
  formatProcessDuration,
  verifyReviewStatus,
  type VerifyReviewStatus,
} from './processView'
import {
  evidenceFiledWithin,
  groupEvidence,
  REVIEWER_VERDICT_LABEL,
  reviewerVerdict,
  screenPairs,
  type EvidenceTile,
  type ScreenPair,
} from './reviewEvidenceView'
import type { RunReviewFacts } from './runReviewTypes'
import {
  ACCEPTED_BY_YOU,
  APPROVED_UNCONFIRMED,
  ATTEMPT_EMPTY,
  ATTEMPT_RUNNING_EMPTY,
  CAPTURE_LOAD_FAILED,
  CAPTURE_LOADING,
  CAPTURE_MISSING,
  DRY_FAKED_LABEL,
  DRY_FAKED_MISSING,
  DRY_TODO,
  GATE_OUTCOME_SAID,
  NEW_SCREEN_ENTRY_NOTE,
  NEW_SCREEN_NOTE,
  NEW_SCREEN_PAIR_CHANGE,
  NEW_SCREEN_TITLE,
  NO_PAIR_FILED,
  NO_PAIR_SHOWS_CHANGE,
  NOTHING_JUDGED,
  PAIR_COUNTED_VERDICT,
  PAIR_IDENTICAL,
  PAIR_NOT_COUNTED_VERDICT,
  PAIR_UNMEASURED,
  PASSED_WITHOUT_PAIR,
  PROOF_MODE_CHIP,
  PROOF_MODE_DETAIL,
  PROOF_MODE_TITLE,
  PROOF_MODE_TONE,
} from './verifyProofConstants'
import type {
  CaptureBuildCaption,
  EvidenceLoadState,
  FeatureVerifySectionProps,
  FeatureVerifyView,
  ProofPairView,
  ProofScreenView,
  ProofUnpairedView,
  StoryProofNotice,
  StoryProofSection,
  VerifyAttempt,
  VerifyAttemptEvidence,
  VerifyAttemptRun,
  VerifyAttemptSelection,
  VerifyAttemptStanding,
  VerifyAttemptView,
  VerifyProofHeader,
  VerifyProofMode,
  VerifyProofSummary,
  VerifyProofTone,
  VerifyProofView,
  VerifyReviewerVerdict,
  VerifySectionProps,
  VerifyVerdictNote,
} from './verifyProofTypes'

/** A commit as a person reads it — the first eight characters. */
export function shortSha(sha: string): string {
  return sha.slice(0, 8)
}

function groupThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function screenShare(changed: number, total: number): string {
  const pct = (changed / total) * 100
  if (pct < 0.1) return '<0.1%'
  if (pct < 10) return `${pct.toFixed(1)}%`
  return `${Math.round(pct)}%`
}

/** A pair's measured difference in words. A tiny change is never rounded down to nothing. */
export function pixelChangeLabel(
  changedPixels: number | undefined,
  totalPixels: number | undefined,
): string {
  if (changedPixels === undefined) return PAIR_UNMEASURED
  if (changedPixels === 0) return PAIR_IDENTICAL
  const changed = `${groupThousands(changedPixels)} px changed`
  return totalPixels ? `${changed} (${screenShare(changedPixels, totalPixels)})` : changed
}

function sameScreenLabel(share: number | undefined): string | undefined {
  return share === undefined
    ? undefined
    : `${Math.round(share * 100)}% of on-screen elements shared`
}

const trimmed = (text: string | undefined): string | undefined => {
  const t = text?.trim()
  return t ? t : undefined
}

const ACCEPTING_CHOICES: readonly ProcessResumeChoice[] = ['continue', 'approve']

type GatedEntry = Pick<ProcessLedgerEntry, 'status' | 'outcome' | 'override' | 'proof'>

/** What the gate itself concluded — its proof's own word first, since the ledger moves on past it. */
function gateOutcome(
  entry: Pick<ProcessLedgerEntry, 'outcome' | 'proof'>,
): ProcessStepOutcome | undefined {
  return entry.proof?.outcome ?? entry.outcome
}

/**
 * Where a verify attempt stands. A person who answered its park with continue
 * or approve accepted it over the gate — the driver records that as an override
 * and moves on as passed while the gate's own word stays unchecked or failed,
 * so the gate's outcome is read from its proof and the override before either.
 */
export function verifyAttemptStanding(entry: GatedEntry): VerifyAttemptStanding {
  if (entry.status === 'running') return 'running'
  const outcome = gateOutcome(entry)
  if (outcome === 'passed') return 'passed'
  if (entry.override && ACCEPTING_CHOICES.includes(entry.override.choice)) return 'accepted'
  if (outcome === 'failed' || outcome === 'errored') return 'failed'
  return 'unchecked'
}

const stands = (standing: VerifyAttemptStanding): boolean =>
  standing === 'passed' || standing === 'accepted'

/** A verify attempt's headline — the gate's, unless a person accepted the attempt over it. */
export function verifyAttemptStatus(entry: GatedEntry): VerifyReviewStatus {
  return verifyAttemptStanding(entry) === 'accepted'
    ? { tone: 'review', label: ACCEPTED_BY_YOU }
    : verifyReviewStatus({ status: entry.status, outcome: gateOutcome(entry) })
}

function gateSaid(entry: Pick<ProcessLedgerEntry, 'outcome' | 'proof'>): string {
  return GATE_OUTCOME_SAID[gateOutcome(entry) ?? 'skipped']
}

/** The gate's one line on an attempt — the pipeline's summary, or its proof's own. */
function gateSummary(entry: Pick<ProcessLedgerEntry, 'summary' | 'proof'>): string | undefined {
  return trimmed(entry.summary) ?? trimmed(entry.proof?.reason)
}

/**
 * What the gate said about an attempt, in its own words. Over an attempt a
 * person accepted it also says what the gate concluded, because the headline
 * then carries the person's decision and not the gate's.
 */
export function verifyGateLine(
  entry: GatedEntry & Pick<ProcessLedgerEntry, 'summary'>,
): string | undefined {
  const summary = gateSummary(entry)
  if (verifyAttemptStanding(entry) !== 'accepted') return summary
  return summary ? `${gateSaid(entry)}: ${summary}` : `${gateSaid(entry)}.`
}

/** One attempt's own time and cost, in the pipeline's words — never a CLI record's guess. */
export function verifyAttemptFacts(
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt' | 'cost'>,
): RunReviewFacts {
  return {
    durationLabel:
      entry.endedAt === undefined
        ? undefined
        : formatProcessDuration(entry.endedAt - entry.startedAt),
    costLabel: formatProcessCost(entry.cost),
  }
}

/**
 * Where an evidence listing is. A failed re-pull over an earlier load still
 * reads as failed: the captures filed since are absent because the listing
 * could not be read, not because they were never filed.
 */
export function evidenceLoadState(listing: {
  loaded: boolean
  error: string | undefined
}): EvidenceLoadState {
  if (listing.error !== undefined) return 'failed'
  return listing.loaded ? 'loaded' : 'loading'
}

const ABSENT_CAPTURE: Record<EvidenceLoadState, string> = {
  loading: CAPTURE_LOADING,
  failed: CAPTURE_LOAD_FAILED,
  loaded: CAPTURE_MISSING,
}

/** What data the attempt ran on and against which builds — the banner over its proof. */
export function verifyProofHeader(
  proof: Pick<ProcessVerifyProof, 'mode' | 'dryAssumptions' | 'baseSha' | 'headSha' | 'seams'>,
  standing: VerifyAttemptStanding,
): VerifyProofHeader {
  const mode: VerifyProofMode = proof.mode ?? 'unknown'
  const dryAssumptions = mode === 'dry' ? trimmed(proof.dryAssumptions) : undefined
  const unstated = mode === 'unknown' && stands(standing)
  return {
    mode,
    tone: PROOF_MODE_TONE[mode],
    title: standing === 'passed' ? PROOF_MODE_TITLE[mode].passed : PROOF_MODE_TITLE[mode].other,
    detail: PROOF_MODE_DETAIL[mode],
    chip: mode !== 'unknown' || unstated ? PROOF_MODE_CHIP[mode] : undefined,
    unstated,
    dryAssumptions,
    faked:
      mode === 'dry'
        ? { label: DRY_FAKED_LABEL, text: dryAssumptions ?? DRY_FAKED_MISSING }
        : undefined,
    todo: mode === 'dry' && stands(standing) ? DRY_TODO : undefined,
    baseSha: proof.baseSha ? shortSha(proof.baseSha) : undefined,
    headSha: proof.headSha ? shortSha(proof.headSha) : undefined,
    seams: (proof.seams ?? []).map(shortSha),
  }
}

function tileIndex(tiles: readonly EvidenceTile[]): Map<string, EvidenceTile> {
  return new Map(tiles.map((t) => [t.ref.id, t]))
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function summaryTone(restsOnScreens: boolean, standing: VerifyAttemptStanding): VerifyProofTone {
  if (restsOnScreens || standing === 'passed') return 'done'
  return standing === 'failed' ? 'stuck' : 'empty'
}

function proofSummary(
  counted: number,
  notCounted: number,
  newScreens: number,
  standing: VerifyAttemptStanding,
  judged: boolean,
): VerifyProofSummary {
  const restsOnScreens = counted > 0 || newScreens > 0
  if (!judged) return { tone: summaryTone(false, standing), text: NOTHING_JUDGED }
  const parts: string[] = []
  if (!restsOnScreens && standing === 'passed') parts.push(PASSED_WITHOUT_PAIR)
  else if (counted + notCounted === 0) parts.push(NO_PAIR_FILED)
  else if (counted === 0) parts.push(NO_PAIR_SHOWS_CHANGE)
  else parts.push(`${plural(counted, 'pair shows', 'pairs show')} the change`)
  if (notCounted > 0) parts.push(`${notCounted} did not count`)
  if (newScreens > 0)
    parts.push(`${plural(newScreens, 'new screen', 'new screens')} the change adds`)
  return { tone: summaryTone(restsOnScreens, standing), text: parts.join(' · ') }
}

function pairView(
  pair: ProcessProofPair,
  byId: Map<string, EvidenceTile>,
  key: string,
  index: number,
  evidence: EvidenceLoadState,
): ProofPairView {
  const before = byId.get(pair.beforeId)
  const after = byId.get(pair.afterId)
  const missing: ProofPairView['missing'] = []
  if (evidence === 'loaded') {
    if (!before) missing.push('before')
    if (!after) missing.push('after')
  }
  const newScreen = pair.newScreen === true
  return {
    key,
    index,
    subject: pair.subject,
    counted: pair.counted,
    newScreen,
    beforeId: pair.beforeId,
    afterId: pair.afterId,
    before,
    after,
    beforeAbsent: before ? undefined : ABSENT_CAPTURE[evidence],
    afterAbsent: after ? undefined : ABSENT_CAPTURE[evidence],
    change: newScreen
      ? NEW_SCREEN_PAIR_CHANGE
      : pixelChangeLabel(pair.changedPixels, pair.totalPixels),
    sameScreen: newScreen ? undefined : sameScreenLabel(pair.sameScreen),
    verdict: pair.counted
      ? PAIR_COUNTED_VERDICT
      : (trimmed(pair.reason) ?? PAIR_NOT_COUNTED_VERDICT),
    missing,
  }
}

function pairScreen(p: ProofPairView, shas: Partial<ScreenPair>): ScreenPair {
  return {
    key: p.key,
    index: p.index,
    title: p.subject,
    class: 'pair',
    ...(p.before ? { before: p.before } : {}),
    ...(p.after ? { after: p.after } : {}),
    note: `${p.verdict} · ${p.change}`,
    ...shas,
  }
}

/**
 * The gate's judgement as it renders: counted pairs first (what the pass rested
 * on), then the screens the change adds — each beside the entry point on the
 * base it opens from, when the gate recorded one — then the pairs and lone
 * afters that did not count, with the gate's reason — numbered in that order,
 * so the overlay pages the way the page reads. Captures are found by id among
 * `tiles` — a before is often shared from another attempt's run, so the tiles
 * must be the story's, not the run's.
 */
export function verifyProofView(
  proof: ProcessVerifyProof,
  tiles: readonly EvidenceTile[],
  opts: { standing?: VerifyAttemptStanding; keyPrefix?: string; evidence?: EvidenceLoadState } = {},
): VerifyProofView {
  const { standing = 'unchecked', keyPrefix = '', evidence = 'loaded' } = opts
  const byId = tileIndex(tiles)
  const absent = (tile: EvidenceTile | undefined) => (tile ? undefined : ABSENT_CAPTURE[evidence])
  const pairKey = (p: ProcessProofPair) => `${keyPrefix}pair:${p.beforeId}>${p.afterId}`
  const newScreenIds = new Set(proof.newScreenIds)
  const entryPairOf = new Map(
    proof.pairs
      .filter((p) => p.counted && p.newScreen && newScreenIds.has(p.afterId))
      .map((p) => [p.afterId, p]),
  )
  const counted = proof.pairs
    .filter((p) => p.counted && entryPairOf.get(p.afterId) !== p)
    .map((p, i) => pairView(p, byId, pairKey(p), i + 1, evidence))
  const newScreens: ProofScreenView[] = proof.newScreenIds.map((id, i) => {
    const tile = byId.get(id)
    const entryPair = entryPairOf.get(id)
    const entryPoint = entryPair ? byId.get(entryPair.beforeId) : undefined
    return {
      key: `${keyPrefix}new:${id}`,
      index: counted.length + i + 1,
      id,
      title: tile?.ref.subject ?? entryPair?.subject ?? NEW_SCREEN_TITLE,
      tile,
      absent: absent(tile),
      entryPoint,
      entryPointAbsent: entryPair ? absent(entryPoint) : undefined,
    }
  })
  const firstUncounted = counted.length + newScreens.length + 1
  const uncounted = proof.pairs
    .filter((p) => !p.counted)
    .map((p, i) => pairView(p, byId, pairKey(p), firstUncounted + i, evidence))
  const firstUnpaired = firstUncounted + uncounted.length
  const unpaired: ProofUnpairedView[] = (proof.unpaired ?? []).map((u, i) => {
    const after = byId.get(u.afterId)
    return {
      key: `${keyPrefix}unpaired:${u.afterId}`,
      index: firstUnpaired + i,
      subject: u.subject,
      afterId: u.afterId,
      after,
      afterAbsent: absent(after),
      reason: trimmed(u.reason) ?? PAIR_NOT_COUNTED_VERDICT,
    }
  })
  const judged = proof.judged !== false
  const restsOnScreens = counted.length > 0 || newScreens.length > 0
  const header =
    !judged || (standing === 'passed' && !restsOnScreens && proof.mode === undefined)
      ? undefined
      : verifyProofHeader(proof, standing)
  const shas: Partial<ScreenPair> = {
    ...(header?.baseSha ? { expectedBaseSha: header.baseSha } : {}),
    ...(header?.headSha ? { expectedHeadSha: header.headSha } : {}),
  }
  const screens: ScreenPair[] = [
    ...counted.map((p) => pairScreen(p, shas)),
    ...newScreens.map(
      (s): ScreenPair => ({
        key: s.key,
        index: s.index,
        title: s.title,
        class: 'new',
        ...(s.entryPoint ? { before: s.entryPoint } : {}),
        ...(s.tile ? { after: s.tile } : {}),
        note: entryPairOf.has(s.id) ? NEW_SCREEN_ENTRY_NOTE : NEW_SCREEN_NOTE,
        ...shas,
      }),
    ),
    ...uncounted.map((p) => pairScreen(p, shas)),
    ...unpaired.map(
      (u): ScreenPair => ({
        key: u.key,
        index: u.index,
        title: u.subject,
        class: 'new',
        ...(u.after ? { after: u.after } : {}),
        note: u.reason,
        ...shas,
      }),
    ),
  ]
  return {
    header,
    pairs: [...counted, ...uncounted],
    countedCount: counted.length,
    newScreens,
    unpaired,
    restsOnScreens,
    recordings: proof.recordingIds
      .map((id) => byId.get(id))
      .filter((t): t is EvidenceTile => t !== undefined),
    summary: proofSummary(
      counted.length,
      uncounted.length + unpaired.length,
      newScreens.length,
      standing,
      judged,
    ),
    screens,
  }
}

function verifyStepIds(run: VerifyAttemptRun): Set<string> {
  return new Set(
    (run.plan?.steps ?? [])
      .filter((s) => s.kind === 'agent' && s.agentType === 'verifier')
      .map((s) => s.id),
  )
}

/** A run's verify attempts in ledger order, each with where its reviewer filed. */
export function verifyAttempts(run: VerifyAttemptRun): VerifyAttempt[] {
  const steps = verifyStepIds(run)
  const entries = run.ledger.filter((e) => steps.has(e.stepId))
  return entries.map((entry, i) => ({
    entry,
    attempt: i + 1,
    total: entries.length,
    review: processVerifyReview(run, entry),
  }))
}

/** The newest attempt that stands — passed, or accepted by a person — else the newest at all. */
function acceptedOf(newestFirst: readonly VerifyAttempt[]): VerifyAttempt | undefined {
  return newestFirst.find((a) => stands(verifyAttemptStanding(a.entry))) ?? newestFirst[0]
}

/**
 * The verify attempt a run was accepted on: the latest that PASSED or that a
 * person accepted over the gate, or — when none did — the latest at all, so a
 * failure still shows what failed and why.
 */
export function acceptedVerifyAttempt(run: VerifyAttemptRun): VerifyAttemptSelection | undefined {
  const newestFirst = [...verifyAttempts(run)].reverse()
  const accepted = acceptedOf(newestFirst)
  return accepted ? { accepted, others: newestFirst.filter((a) => a !== accepted) } : undefined
}

/**
 * A feature's verify attempts across every child run of it, and the one it was
 * accepted on. The accepted attempt comes from the run whose verification is
 * newest — a relaunch supersedes the last — but the attempts before a relaunch
 * are still listed, numbered by when they started, so none vanishes.
 */
export function featureVerifySelection(
  runs: readonly VerifyAttemptRun[],
  featureId: string,
): VerifyAttemptSelection | undefined {
  const perRun = runs
    .filter((run) => run.featureId === featureId)
    .map(verifyAttempts)
    .filter((attempts) => attempts.length > 0)
  const lastStart = (attempts: VerifyAttempt[]) => attempts[attempts.length - 1].entry.startedAt
  const newestRun = perRun.reduce<VerifyAttempt[]>(
    (newest, run) => (newest.length === 0 || lastStart(run) > lastStart(newest) ? run : newest),
    [],
  )
  const picked = acceptedOf([...newestRun].reverse())
  if (!picked) return undefined
  const chronological = perRun.flat().sort((a, b) => a.entry.startedAt - b.entry.startedAt)
  const renumbered = (a: VerifyAttempt): VerifyAttempt => ({
    ...a,
    attempt: chronological.indexOf(a) + 1,
    total: chronological.length,
  })
  return {
    accepted: renumbered(picked),
    others: chronological
      .filter((a) => a !== picked)
      .reverse()
      .map(renumbered),
  }
}

function filedBy(
  attempt: Pick<VerifyAttempt, 'review'>,
  tiles: readonly EvidenceTile[],
): EvidenceTile[] {
  const review = attempt.review
  if (!review) return []
  return evidenceFiledWithin(
    tiles.filter((t) => t.ref.runId === review.reviewedRunId),
    {
      since: review.filedSince,
      ...(review.filedUntil !== undefined ? { until: review.filedUntil } : {}),
    },
  )
}

/**
 * Everything one verify attempt shows. With the gate's proof on the entry, the
 * screens are exactly its pairs and new screens, and a recording its reviewer
 * filed but the gate did not cover is kept apart; an entry from before the gate
 * recorded one falls back to what the reviewer filed in the attempt's window.
 * The report and verdict are always the attempt's own.
 */
export function verifyAttemptEvidence(
  attempt: Pick<VerifyAttempt, 'entry' | 'review'>,
  tiles: readonly EvidenceTile[],
  opts: { keyPrefix?: string; evidence?: EvidenceLoadState } = {},
): VerifyAttemptEvidence {
  const { keyPrefix = '', evidence = 'loaded' } = opts
  const filed = filedBy(attempt, tiles)
  const filedRecordings = filed.filter((t) => t.ref.kind === 'recording')
  const reports = filed.filter((t) => t.ref.kind === 'report')
  const verdict = reviewerVerdict(filed.map((t) => t.ref))
  const entryProof = attempt.entry.proof
  if (!entryProof) {
    return {
      proof: undefined,
      pairs: screenPairs(groupEvidence(filed)).map((p) => ({ ...p, key: `${keyPrefix}${p.key}` })),
      recordings: filedRecordings,
      uncountedRecordings: [],
      reports,
      verdict,
    }
  }
  const proof = verifyProofView(entryProof, tiles, {
    standing: verifyAttemptStanding(attempt.entry),
    keyPrefix,
    evidence,
  })
  const covered = new Set(entryProof.recordingIds)
  return {
    proof,
    pairs: proof.screens,
    recordings: proof.recordings,
    uncountedRecordings: filedRecordings.filter((t) => !covered.has(t.ref.id)),
    reports,
    verdict,
  }
}

/** The reviewer's conclusion as a sign-off note: an approval reads as done, anything else as stuck. */
export function reviewerVerdictNote(verdict: VerifyReviewerVerdict): VerifyVerdictNote {
  return {
    label: `Reviewer · ${REVIEWER_VERDICT_LABEL[verdict.verdict]}`,
    ...(verdict.reason ? { reason: verdict.reason } : {}),
    tone: verdict.verdict === 'approved' ? 'done' : 'stuck',
  }
}

/**
 * What the gate gave for an attempt: its one line, or — when it gave several
 * reasons — each on its own, since the line is only those reasons run together.
 */
function gateReasons(entry: ProcessLedgerEntry): Pick<VerifyVerdictNote, 'reason' | 'details'> {
  const line = gateSummary(entry)
  const details = [
    ...new Set(
      (entry.proof?.reasons ?? []).flatMap((r) => {
        const t = trimmed(r)
        return t && t !== line ? [t] : []
      }),
    ),
  ]
  if (details.length > 0) return { details }
  return line ? { reason: line } : {}
}

/**
 * The gate's own conclusion as a note. A pass that rests on screens has none:
 * the screens are its basis, and the note would only repeat them. Over an
 * attempt a person accepted it still says what the gate concluded, toned by it.
 * An approval the gate could not confirm says so in those words — it is the
 * case a person is asked to decide, so it must not read as the gate's "no".
 */
function gateNote(
  entry: ProcessLedgerEntry,
  standing: VerifyAttemptStanding,
  evidence: VerifyAttemptEvidence,
): VerifyVerdictNote | undefined {
  const outcome = gateOutcome(entry)
  const approvedUnconfirmed = outcome === 'unchecked' && evidence.verdict?.verdict === 'approved'
  const note = (tone: VerifyVerdictNote['tone']): VerifyVerdictNote => ({
    label: approvedUnconfirmed ? APPROVED_UNCONFIRMED : gateSaid(entry),
    ...gateReasons(entry),
    tone,
  })
  switch (standing) {
    case 'running':
      return undefined
    case 'passed':
      return evidence.proof?.restsOnScreens ? undefined : note('done')
    case 'accepted':
      return note(outcome === 'failed' || outcome === 'errored' ? 'stuck' : 'review')
    case 'unchecked':
      return note('review')
    case 'failed':
      return note('stuck')
  }
}

function acceptanceNote(entry: ProcessLedgerEntry): VerifyVerdictNote {
  const note = trimmed(entry.override?.note)
  return {
    label: ACCEPTED_BY_YOU,
    ...(note ? { reason: `Your note: ${note}` } : {}),
    tone: 'review',
  }
}

function verifyAttemptNotes(
  entry: ProcessLedgerEntry,
  evidence: VerifyAttemptEvidence,
): VerifyVerdictNote[] {
  const standing = verifyAttemptStanding(entry)
  const reviewer = evidence.verdict ? reviewerVerdictNote(evidence.verdict) : undefined
  const gate = gateNote(entry, standing, evidence)
  const gateShown =
    gate && reviewer?.reason !== undefined && gate.reason === reviewer.reason
      ? { label: gate.label, tone: gate.tone }
      : gate
  return [standing === 'accepted' ? acceptanceNote(entry) : undefined, gateShown, reviewer].filter(
    (n): n is VerifyVerdictNote => n !== undefined,
  )
}

function attemptView(
  attempt: VerifyAttempt,
  tiles: readonly EvidenceTile[],
  keyPrefix: string,
  evidence: EvidenceLoadState,
): VerifyAttemptView {
  const key = `${keyPrefix}${attempt.entry.id}::`
  const attemptEvidence = verifyAttemptEvidence(attempt, tiles, { keyPrefix: key, evidence })
  return {
    key,
    title: `Attempt ${attempt.attempt} of ${attempt.total}`,
    entry: attempt.entry,
    standing: verifyAttemptStanding(attempt.entry),
    status: verifyAttemptStatus(attempt.entry),
    running: attempt.entry.status === 'running',
    notes: verifyAttemptNotes(attempt.entry, attemptEvidence),
    evidence: attemptEvidence,
  }
}

const lowerFirst = (text: string): string => `${text.charAt(0).toLowerCase()}${text.slice(1)}`

function acceptedLabel(accepted: VerifyAttempt, others: readonly VerifyAttempt[]): string {
  const which = `Verify attempt ${accepted.attempt} of ${accepted.total}`
  const said = lowerFirst(gateSaid(accepted.entry))
  switch (verifyAttemptStanding(accepted.entry)) {
    case 'passed':
      return `${which} — the one the gate passed`
    case 'accepted':
      return `${which} — accepted by you; ${said}`
    case 'running':
      return `${which} — still running`
    case 'unchecked':
      return `${which} — the latest; ${said}`
    case 'failed':
      return others.some((o) => stands(verifyAttemptStanding(o.entry)))
        ? `${which} — the latest; it did not pass`
        : `${which} — the latest; none passed`
  }
}

/** A feature's verification for the sign-off: the accepted attempt up front, the others folded. */
export function featureVerifyView(
  selection: VerifyAttemptSelection,
  tiles: readonly EvidenceTile[],
  opts: { keyPrefix?: string; evidence?: EvidenceLoadState } = {},
): FeatureVerifyView {
  const { keyPrefix = '', evidence = 'loaded' } = opts
  const { accepted, others } = selection
  const allEarlier = others.every((o) => o.attempt < accepted.attempt)
  const view = attemptView(accepted, tiles, keyPrefix, evidence)
  const header = view.evidence.proof?.header
  return {
    accepted: view,
    acceptedLabel: acceptedLabel(accepted, others),
    standing: view.standing,
    mode: header?.mode ?? 'unknown',
    dataUnstated: view.evidence.proof ? (header?.unstated ?? false) : stands(view.standing),
    others: others.map((o) => attemptView(o, tiles, keyPrefix, evidence)),
    othersLabel:
      others.length === 0
        ? undefined
        : `${allEarlier ? 'Earlier' : 'Other'} attempts (${others.length})`,
  }
}

function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The story-wide line naming what the gate did not vouch for: the features a
 * person accepted without the gate passing them, those that passed dry, and
 * those whose reviewer never said what data they ran on. An attempt that did
 * not stand verified nothing, so its data is not the point and it is left out.
 */
export function storyProofNotice(
  sections: readonly StoryProofSection[],
): StoryProofNotice | undefined {
  const standing = sections.filter((s) => stands(s.standing))
  const accepted = standing.filter((s) => s.standing === 'accepted').map((s) => s.label)
  const dry = standing.filter((s) => s.mode === 'dry').map((s) => s.label)
  const unstated = standing.filter((s) => s.dataUnstated).map((s) => s.label)
  const parts: string[] = []
  if (accepted.length > 0) {
    const one = accepted.length === 1
    parts.push(
      `${listNames(accepted)} ${one ? 'was' : 'were'} accepted by you without the gate passing ${one ? 'it' : 'them'} — open ${one ? 'it' : 'each'} to see what the gate said.`,
    )
  }
  if (dry.length > 0) {
    parts.push(
      `${listNames(dry)} ${dry.length === 1 ? 'was' : 'were'} verified dry — not against the live backend.`,
      `Open ${dry.length === 1 ? 'it' : 'each'} to see what the live backend must send.`,
    )
  }
  if (unstated.length > 0) {
    parts.push(`The reviewer did not say whether ${listNames(unstated)} ran on live data.`)
  }
  if (parts.length === 0) return undefined
  return { tone: accepted.length + dry.length > 0 ? 'working' : 'empty', text: parts.join(' ') }
}

function proofEvidenceIds(proof: ProcessVerifyProof): string[] {
  return [
    ...proof.pairs.flatMap((p) => [p.beforeId, p.afterId]),
    ...proof.newScreenIds,
    ...(proof.unpaired ?? []).map((u) => u.afterId),
    ...proof.recordingIds,
  ]
}

/**
 * The proof's captures the loaded evidence does not hold — a before shared from
 * another attempt's run is the usual one. Non-empty means the story's evidence
 * has to be loaded to show the proof whole.
 */
export function missingEvidenceIds(
  proof: ProcessVerifyProof | undefined,
  refs: readonly Pick<ReviewEvidenceRef, 'id'>[],
): string[] {
  if (!proof) return []
  const held = new Set(refs.map((r) => r.id))
  return [...new Set(proofEvidenceIds(proof))].filter((id) => !held.has(id))
}

/** Two evidence listings as one, by id — the primary's copy wins, so its loaded bytes show. */
export function mergeEvidenceTiles(
  primary: readonly EvidenceTile[],
  secondary: readonly EvidenceTile[],
): EvidenceTile[] {
  const seen = new Set(primary.map((t) => t.ref.id))
  return [...primary, ...secondary.filter((t) => !seen.has(t.ref.id))]
}

const NO_PAIRS: ScreenPair[] = []

/**
 * The screens the comparison overlay pages through once one is opened: the
 * group it belongs to — one attempt's proof — so paging never wanders from the
 * accepted proof into another feature or an earlier attempt.
 */
export function overlayPairsFor(
  groups: readonly (readonly ScreenPair[])[],
  openKey: string | undefined,
): readonly ScreenPair[] {
  if (openKey === undefined) return NO_PAIRS
  return groups.find((g) => g.some((p) => p.key === openKey)) ?? NO_PAIRS
}

/**
 * What a sign-off section is handed for one verify attempt — the proof, its
 * filings, and the conclusions over it: a person's acceptance or the gate's
 * own word first, then the reviewer's.
 */
export function verifySectionProps(
  entry: ProcessLedgerEntry,
  evidence: VerifyAttemptEvidence,
): VerifySectionProps {
  return {
    pairs: evidence.pairs,
    recordings: evidence.recordings,
    uncountedRecordings: evidence.uncountedRecordings,
    reports: evidence.reports,
    emptyLabel: entry.status === 'running' ? ATTEMPT_RUNNING_EMPTY : ATTEMPT_EMPTY,
    ...(evidence.proof ? { proof: evidence.proof } : {}),
    notes: verifyAttemptNotes(entry, evidence),
  }
}

/** A feature's section in the story sign-off: the accepted attempt, which one it is, the rest folded. */
export function featureVerifySectionProps(view: FeatureVerifyView): FeatureVerifySectionProps {
  return {
    ...verifySectionProps(view.accepted.entry, view.accepted.evidence),
    attemptLabel: view.acceptedLabel,
    ...(view.othersLabel
      ? { otherAttempts: { label: view.othersLabel, attempts: view.others } }
      : {}),
  }
}

/**
 * One side of a comparison, captioned from its own build record. The expected
 * commit is named only where the record does not already show it — a before
 * rejected for being built from the wrong commit must read as that commit.
 */
export function captureBuildCaption(
  tile: EvidenceTile | undefined,
  expected: string | undefined,
): CaptureBuildCaption {
  if (!tile) return { builtSha: undefined, dirty: false, expectedSha: undefined }
  const build = tile.ref.build
  const builtSha = build ? shortSha(build.sha) : undefined
  const expectedSha = expected ? shortSha(expected) : undefined
  return {
    builtSha,
    dirty: build?.dirty === true,
    expectedSha: expectedSha !== undefined && expectedSha !== builtSha ? expectedSha : undefined,
  }
}
