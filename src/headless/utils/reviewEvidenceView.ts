import {
  CAPTURE_RECORD_NOT_THE_TOOLS_REASON,
  LOOM_WALKTHROUGH_APPROACH,
  SIGN_OFF_OUTPUT_APPROACH,
} from 'thefactory-tools/constants'

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
  ScreenPairClass,
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

function captionFor(ref: ReviewEvidenceRef): string {
  if (ref.label && ref.label.trim().length > 0) return ref.label
  if (ref.phase) return ref.phase === 'before' ? 'Before' : 'After'
  return ref.kind
}

/** Whether a filing is proof of the work: an output or a Loom item has a chip of its own. Pure. */
export function isProofFiling(ref: Pick<ReviewEvidenceRef, 'approach'>): boolean {
  return ref.approach !== SIGN_OFF_OUTPUT_APPROACH && ref.approach !== LOOM_WALKTHROUGH_APPROACH
}

/** Wrap a ref for rendering, without loading anything yet. */
export function toEvidenceTile(ref: ReviewEvidenceRef): EvidenceTile {
  return { ref, caption: captionFor(ref) }
}

/**
 * Group evidence into before/after comparisons.
 *
 * A pair shown side by side is the whole point of a screenshot diff — two
 * unrelated images in a list do not answer "what changed". Build buckets are
 * platform + variant + subject + sha. A before from the run's base may join a
 * head bucket in the same lane; a failed check leaves both captures as singles.
 * Legacy filings with no build metadata retain their historical grouping.
 */
