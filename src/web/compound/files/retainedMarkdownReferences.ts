import { findReferences } from 'thefactory-tools/utils'

type RetainedReference = { start: number; end: number; raw: string; stored: string }

/** Capture the stored spelling of each reference at its position in the kept editor text. */
export function retainedReferences(
  canonical: string,
  toTyped: (text: string) => string,
): RetainedReference[] {
  let offset = 0
  return findReferences(canonical).map((ref) => {
    const raw = ref.type === 'reference' ? toTyped(ref.raw) : ref.raw
    const start = ref.start + offset
    offset += raw.length - ref.raw.length
    return { start, end: start + raw.length, raw, stored: ref.raw }
  })
}

/** Carry only intact tokens across a textarea edit. Prefer the actual caret edge
 * when it describes the same edit, so inserting an identical token before an
 * old one does not transfer the old token's identity to the new one. */
export function shiftRetainedReferences(
  refs: RetainedReference[],
  before: string,
  after: string,
  caret?: number,
): RetainedReference[] {
  if (before === after || refs.length === 0) return refs
  const delta = after.length - before.length
  let start = 0
  while (start < Math.min(before.length, after.length) && before[start] === after[start]) start++
  let end = before.length
  while (end > 0 && end + delta > 0 && before[end - 1] === after[end + delta - 1]) end--
  // The matching prefix and suffix can overlap (e.g. deleting either of two
  // identical lines). Even then, the old span must cover the net deletion.
  const removed = Math.max(0, -delta, end - start)
  const caretEnd = caret === undefined ? -1 : caret - delta
  const caretStart = caretEnd - removed
  if (caretEnd >= end && caretStart >= 0 && caretStart <= start && caretEnd <= before.length) {
    start = caretStart
  }
  end = start + removed
  return refs.flatMap((ref) => {
    if (ref.end <= start) return [ref]
    if (ref.start >= end) return [{ ...ref, start: ref.start + delta, end: ref.end + delta }]
    return []
  })
}

/** Restore the stored bytes at unchanged token positions; resolve fresh tokens live. */
export function saveRetainedMarkdown(
  text: string,
  refs: RetainedReference[],
  canonicalize?: (text: string) => string,
): string {
  const byStart = new Map(refs.map((ref) => [ref.start, ref]))
  const pieces: string[] = []
  let at = 0
  for (const ref of findReferences(text)) {
    const kept = byStart.get(ref.start)
    pieces.push(text.slice(at, ref.start))
    pieces.push(
      kept?.raw === ref.raw
        ? kept.stored
        : ref.type === 'typed' && canonicalize
          ? canonicalize(ref.raw)
          : ref.raw,
    )
    at = ref.end
  }
  pieces.push(text.slice(at))
  return pieces.join('')
}
