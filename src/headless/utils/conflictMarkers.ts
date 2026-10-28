/*
 * Pure git conflict-marker parsing / serialisation. Shared by web's
 * `MergeConflictResolver` and the native resolver so both clients keep one
 * copy — no React or platform dependency.
 *
 * A conflicted working-tree file git wrote looks like:
 *
 *   <<<<<<< HEAD
 *   our lines
 *   =======
 *   their lines
 *   >>>>>>> feature-branch
 *
 * `parseConflictSegments` turns that into an ordered list of plain-text and
 * conflict segments; `serializeSegments` is the exact inverse for unresolved
 * conflict segments, so a parse → serialize round-trip is lossless.
 */

/** A run of non-conflicting file content. */
export type SegmentText = { type: 'text'; text: string }

/** A single `<<<<<<< / ======= / >>>>>>>` conflict hunk. */
export type SegmentConflict = {
  type: 'conflict'
  /** Label after `<<<<<<< ` — typically `HEAD`. */
  oursLabel: string
  /** Label after `>>>>>>> ` — typically the incoming branch / ref. */
  theirsLabel: string
  /** Our side of the hunk (between the start marker and `=======`). */
  ours: string
  /** Their side of the hunk (between `=======` and the end marker). */
  theirs: string
}

export type Segment = SegmentText | SegmentConflict

/** Order to interleave the two sides when the user picks "accept both". */
export type BothOrder = 'ours-then-theirs' | 'theirs-then-ours'

/** True when `s` still contains any of git's three conflict markers. */
export function hasConflictMarkers(s: string): boolean {
  return /<<<<<<< |>>>>>>> |=======/.test(s)
}

/**
 * Parse a conflicted file's raw content into ordered text / conflict segments.
 * CRLF is normalised to LF up-front. A malformed (unterminated) conflict block
 * is emitted verbatim as a trailing text segment rather than throwing, so the
 * user can still hand-edit it.
 */
export function parseConflictSegments(raw: string): Segment[] {
  const text = (raw || '').replace(/\r\n/g, '\n')
  const segments: Segment[] = []
  let i = 0
  while (i < text.length) {
    const startIdx = text.indexOf('<<<<<<< ', i)
    if (startIdx === -1) {
      segments.push({ type: 'text', text: text.slice(i) })
      break
    }
    if (startIdx > i) segments.push({ type: 'text', text: text.slice(i, startIdx) })

    const lineEnd = text.indexOf('\n', startIdx)
    const oursHeader = text.slice(
      startIdx + '<<<<<<< '.length,
      lineEnd === -1 ? text.length : lineEnd,
    )

    // The separator needle's leading `\n` is the newline that terminates the
    // ours-header line. Search from `lineEnd` (that very newline) — not
    // `lineEnd + 1` — so an empty "ours" side (`<<<<<<< h\n=======\n…`) still
    // matches; starting one char later would skip past the needle's `\n`.
    const sepNeedle = '\n=======\n'
    const sepIdx = text.indexOf(sepNeedle, lineEnd === -1 ? startIdx : lineEnd)
    if (sepIdx === -1) {
      segments.push({ type: 'text', text: text.slice(startIdx) })
      break
    }

    const oursContent = text.slice(lineEnd === -1 ? startIdx : lineEnd + 1, sepIdx)
    const endMarker = '\n>>>>>>>'
    const endIdx = text.indexOf(endMarker, sepIdx + sepNeedle.length)
    if (endIdx === -1) {
      segments.push({ type: 'text', text: text.slice(startIdx) })
      break
    }
    const theirsHeaderLineEnd = text.indexOf('\n', endIdx + endMarker.length)
    const theirsHeader = text.slice(
      endIdx + endMarker.length + 1,
      theirsHeaderLineEnd === -1 ? text.length : theirsHeaderLineEnd,
    )
    const theirsContent = text.slice(sepIdx + sepNeedle.length, endIdx)

    segments.push({
      type: 'conflict',
      oursLabel: oursHeader || 'ours',
      theirsLabel: theirsHeader || 'theirs',
      ours: oursContent,
      theirs: theirsContent,
    })
    i = theirsHeaderLineEnd === -1 ? text.length : theirsHeaderLineEnd + 1
  }
  return segments
}

/**
 * Rebuild file content from segments. Text segments are emitted as-is;
 * any remaining (unresolved) conflict segment is re-emitted with git's
 * markers, so the result of an incomplete resolution is still a valid
 * conflicted file.
 */
export function serializeSegments(segments: Segment[]): string {
  return segments
    .map((seg) =>
      seg.type === 'text'
        ? seg.text
        : `<<<<<<< ${seg.oursLabel}\n${seg.ours}\n=======\n${seg.theirs}\n>>>>>>> ${seg.theirsLabel}\n`,
    )
    .join('')
}

/**
 * Resolve a single conflict segment to plain text by picking a side. For
 * `both`, the two sides are joined in `order`, separated by a newline only
 * when both sides are non-empty (avoids a stray blank line).
 */
export function resolveConflict(
  seg: SegmentConflict,
  choice: 'ours' | 'theirs' | 'both',
  order: BothOrder = 'ours-then-theirs',
): string {
  if (choice === 'ours') return seg.ours
  if (choice === 'theirs') return seg.theirs
  const first = order === 'ours-then-theirs' ? seg.ours : seg.theirs
  const second = order === 'ours-then-theirs' ? seg.theirs : seg.ours
  return first + (first && second ? '\n' : '') + second
}
