/**
 * Parses an `@`-style mention out of a chat input given the current cursor.
 * The token is the substring between an `@` and the cursor, provided the `@`
 * is at the start of the field or preceded by whitespace, and the substring
 * contains no whitespace.
 *
 * Returns the token range (so callers can replace it on completion), or `null`
 * when the cursor is not in a mention.
 */
export type MentionParse = {
  /** Token that follows `@`, used for filtering candidates. */
  token: string
  /** Index of the `@` itself (inclusive). */
  start: number
  /** Index just past the cursor (exclusive); typically equals `cursor`. */
  end: number
}

export function parseMention(text: string, cursor: number): MentionParse | null {
  if (cursor < 0 || cursor > text.length) return null

  let i = cursor - 1
  while (i >= 0) {
    const c = text[i]
    if (c === '@') {
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

/**
 * Substring-match scoring: prefix matches outrank infix matches; shorter paths
 * outrank longer ones at equal match position. Case-insensitive.
 */
export function rankMentionMatches(paths: string[], token: string, limit = 8): string[] {
  if (token.length === 0) return paths.slice(0, limit)
  const needle = token.toLowerCase()
  const scored: { path: string; score: number }[] = []
  for (const p of paths) {
    const idx = p.toLowerCase().indexOf(needle)
    if (idx === -1) continue
    scored.push({ path: p, score: idx * 1000 + p.length })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((s) => s.path)
}

/** Replaces the `@token` range with `@<path> ` and returns the new text + cursor. */
export function applyMention(
  text: string,
  parse: MentionParse,
  path: string,
): { text: string; cursor: number } {
  const before = text.slice(0, parse.start)
  const after = text.slice(parse.end)
  const insert = `@${path} `
  return { text: before + insert + after, cursor: before.length + insert.length }
}
