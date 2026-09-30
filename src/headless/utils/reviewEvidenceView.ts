import { CAPTURE_RECORD_NOT_THE_TOOLS_REASON } from 'thefactory-tools/constants'

import type { ReviewEvidenceRef } from '../api/generated'
import {
  ELSEWHERE_REPORT_AUTHORS,
  REPORT_AUTHOR_BY_APPROACH,
  REPORT_PROVENANCE,
  SCREEN_PAIR_CAPTURING_META,
  STEP_REPORT_AUTHORS,
  SCREEN_PAIR_FACT,
  SCREEN_PAIR_META,
} from './reviewEvidenceViewConstants'
import type {
  EvidenceGroup,
  EvidenceTile,
  EvidenceViewerImage,
  EvidenceWindow,
  ReportAuthor,
  ReviewerVerdictReading,
  ScreenPair,
} from './reviewEvidenceViewTypes'

/** Whether this item is something a reviewer can actually LOOK at inline. */
export function isViewableImage(ref: Pick<ReviewEvidenceRef, 'mediaType'>): boolean {
  return ref.mediaType.startsWith('image/')
}

/** Whether this item is a written note/report whose TEXT should be shown inline. */
export function isReadableNote(ref: Pick<ReviewEvidenceRef, 'mediaType'>): boolean {
  return (
    ref.mediaType.startsWith('text/') ||
    ref.mediaType === 'application/json' ||
    ref.mediaType === 'application/markdown'
  )
}

/**
 * The written notes of a listing whose text is not yet held or on its way. A
 * note's text never changes, so a live re-pull — one on every run or chat event
 * — must not download it again.
 */
export function notesToRead(
  refs: readonly ReviewEvidenceRef[],
  held: ReadonlySet<string>,
): ReviewEvidenceRef[] {
  return refs.filter((ref) => isReadableNote(ref) && !held.has(ref.id))
}

function captionFor(ref: ReviewEvidenceRef): string {
  if (ref.label && ref.label.trim().length > 0) return ref.label
  if (ref.phase) return ref.phase === 'before' ? 'Before' : 'After'
  return ref.kind
}

/** Wrap a ref for rendering, without loading anything yet. */
export function toEvidenceTile(ref: ReviewEvidenceRef): EvidenceTile {
  return { ref, caption: captionFor(ref) }
}

/**
 * Group evidence into before/after comparisons.
 *
 * A pair shown side by side is the whole point of a screenshot diff — two
 * unrelated images in a list do not answer "what changed", which is the question
 * the reviewer actually has. Items with a shared `subject` and opposite `phase`
 * pair up; everything else stands alone rather than being forced into a pair.
 */
export function groupEvidence(tiles: readonly EvidenceTile[]): EvidenceGroup[] {
  const groups = new Map<string, EvidenceGroup>()
  const ungrouped: EvidenceTile[] = []

  for (const tile of tiles) {
    const { subject, phase } = tile.ref
    if (!subject || !phase) {
      ungrouped.push(tile)
      continue
    }
    const existing = groups.get(subject) ?? {
      key: subject,
      title: subject,
      singles: [],
    }
    // A second 'after' for the same subject must not silently replace the first —
    // it is new evidence, not a correction.
    if (phase === 'before' && !existing.before) existing.before = tile
    else if (phase === 'after' && !existing.after) existing.after = tile
    else existing.singles.push(tile)
    groups.set(subject, existing)
  }

  const paired = [...groups.values()]
  return ungrouped.length > 0
    ? [...paired, { key: '__loose__', title: 'Other evidence', singles: ungrouped }]
    : paired
}

/**
 * The loaded images of a group, in before → after → singles order.
 *
 * A thumbnail strip is too small to judge a UI change, so the panel opens these
 * side by side in a zoomable viewer. Items whose bytes have not loaded (or that
 * are notes, not images) are skipped — the viewer never opens on a blank frame.
 */
export function evidenceViewerImages(group: EvidenceGroup): EvidenceViewerImage[] {
  const images: EvidenceViewerImage[] = []
  const push = (tile: EvidenceTile | undefined, prefix?: string): void => {
    if (!tile?.dataUri) return
    images.push({
      id: tile.ref.id,
      caption: prefix ? `${prefix} — ${tile.caption}` : tile.caption,
      dataUri: tile.dataUri,
    })
  }
  push(group.before, 'Before')
  push(group.after, 'After')
  for (const single of group.singles) push(single)
  return images
}

/** One-line summary for the section header. */
export function summarizeEvidence(refs: readonly ReviewEvidenceRef[]): string {
  if (refs.length === 0) return 'No evidence recorded'
  const counts = new Map<string, number>()
  for (const ref of refs) counts.set(ref.kind, (counts.get(ref.kind) ?? 0) + 1)
  return [...counts.entries()].map(([kind, n]) => `${n} ${kind}${n === 1 ? '' : 's'}`).join(' · ')
}

