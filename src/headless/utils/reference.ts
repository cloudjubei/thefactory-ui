/**
 * `#`-style reference parsing, parallel to `mention.ts`'s `@`-style mentions.
 *
 * The shape mirrors `MentionParse` / `applyMention` exactly so the textarea
 * can thread both flows through the same caret-detection / accept-suggestion
 * machinery. Pure utility — no DOM, no RN. Library is decoupled from any
 * reference source — the consumer supplies suggestions via `onSearchReferences`.
 */

export type ReferenceParse = {
  /** Token that follows `#`, used for filtering candidates. */
  token: string
  /** Index of the `#` itself (inclusive). */
  start: number
  /** Index just past the cursor (exclusive); typically equals `cursor`. */
  end: number
}

export type ReferenceSuggestion = {
  /** Canonical token inserted as `#<value>` on accept. */
  value: string
  /** Primary label shown in the dropdown row. */
  label: string
  /** Optional subtitle shown next to the label. */
  description?: string
}

export function parseReference(text: string, cursor: number): ReferenceParse | null {
  if (cursor < 0 || cursor > text.length) return null

  let i = cursor - 1
  while (i >= 0) {
    const c = text[i]
    if (c === '#') {
      if (i === 0 || /\s/.test(text[i - 1])) {
        return { token: text.slice(i + 1, cursor), start: i, end: cursor }
      }
      return null
    }
    if (/\s/.test(c)) return null
    i--
  }
  return null
}

/** Replaces the `#token` range with `#<value> ` and returns the new text + cursor. */
export function applyReference(
  text: string,
  parse: ReferenceParse,
  value: string,
): { text: string; cursor: number } {
  const before = text.slice(0, parse.start)
  const after = text.slice(parse.end)
  const insert = `#${value} `
  return { text: before + insert + after, cursor: before.length + insert.length }
}
