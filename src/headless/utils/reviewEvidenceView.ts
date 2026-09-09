import type { ReviewEvidenceRef } from '../api/generated'

/** One evidence item ready to render, with its bytes resolved when it is an image. */
export type EvidenceTile = {
  ref: ReviewEvidenceRef
  /** Data URI for an image, once loaded. Absent for non-images and while loading. */
  dataUri?: string
  /** Text of a note/report, once loaded. Absent for non-notes and while loading. */
  text?: string
  /** Human caption — the label, falling back to the phase or the kind. */
  caption: string
}

/** A before/after pair of the same subject, or a single item with no counterpart. */
export type EvidenceGroup = {
  /** What the comparison is OF, or the item's id when it stands alone. */
  key: string
  title: string
  before?: EvidenceTile
  after?: EvidenceTile
  /** Items that are not part of a before/after pair. */
  singles: EvidenceTile[]
}

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

/** One image, captioned, ready for the full-screen zoom viewer. */
export type EvidenceViewerImage = {
  id: string
  /** Caption shown under the image, phase-prefixed for a pair. */
  caption: string
  dataUri: string
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