export function groupEvidence(
  tiles: readonly EvidenceTile[],
  opts: { baseSha?: string; baseShaByRun?: ReadonlyMap<string, string> } = {},
): EvidenceGroup[] {
  const groups = new Map<string, EvidenceGroup>()
  const ungrouped: EvidenceTile[] = []

  for (const tile of tiles) {
    const { subject, phase } = tile.ref
    if (!subject || !phase) {
      ungrouped.push(tile)
      continue
    }
    const build = tile.ref.build
    const key = build
      ? JSON.stringify([
          build.platform ?? '',
          build.variant ?? '',
          subject,
          build.sha,
          tile.ref.kind,
        ])
      : subject
    const existing = groups.get(key) ?? {
      key,
      title: subject,
      singles: [],
    }
    // A second 'after' for the same subject must not silently replace the first —
    // it is new evidence, not a correction.
    if (phase === 'before' && !existing.before) existing.before = tile
    else if (phase === 'after' && !existing.after) existing.after = tile
    else existing.singles.push(tile)
    groups.set(key, existing)
  }

  // A before is built from the base, not the after's commit. Join across those
  // two build buckets only within one platform/variant and subject, and only
  // when the run's base record agrees. Never guess between head builds.
  const all = [...groups.values()]
  const lane = (t: EvidenceTile): string =>
    JSON.stringify([
      t.ref.build?.platform ?? '',
      t.ref.build?.variant ?? '',
      t.ref.subject,
      t.ref.kind,
    ])
  const consumed = new Set<string>()
  const unmatchedBeforeNotes = new Map<string, string>()
  for (const group of all) {
    const after = group.after
    if (!after) continue
    const baseSha = opts.baseShaByRun?.get(after.ref.runId) ?? opts.baseSha
    const candidates = tiles.filter((t) => t.ref.phase === 'before' && lane(t) === lane(after))
    if (
      (!group.before || (after.ref.build && after.ref.comparison?.beforeId)) &&
      candidates.length > 0
    ) {
      const named = after.ref.comparison?.beforeId
      const before = named
        ? candidates.find((t) => t.ref.id === named)
        : ([...candidates]
            .filter((t) => !baseSha || t.ref.build?.sha === baseSha)
            .sort((a, b) => b.ref.createdAt - a.ref.createdAt)[0] ??
          [...candidates].sort((a, b) => b.ref.createdAt - a.ref.createdAt)[0])
      if (group.before && group.before.ref.id !== before?.ref.id) {
        group.singles.push(group.before)
        delete group.before
      }
      if (before) {
        group.before = before
        consumed.add(before.ref.id)
      }
    }
    if (!group.before) {
      const named = after.ref.comparison?.beforeId
      const other = tiles.find(
        (t) =>
          t.ref.phase === 'before' &&
          t.ref.subject === after.ref.subject &&
          (!named || t.ref.id === named),
      )
      if (other || named) {
        const reason = other
          ? 'Cannot compare: the captures have different platforms or variants.'
          : 'Cannot compare: the named before capture is missing.'
        group.note = reason
        if (other) unmatchedBeforeNotes.set(other.ref.id, reason)
      }
      continue
    }
    const before = group.before
    const reason = baseSha
      ? !before.ref.build
        ? 'Cannot compare: the before has no build record.'
        : before.ref.build.dirty
          ? 'Cannot compare: the before build has uncommitted changes.'
          : before.ref.build.sha !== baseSha
            ? `Cannot compare: the before was built from ${before.ref.build.sha}, not the run’s base ${baseSha}.`
            : !after.ref.build
              ? 'Cannot compare: the after has no build record.'
              : undefined
      : before.ref.build || after.ref.build
        ? 'Cannot compare: the run’s base commit is unknown.'
        : undefined
    if (reason) {
      group.note = reason
      group.singles.unshift(before, after)
      delete group.before
      delete group.after
    }
  }
  // Resolve opposite-side notes only after every lane has paired: an unmatched
  // capture must not taint a before already used by another platform's valid pair.
  for (const group of all) {
    if (group.before && !group.after && !consumed.has(group.before.ref.id)) {
      const note = unmatchedBeforeNotes.get(group.before.ref.id)
      if (note) group.note = note
    }
  }
  const paired = all
    .map((group): EvidenceGroup => {
      if (group.before && !group.after && consumed.has(group.before.ref.id)) {
        const { before: _before, ...rest } = group
        return rest
      }
      return group
    })
    .filter((group) => group.before || group.after || group.singles.length > 0)
  // A later head build is the current attempt in its lane. Keep the previous
  // builds reachable, but do not present their screenshots as current proof.
  const newest = new Map<string, EvidenceGroup>()
  for (const group of paired) {
    const after = group.after ?? group.singles.find((t) => t.ref.phase === 'after')
    if (!after?.ref.build) continue
    const id = lane(after)
    const prior = newest.get(id)
    const priorAfter = prior?.after ?? prior?.singles.find((t) => t.ref.phase === 'after')
    if (!priorAfter || after.ref.createdAt > priorAfter.ref.createdAt) newest.set(id, group)
  }
  for (const group of paired) {
    const after = group.after ?? group.singles.find((t) => t.ref.phase === 'after')
    if (after?.ref.build && newest.get(lane(after)) !== group) group.earlier = true
  }
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

function pairedScreenClass(before: EvidenceTile, after: EvidenceTile): ScreenPairClass {
  const comparison = after.ref.comparison
  if (!comparison) return 'pair'
  if (
    comparison.unavailable !== undefined ||
    (comparison.beforeId !== undefined && comparison.beforeId !== before.ref.id)
  ) {
    return 'unavailable'
  }
  return comparison.identical ? 'unchanged' : 'changed'
}

/**
 * The Screens strip, changed pairs first, then the rest in walkthrough order.
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
        class: group.note
          ? 'single'
          : before && after
            ? pairedScreenClass(before, after)
            : after
              ? 'new'
              : 'removed',
        ...(before ? { before } : {}),
        ...(after ? { after } : {}),
        ...(group.note ? { note: group.note } : {}),
        ...(group.earlier ? { earlier: true } : {}),
      })
      timed.push(earliestCreatedAt({ ...group, singles: [] }))
    }
    for (const single of group.singles) {
      if (!isViewableImage(single.ref)) continue
      raw.push({
        key: single.ref.build ? `${group.key}::${single.ref.id}` : single.ref.id,
        title: single.caption,
        class: 'single',
        after: single,
        ...(group.note ? { note: group.note } : {}),
        ...(group.earlier ? { earlier: true } : {}),
      })
      timed.push(single.ref.createdAt)
    }
  }
  return raw
    .map((pair, i) => ({ pair, at: timed[i] }))
    .sort((a, b) => a.at - b.at)
    .map(({ pair }, i) => ({ index: i + 1, ...pair }))
    .sort((a, b) => Number(b.class === 'changed') - Number(a.class === 'changed'))
}

/**
 * The line under a tile in the Screens strip. No conclusion while the capture
 * is still running — "only on the base" mid-capture is just an after that has
 * not landed yet.
 */
export function screenPairMeta(
  pair: Pick<ScreenPair, 'class' | 'note'>,
  opts: { capturing: boolean },
): string {
  return opts.capturing ? SCREEN_PAIR_CAPTURING_META : (pair.note ?? SCREEN_PAIR_META[pair.class])
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
  | 'kind'
  | 'approach'
  | 'verdict'
  | 'verdictReason'
  | 'verdictCause'
  | 'createdAt'
  | 'unvouchedReason'
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
  const cause = newest.verdict === 'approved' ? undefined : newest.verdictCause
  return {
    state: 'concluded',
    verdict: {
      verdict: newest.verdict,
      ...(reason ? { reason } : {}),
      ...(cause ? { cause } : {}),
    },
  }
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
