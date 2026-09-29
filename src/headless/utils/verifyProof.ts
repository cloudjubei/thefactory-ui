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
import { processEntryWorkMs, processVerifyReview } from 'thefactory-tools/utils'

import type { ReviewEvidenceRef } from '../api/generated'
import { formatProcessDuration, verifyReviewStatus, type VerifyReviewStatus } from './processView'
import {
  evidenceFiledWithin,
  groupEvidence,
  isVerifierFiling,
  latestReport,
  pairUnvouched,
  reviewerVerdict,
  screenPairs,
} from './reviewEvidenceView'
import { REVIEWER_VERDICT_LABEL } from './reviewEvidenceViewConstants'
import type { EvidenceTile, EvidenceUnvouched, ScreenPair } from './reviewEvidenceViewTypes'
import { runReviewFacts } from './runReview'
import type { RunReviewFacts } from './runReviewTypes'
import { UNVOUCHED_LABEL } from './reviewEvidenceViewConstants'
import {
  ACCEPTED_BY_YOU,
  APPROVED_UNCONFIRMED,
  ATTEMPT_EMPTY,
  ATTEMPT_RUNNING_EMPTY,
  CAPTURE_LOAD_FAILED,
  CAPTURE_LOADING,
  CAPTURE_MISSING,
  COUNTED_UNVOUCHED_VERDICT,
  DRY_BUILD_ARROW,
  DRY_BUILD_SEAM,
  DRY_FAKED_MISSING,
  DRY_LINE_LEAD,
  DRY_LINE_TEXT,
  DRY_LINE_TOGGLE,
  DRY_ROW_BUILT_FROM,
  DRY_ROW_FAKED,
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
  PROOF_NOT_COUNTED_TAIL,
  PROOF_THUMB_NEW_MARKER,
  PROOF_THUMB_UNDER_ONE,
  REVIEWER_VERDICT_UNVOUCHED_LABEL,
  REVIEWER_VERDICT_UNVOUCHED_REASON,
  VERDICT_NOTE_WHO,
  UNVOUCHED_BASIS_BANNER,
  UNVOUCHED_BASIS_SUMMARY,
} from './verifyProofConstants'
import type {
  CaptureBuildCaption,
  DryBuildPart,
  DryProofRow,
  EvidenceLoadState,
  FeatureVerifySectionProps,
  FeatureVerifyView,
  ProofNotCountedFold,
  ProofPairView,
  ProofScreensPane,
  ProofScreenView,
  ProofThumbnail,
  ProofThumbnailFrame,
  ProofThumbnailSide,
  ProofUnpairedView,
  StoryProofNotice,
  StoryProofSection,
  VerifyAttempt,
  VerifyAttemptEvidence,
  VerifyAttemptRun,
  VerifyAttemptStanding,
  VerifyAttemptView,
  VerifyProofDryLine,
  VerifyProofHeader,
  VerifyProofMode,
  VerifyProofSummary,
  VerifyProofTone,
  VerifyProofUnvouched,
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

/**
 * A thumbnail's corner marker: the changed share of the screen, rounded to a
 * whole percent. A change under one percent reads "<1%" — a proving pair must
 * never look unchanged — and an unmeasured pair is marked with nothing.
 */
export function proofChangeMarker(
  changedPixels: number | undefined,
  totalPixels: number | undefined,
): string | undefined {
  if (changedPixels === undefined || !totalPixels) return undefined
  const pct = (changedPixels / totalPixels) * 100
  if (changedPixels > 0 && pct < 1) return PROOF_THUMB_UNDER_ONE
  return `${Math.round(pct)}%`
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
  entry: Pick<ProcessLedgerEntry, 'startedAt' | 'endedAt' | 'suspendedMs' | 'cost'>,
): RunReviewFacts {
  return {
    ...runReviewFacts({ cost: entry.cost, durationMs: undefined }),
    durationLabel:
      entry.endedAt === undefined
        ? undefined
        : formatProcessDuration(processEntryWorkMs(entry, entry.endedAt)),
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

/**
 * What the banner says when nothing a proof rested on can still be vouched for
 * — `unvouchedBasis` is why, for each of those — or `undefined` while any of it
 * can. The restart wording only when a restart is the one cause.
 */
function proofUnvouched(
  unvouchedBasis: readonly EvidenceUnvouched[],
): VerifyProofUnvouched | undefined {
  if (unvouchedBasis.length === 0) return undefined
  const restart = unvouchedBasis.every((u) => u.cause === 'restart')
  return { chip: UNVOUCHED_LABEL, text: UNVOUCHED_BASIS_BANNER[restart ? 'restart' : 'other'] }
}

/** "Built from": the base, any seams it carried, then the branch the afters came from. */
function dryBuildParts(
  baseSha: string | undefined,
  seams: readonly string[],
  headSha: string | undefined,
): DryBuildPart[] {
  const sha = (value: string): DryBuildPart => ({ kind: 'sha', sha: value })
  const parts: DryBuildPart[] = baseSha ? [sha(baseSha)] : []
  if (seams.length > 0) {
    parts.push(
      { kind: 'word', text: seams.length === 1 ? DRY_BUILD_SEAM.one : DRY_BUILD_SEAM.many },
      ...seams.map(sha),
    )
  }
  if (headSha) {
    if (baseSha) parts.push({ kind: 'word', text: DRY_BUILD_ARROW })
    parts.push(sha(headSha))
  }
  return parts
}

/**
 * A dry attempt as one quiet line — a caveat, not an alarm — with what was
 * faked and the builds it ran against folded into rows. The reviewer's account
 * already says what the live backend must send, so it is shown as written.
 */
function dryLine(
  dryAssumptions: string | undefined,
  standing: VerifyAttemptStanding,
  build: { baseSha: string | undefined; seams: string[]; headSha: string | undefined },
): VerifyProofDryLine {
  const parts = dryBuildParts(build.baseSha, build.seams, build.headSha)
  const rows: DryProofRow[] = [
    { kind: 'text', label: DRY_ROW_FAKED, text: dryAssumptions ?? DRY_FAKED_MISSING },
    ...(parts.length > 0 ? [{ kind: 'build' as const, label: DRY_ROW_BUILT_FROM, parts }] : []),
  ]
  return {
    lead: standing === 'passed' ? DRY_LINE_LEAD.passed : DRY_LINE_LEAD.other,
    text: DRY_LINE_TEXT,
    toggle: DRY_LINE_TOGGLE,
    rows,
  }
}

/**
 * What data the attempt ran on and against which builds — the banner over its
 * proof. `unvouchedBasis` holds, when nothing the proof rested on can still be
 * vouched for, why each of those cannot.
 */
export function verifyProofHeader(
  proof: Pick<ProcessVerifyProof, 'mode' | 'dryAssumptions' | 'baseSha' | 'headSha' | 'seams'>,
  standing: VerifyAttemptStanding,
  unvouchedBasis: readonly EvidenceUnvouched[] = [],
): VerifyProofHeader {
  const mode: VerifyProofMode = proof.mode ?? 'unknown'
  const dryAssumptions = mode === 'dry' ? trimmed(proof.dryAssumptions) : undefined
  const unstated = mode === 'unknown' && stands(standing)
  const baseSha = proof.baseSha ? shortSha(proof.baseSha) : undefined
  const headSha = proof.headSha ? shortSha(proof.headSha) : undefined
  const seams = (proof.seams ?? []).map(shortSha)
  return {
    mode,
    tone: PROOF_MODE_TONE[mode],
    title: standing === 'passed' ? PROOF_MODE_TITLE[mode].passed : PROOF_MODE_TITLE[mode].other,
    detail: PROOF_MODE_DETAIL[mode],
    chip: mode !== 'unknown' || unstated ? PROOF_MODE_CHIP[mode] : undefined,
    unstated,
    dryAssumptions,
    dry:
      mode === 'dry' ? dryLine(dryAssumptions, standing, { baseSha, seams, headSha }) : undefined,
    baseSha,
    headSha,
    seams,
    unvouched: proofUnvouched(unvouchedBasis),
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
  basisUnvouched: boolean,
): VerifyProofSummary {
  const restsOnScreens = counted > 0 || newScreens > 0
  if (!judged) return { tone: summaryTone(false, standing), text: NOTHING_JUDGED }
  const parts: string[] = []
  if (basisUnvouched) parts.push(UNVOUCHED_BASIS_SUMMARY)
  else if (!restsOnScreens && standing === 'passed') parts.push(PASSED_WITHOUT_PAIR)
  else if (counted + notCounted === 0) parts.push(NO_PAIR_FILED)
  else if (counted === 0) parts.push(NO_PAIR_SHOWS_CHANGE)
  else parts.push(`${plural(counted, 'pair shows', 'pairs show')} the change`)
  if (notCounted > 0) parts.push(`${notCounted} did not count`)
  if (newScreens > 0)
    parts.push(`${plural(newScreens, 'new screen', 'new screens')} the change adds`)
  return {
    tone: basisUnvouched ? 'empty' : summaryTone(restsOnScreens, standing),
    text: parts.join(' · '),
  }
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
  const unvouched = pairUnvouched({ before, after })
  const shows = pair.counted && !unvouched
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
    counted: shows,
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
    verdict: shows
      ? PAIR_COUNTED_VERDICT
      : pair.counted
        ? COUNTED_UNVOUCHED_VERDICT
        : (trimmed(pair.reason) ?? PAIR_NOT_COUNTED_VERDICT),
    unvouched,
    marker: newScreen
      ? PROOF_THUMB_NEW_MARKER
      : proofChangeMarker(pair.changedPixels, pair.totalPixels),
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
    note: [p.verdict, p.change, p.sameScreen].filter((t) => t !== undefined).join(' · '),
    ...(p.unvouched ? { unvouched: p.unvouched } : {}),
    ...shas,
  }
}

/**
 * The gate's judgement as it renders: counted pairs first (what the pass rested
 * on), then the screens the change adds — each beside the entry point on the
 * base it opens from, when the gate recorded one — then the pairs and lone
 * afters that did not count, with the reason — numbered in that order, so the
 * overlay pages the way the page reads. Captures are found by id among `tiles`
 * — a before is often shared from another attempt's run, so the tiles must be
 * the story's, not the run's.
 *
 * A pair or new screen the gate counted but a side of which the backend can no
 * longer vouch for — after a restart, every one filed before it — leads what
 * did not count, saying the gate counted it then. It is never shown as showing
 * the change: nothing now says which build or device it is.
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
  const unvouchedOf = (p: Pick<ProcessProofPair, 'beforeId' | 'afterId'>) =>
    pairUnvouched({ before: byId.get(p.beforeId), after: byId.get(p.afterId) })
  const newScreenUnvouched = (id: string) => {
    const entryPair = entryPairOf.get(id)
    return entryPair ? unvouchedOf(entryPair) : byId.get(id)?.unvouched
  }
  const gateCounted = proof.pairs.filter((p) => p.counted && entryPairOf.get(p.afterId) !== p)
  const counted = gateCounted
    .filter((p) => !unvouchedOf(p))
    .map((p, i) => pairView(p, byId, pairKey(p), i + 1, evidence))
  const newScreens: ProofScreenView[] = proof.newScreenIds
    .filter((id) => !newScreenUnvouched(id))
    .map((id, i) => {
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
  const lostPairs = proof.pairs.filter((p) => p.counted && unvouchedOf(p))
  const lostScreens = proof.newScreenIds.filter(
    (id) => !entryPairOf.has(id) && byId.get(id)?.unvouched,
  )
  const firstUncounted = counted.length + newScreens.length + 1
  const uncounted = [...lostPairs, ...proof.pairs.filter((p) => !p.counted)].map((p, i) =>
    pairView(p, byId, pairKey(p), firstUncounted + i, evidence),
  )
  const firstUnpaired = firstUncounted + uncounted.length
  const unpaired: ProofUnpairedView[] = [
    ...lostScreens.map((id) => ({
      key: `${keyPrefix}new:${id}`,
      subject: byId.get(id)?.ref.subject ?? NEW_SCREEN_TITLE,
      afterId: id,
      reason: COUNTED_UNVOUCHED_VERDICT,
    })),
    ...(proof.unpaired ?? []).map((u) => ({
      key: `${keyPrefix}unpaired:${u.afterId}`,
      subject: u.subject,
      afterId: u.afterId,
      reason: trimmed(u.reason) ?? PAIR_NOT_COUNTED_VERDICT,
    })),
  ].map((u, i) => {
    const after = byId.get(u.afterId)
    return {
      ...u,
      index: firstUnpaired + i,
      after,
      afterAbsent: absent(after),
      unvouched: after?.unvouched,
    }
  })
  const judged = proof.judged !== false
  const restsOnScreens = gateCounted.length > 0 || proof.newScreenIds.length > 0
  const basisUnvouched = restsOnScreens && counted.length === 0 && newScreens.length === 0
  const unvouchedBasis = basisUnvouched
    ? [...lostPairs.map(unvouchedOf), ...lostScreens.map((id) => byId.get(id)?.unvouched)].filter(
        (u): u is EvidenceUnvouched => u !== undefined,
      )
    : []
  const header =
    !judged || (standing === 'passed' && !restsOnScreens && proof.mode === undefined)
      ? undefined
      : verifyProofHeader(proof, standing, unvouchedBasis)
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
        ...(u.unvouched ? { unvouched: u.unvouched } : {}),
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
      unvouchedBasis.length > 0,
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

/**
 * The verify attempt a run was accepted on: the latest that PASSED or that a
 * person accepted over the gate, or — when none did — the latest at all, so a
 * failure still shows what failed and why. Its number is its place among that
 * run's attempts only: an earlier run's attempts are that run's history, read
 * where a person drills into it.
 */
export function acceptedVerifyAttempt(run: VerifyAttemptRun): VerifyAttempt | undefined {
  const newestFirst = [...verifyAttempts(run)].reverse()
  return newestFirst.find((a) => stands(verifyAttemptStanding(a.entry))) ?? newestFirst[0]
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
  const reports = filed.filter((t) => t.ref.kind === 'report' && isVerifierFiling(t.ref))
  const reading = reviewerVerdict(filed.map((t) => t.ref))
  const verdict = reading.state === 'concluded' ? reading.verdict : undefined
  const verdictUnvouched = reading.state === 'unvouched'
  const entryProof = attempt.entry.proof
  if (!entryProof) {
    return {
      proof: undefined,
      pairs: screenPairs(groupEvidence(filed)).map((p) => ({ ...p, key: `${keyPrefix}${p.key}` })),
      recordings: filedRecordings,
      uncountedRecordings: [],
      reports,
      verdict,
      verdictUnvouched,
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
    verdictUnvouched,
  }
}

function verdictNote(who: string, verdict: VerifyReviewerVerdict): VerifyVerdictNote {
  return {
    label: `${who} · ${REVIEWER_VERDICT_LABEL[verdict.verdict]}`,
    ...(verdict.reason ? { reason: verdict.reason } : {}),
    tone: verdict.verdict === 'approved' ? 'done' : 'stuck',
  }
}

/** The reviewer's conclusion as a sign-off note: an approval reads as done, anything else as stuck. */
export function reviewerVerdictNote(verdict: VerifyReviewerVerdict): VerifyVerdictNote {
  return verdictNote(VERDICT_NOTE_WHO.reviewer, verdict)
}

/** The code review's verdict, said the way the reviewer's is. */
export function codeReviewVerdictNote(verdict: VerifyReviewerVerdict): VerifyVerdictNote {
  return verdictNote(VERDICT_NOTE_WHO.codeReview, verdict)
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

/**
 * Said where the reviewer's verdict would be when the filings it rode on cannot
 * be vouched for — the backend drops such a verdict, and a missing one would
 * otherwise read as a reviewer who never concluded anything.
 */
const REVIEWER_VERDICT_UNVOUCHED_NOTE: VerifyVerdictNote = {
  label: REVIEWER_VERDICT_UNVOUCHED_LABEL,
  reason: REVIEWER_VERDICT_UNVOUCHED_REASON,
  tone: 'review',
}

function reviewerNote(evidence: VerifyAttemptEvidence): VerifyVerdictNote | undefined {
  if (evidence.verdict) return reviewerVerdictNote(evidence.verdict)
  return evidence.verdictUnvouched ? REVIEWER_VERDICT_UNVOUCHED_NOTE : undefined
}

/**
 * Whether the reviewer's note would only repeat the gate: it approved, and the
 * gate passed the attempt on it. Any other reviewer verdict, or any other
 * standing, is something the section's "Verify passed" line does not say.
 */
function approvalRepeatsPass(
  standing: VerifyAttemptStanding,
  evidence: VerifyAttemptEvidence,
): boolean {
  return standing === 'passed' && evidence.verdict?.verdict === 'approved'
}

/**
 * The notes over one attempt. On the story sign-off a reviewer approval of a
 * pass is left out — the feature's "Verify passed" already says it — while the
 * attempt's own view keeps it as the reviewer's record.
 */
function verifyAttemptNotes(
  entry: ProcessLedgerEntry,
  evidence: VerifyAttemptEvidence,
  opts: { omitRepeatedApproval?: boolean } = {},
): VerifyVerdictNote[] {
  const standing = verifyAttemptStanding(entry)
  const reviewer =
    opts.omitRepeatedApproval && approvalRepeatsPass(standing, evidence)
      ? undefined
      : reviewerNote(evidence)
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

function acceptedLabel(accepted: VerifyAttempt): string {
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
      return `${which} — the latest; none passed`
  }
}

/** A feature's verification for the sign-off: the attempt its latest run was accepted on, alone. */
export function featureVerifyView(
  accepted: VerifyAttempt,
  tiles: readonly EvidenceTile[],
  opts: { keyPrefix?: string; evidence?: EvidenceLoadState } = {},
): FeatureVerifyView {
  const { keyPrefix = '', evidence = 'loaded' } = opts
  const view = attemptView(accepted, tiles, keyPrefix, evidence)
  const header = view.evidence.proof?.header
  return {
    accepted: view,
    acceptedLabel: acceptedLabel(accepted),
    standing: view.standing,
    mode: header?.mode ?? 'unknown',
    dataUnstated: view.evidence.proof ? (header?.unstated ?? false) : stands(view.standing),
    proofUnvouched: header?.unvouched !== undefined,
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
  const unvouched = standing.filter((s) => s.proofUnvouched).map((s) => s.label)
  if (unvouched.length > 0) {
    const one = unvouched.length === 1
    parts.push(
      `${listNames(unvouched)} ${one ? 'rests' : 'rest'} only on captures that can’t be vouched for now — open ${one ? 'it' : 'each'} to see why; the next verify run captures them again.`,
    )
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
  return sectionPropsWith(entry, evidence, verifyAttemptNotes(entry, evidence))
}

function sectionPropsWith(
  entry: ProcessLedgerEntry,
  evidence: VerifyAttemptEvidence,
  notes: VerifyVerdictNote[],
): VerifySectionProps {
  return {
    pairs: evidence.pairs,
    recordings: evidence.recordings,
    uncountedRecordings: evidence.uncountedRecordings,
    reports: evidence.reports,
    emptyLabel: entry.status === 'running' ? ATTEMPT_RUNNING_EMPTY : ATTEMPT_EMPTY,
    ...(evidence.proof ? { proof: evidence.proof } : {}),
    notes,
  }
}

/**
 * A feature's section in the story sign-off: the accepted attempt, which one it
 * is, and its latest report — the sign-off shows where the feature stands now,
 * without a reviewer note that only repeats the pass its header already shows.
 */
export function featureVerifySectionProps(view: FeatureVerifyView): FeatureVerifySectionProps {
  const { entry, evidence } = view.accepted
  const section = sectionPropsWith(
    entry,
    evidence,
    verifyAttemptNotes(entry, evidence, { omitRepeatedApproval: true }),
  )
  return {
    ...section,
    reports: latestReport(section.reports),
    attemptLabel: view.acceptedLabel,
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
  if (!tile) {
    return { builtSha: undefined, dirty: false, expectedSha: undefined, unvouched: undefined }
  }
  const build = tile.ref.build
  const builtSha = build ? shortSha(build.sha) : undefined
  const expectedSha = expected ? shortSha(expected) : undefined
  return {
    builtSha,
    dirty: build?.dirty === true,
    expectedSha: expectedSha !== undefined && expectedSha !== builtSha ? expectedSha : undefined,
    unvouched: tile.unvouched?.label,
  }
}

function notCountedFold(count: number, thumbnails: number): ProofNotCountedFold | undefined {
  if (count === 0) return undefined
  const more = thumbnails > 0 ? ' more' : ''
  return {
    count,
    label: `${count}${more} ${count === 1 ? 'capture' : 'captures'} filed · ${PROOF_NOT_COUNTED_TAIL}`,
  }
}

/**
 * A verify attempt's Screens pane: one thumbnail per pair the proof rests on,
 * then each screen the change adds, marked with how much of it changed — the
 * stats, verdicts and diff live in the comparison overlay a thumbnail opens.
 * Everything that did not count folds into one quiet line. The attempt's own
 * line is said only when there is no thumbnail to show in its place.
 */
export function proofScreensPane(view: VerifyProofView): ProofScreensPane {
  const screenOf = new Map(view.screens.map((s) => [s.key, s]))
  const pairs = view.pairs.filter((p) => p.counted)
  const candidates = [
    ...pairs.map((p) => ({
      key: p.key,
      subject: p.subject,
      before: p.before,
      after: p.after,
      beforeAbsent: p.beforeAbsent,
      afterAbsent: p.afterAbsent,
      marker: p.marker,
    })),
    ...view.newScreens.map((s) => ({
      key: s.key,
      subject: s.title,
      before: s.entryPoint,
      after: s.tile,
      beforeAbsent: s.entryPointAbsent,
      afterAbsent: s.absent,
      marker: PROOF_THUMB_NEW_MARKER,
    })),
  ]
  const thumbnails: ProofThumbnail[] = candidates.flatMap((c) => {
    const screen = screenOf.get(c.key)
    return screen ? [{ ...c, screen }] : []
  })
  const notCounted = view.pairs.length - pairs.length + view.unpaired.length
  return {
    thumbnails,
    hasBefore: thumbnails.some((t) => t.before !== undefined || t.beforeAbsent !== undefined),
    summary: thumbnails.length === 0 ? view.summary : undefined,
    notCounted: notCountedFold(notCounted, thumbnails.length),
    saveAllLabel: `Save ${plural(thumbnails.length, 'screen', 'screens')}`,
  }
}

/**
 * The frame a thumbnail shows for the toggle's side. A before that is absent
 * says why; a screen with no before at all shows its after under either side.
 */
export function proofThumbnailFrame(
  thumb: Pick<ProofThumbnail, 'before' | 'after' | 'beforeAbsent' | 'afterAbsent'>,
  side: ProofThumbnailSide,
): ProofThumbnailFrame {
  if (side === 'before' && (thumb.before || thumb.beforeAbsent !== undefined)) {
    return { tile: thumb.before, absent: thumb.beforeAbsent }
  }
  return { tile: thumb.after, absent: thumb.afterAbsent }
}