function earliestCreatedAt(group: EvidenceGroup): number {
  const times = [group.before, group.after, ...group.singles]
    .filter((t): t is EvidenceTile => t !== undefined)
    .map((t) => t.ref.createdAt)
  return times.length > 0 ? Math.min(...times) : Number.MAX_SAFE_INTEGER
}

/**
 * The Screens strip, in walkthrough order.
 *
 * Only images take part: a written report is not a screen. Paired groups become
 * one tile; each unpaired image becomes its own. Order is by first capture time,
 * so the index reads as "where in the walkthrough this was", and it is assigned
 * once here — filtering the strip later must not shift it.
 */
export function screenPairs(groups: readonly EvidenceGroup[]): ScreenPair[] {
  const raw: Omit<ScreenPair, 'index'>[] = []
  const timed: number[] = []
  for (const group of groups) {
    const before = group.before && isViewableImage(group.before.ref) ? group.before : undefined
    const after = group.after && isViewableImage(group.after.ref) ? group.after : undefined
    if (before || after) {
      raw.push({
        key: group.key,
        title: group.title,
        class: before && after ? 'pair' : after ? 'new' : 'removed',
        ...(before ? { before } : {}),
        ...(after ? { after } : {}),
      })
      timed.push(earliestCreatedAt({ ...group, singles: [] }))
    }
    for (const single of group.singles) {
      if (!isViewableImage(single.ref)) continue
      raw.push({
        key: single.ref.id,
        title: single.caption,
        class: 'single',
        after: single,
      })
      timed.push(single.ref.createdAt)
    }
  }
  return raw
    .map((pair, i) => ({ pair, at: timed[i] }))
    .sort((a, b) => a.at - b.at)
    .map(({ pair }, i) => ({ index: i + 1, ...pair }))
}

/**
 * The line under a tile in the Screens strip. No conclusion while the capture
 * is still running — "only on the base" mid-capture is just an after that has
 * not landed yet.
 */
export function screenPairMeta(
  pair: Pick<ScreenPair, 'class'>,
  opts: { capturing: boolean },
): string {
  return opts.capturing ? SCREEN_PAIR_CAPTURING_META : SCREEN_PAIR_META[pair.class]
}

/** What the comparison overlay says under an open pair: the gate's note, else what the pair is. */
export function comparisonPairFacts(pair: Pick<ScreenPair, 'class' | 'note'>): string[] {
  return [pair.note ?? SCREEN_PAIR_FACT[pair.class]]
}

/**
 * Reduce a human label to characters every filesystem and share sheet accepts.
 *
 * A screen titled "Login / SSO" must not put a path separator in a file name,
 * and two casings of one title must not collide on a case-insensitive disk.
 */
export function fileNameSlug(text: string, fallback = ''): string {
  const slug = text
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || fallback
}

/**
 * File-name stem for a saved screen, e.g. `03-login-sso`.
 *
 * Leads with the zero-padded walkthrough index so a saved set sorts on disk the
 * way the reviewer walked it.
 */
export function screenPairFileStem(pair: Pick<ScreenPair, 'index' | 'title'>): string {
  const index = String(pair.index).padStart(2, '0')
  const slug = fileNameSlug(pair.title)
  return slug ? `${index}-${slug}` : index
}

/**
 * The device a pair was captured on, for display under the image.
 *
 * Prefers the AFTER capture — that is the state being argued for — and falls
 * back to the before. Undefined when neither carries it, so an older run with no
 * provenance shows nothing rather than a placeholder.
 *
 * Evidence without provenance is weaker evidence: "which device was this?" is
 * the first question a sceptical reviewer asks, and until the capture tool
 * recorded it nothing in the chain could answer. Pure.
 */
export function capturedOnLabel(pair: {
  before?: { ref: { capturedOn?: string } }
  after?: { ref: { capturedOn?: string } }
}): string | undefined {
  const after = pair.after?.ref.capturedOn?.trim()
  if (after) return after
  const before = pair.before?.ref.capturedOn?.trim()
  return before && before.length > 0 ? before : undefined
}

/** The tiles filed inside a window, e.g. one verify attempt's own captures. */
export function evidenceFiledWithin(
  tiles: readonly EvidenceTile[],
  span: EvidenceWindow,
): EvidenceTile[] {
  return tiles.filter(
    (t) =>
      t.ref.createdAt >= span.since && (span.until === undefined || t.ref.createdAt <= span.until),
  )
}

/** Who wrote a report, by the approach it was filed under. */
export function reportAuthor(ref: Pick<ReviewEvidenceRef, 'approach'>): ReportAuthor {
  return (ref.approach && REPORT_AUTHOR_BY_APPROACH.get(ref.approach)) || 'verifier'
}

/**
 * Whether a filing is the verifier's own — every capture, and any report no
 * other step wrote. A code review files under the very run a verifier reviews,
 * so without this its report and verdict read as the verifier's.
 */
export function isVerifierFiling(ref: Pick<ReviewEvidenceRef, 'kind' | 'approach'>): boolean {
  return ref.kind !== 'report' || reportAuthor(ref) === 'verifier'
}

/** Whether a filing is a code review's finding. */
export function isCodeReview(ref: Pick<ReviewEvidenceRef, 'kind' | 'approach'>): boolean {
  return ref.kind === 'report' && reportAuthor(ref) === 'code-review'
}

/** "How this report was produced" — credited to the step that wrote it. */
export function reportProvenance(ref: Pick<ReviewEvidenceRef, 'approach'>): string {
  return REPORT_PROVENANCE[reportAuthor(ref)]
}

function newestTile(tiles: readonly EvidenceTile[]): EvidenceTile | undefined {
  return tiles.reduce<EvidenceTile | undefined>(
    (best, t) => (!best || t.ref.createdAt > best.ref.createdAt ? t : best),
    undefined,
  )
}

/**
 * The verifier's newest report alone, or none. A sign-off shows the current
 * account of the work, and the ones before it read as if they still held; they
 * stay on the attempt a person drills into. A report another step wrote is
 * never the verifier's account, however new.
 */
export function latestReport(reports: readonly EvidenceTile[]): EvidenceTile[] {
  const newest = newestTile(
    reports.filter((t) => t.ref.kind === 'report' && reportAuthor(t.ref) === 'verifier'),
  )
  return newest ? [newest] : []
}

/** The newest of the tiles alone, or none. */
export function newestOnly(tiles: readonly EvidenceTile[]): EvidenceTile[] {
  const newest = newestTile(tiles)
  return newest ? [newest] : []
}

/**
 * A Report tab's order: the step's own report leads — it is the account of the
 * whole run — and the rest follow newest first, reachable as earlier reports.
 */
export function orderReports(reports: readonly EvidenceTile[]): EvidenceTile[] {
  const rank = (t: EvidenceTile): number =>
    STEP_REPORT_AUTHORS.includes(reportAuthor(t.ref)) ? 0 : 1
  return [...reports].sort((a, b) => rank(a) - rank(b) || b.ref.createdAt - a.ref.createdAt)
}

/**
 * A run's own Report tab: its reports, never a code review — that has a tab of
 * its own — nor the story's final report, which belongs to the story.
 */
export function runReports(tiles: readonly EvidenceTile[]): EvidenceTile[] {
  return tiles.filter(
    (t) => t.ref.kind === 'report' && !ELSEWHERE_REPORT_AUTHORS.includes(reportAuthor(t.ref)),
  )
}

/**
 * Whether the backend listed this filing without whatever verdict was filed
 * with it. A capture whose own record was not the tool's is not one: its filing
 * is vouched for, and keeps any verdict.
 */
function lostItsVerdict(ref: Pick<ReviewEvidenceRef, 'unvouchedReason'>): boolean {
  const reason = ref.unvouchedReason?.trim()
  return reason !== undefined && reason !== '' && reason !== CAPTURE_RECORD_NOT_THE_TOOLS_REASON
}

type VerdictFiling = Pick<
  ReviewEvidenceRef,
  'kind' | 'approach' | 'verdict' | 'verdictReason' | 'createdAt' | 'unvouchedReason'
>

/**
 * The newest conclusion among these filings — unless a filing that lost its
 * verdict is at least as new: it may have carried the newer conclusion, so no
 * older one stands as the answer and the reading is no conclusion.
 */
function newestVerdict(refs: readonly VerdictFiling[]): ReviewerVerdictReading {
  let newest: VerdictFiling | undefined
  for (const r of refs) {
    const lost = lostItsVerdict(r)
    if (r.verdict === undefined && !lost) continue
    if (!newest || r.createdAt > newest.createdAt || (r.createdAt === newest.createdAt && lost)) {
      newest = r
    }
  }
  if (!newest?.verdict) return { state: 'none' }
  const reason = newest.verdictReason?.trim()
  return { state: 'concluded', verdict: { verdict: newest.verdict, ...(reason ? { reason } : {}) } }
}

/**
 * The reviewer's own conclusion among these filings — the newest one wins, as
 * at the gate. A code review's verdict is its own finding, never the reviewer's.
 */
export function reviewerVerdict(refs: readonly VerdictFiling[]): ReviewerVerdictReading {
  return newestVerdict(refs.filter(isVerifierFiling))
}

/** The code review's conclusion among these filings — the newest review's. */
export function codeReviewVerdict(refs: readonly VerdictFiling[]): ReviewerVerdictReading {
  return newestVerdict(refs.filter(isCodeReview))
}
