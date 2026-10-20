/**
 * Parses an `@`-style mention out of a chat input given the current cursor.
 * The token is the substring between an `@` and the cursor, provided the `@`
 * is at the start of the field or preceded by whitespace, and the substring
 * contains no whitespace.
 *
 * Returns the token range (so callers can replace it on completion), or `null`
 * when the cursor is not in a mention.
 *
 * Pure utility — no DOM, no RN. The web and native `FileMentionsTextarea`
 * peers both consume this parser through `useFileMentions`.
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

/** The folders on the way to each file, each written with a closing `/`, in the order first met. */
export function mentionFolders(paths: readonly string[]): string[] {
  const folders = new Set<string>()
  for (const path of paths) {
    for (let slash = path.indexOf('/'); slash > 0; slash = path.indexOf('/', slash + 1)) {
      folders.add(path.slice(0, slash + 1))
    }
  }
  return [...folders]
}

/** An `@` suggestion that names a folder rather than a file — in this project or another. */
export function isFolderMention(value: string): boolean {
  return value.endsWith('/')
}

const mentionCandidateCache = new WeakMap<readonly string[], readonly string[]>()

/** What `@` offers for a project's files: the files, then the folders that hold them. */
function mentionCandidates(paths: readonly string[]): readonly string[] {
  const cached = mentionCandidateCache.get(paths)
  if (cached) return cached
  const candidates = [...paths, ...mentionFolders(paths)]
  mentionCandidateCache.set(paths, candidates)
  return candidates
}

/**
 * Substring-match scoring over a project's files and the folders that hold
 * them: prefix matches outrank infix matches; shorter paths outrank longer ones
 * at equal match position, so a folder comes before the files inside it.
 * Case-insensitive. With nothing typed, files come first.
 */
export function rankMentionMatches(paths: readonly string[], token: string, limit = 8): string[] {
  const candidates = mentionCandidates(paths)
  if (token.length === 0) return candidates.slice(0, limit)
  const needle = token.toLowerCase()
  const scored: { path: string; score: number }[] = []
  for (const p of candidates) {
    const idx = p.toLowerCase().indexOf(needle)
    if (idx === -1) continue
    scored.push({ path: p, score: idx * 1000 + p.length })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((s) => s.path)
}

/** One project's files, as a chat over several projects offers them after `@`. */
export type ProjectMentionFiles = { projectId: string; paths: readonly string[] }

const PROJECT_FILE_MENTION = /^([A-Za-z0-9][A-Za-z0-9_-]*):(.*)$/

/**
 * {@link rankMentionMatches} over several projects' files and folders, each written
 * `<projectId>:<path>` — the token that says which project a file is in. A
 * token naming a project before a colon (`ui:src`) looks in that project only.
 * Equal matches keep the projects' order.
 */
export function rankProjectMentionMatches(
  projects: readonly ProjectMentionFiles[],
  token: string,
  limit = 8,
): string[] {
  const named = PROJECT_FILE_MENTION.exec(token)
  const only = named
    ? projects.find((p) => p.projectId.toLowerCase() === named[1]!.toLowerCase())
    : undefined
  const needle = (only ? named![2]! : token).toLowerCase()
  const scored: { value: string; score: number }[] = []
  for (const project of only ? [only] : projects) {
    for (const path of mentionCandidates(project.paths)) {
      const idx = path.toLowerCase().indexOf(needle)
      if (idx === -1) continue
      scored.push({ value: `${project.projectId}:${path}`, score: idx * 1000 + path.length })
    }
  }
  if (needle.length > 0) scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((s) => s.value)
}

/** A suggestion from {@link rankProjectMentionMatches} split into its project and path. */
export function projectFileMention(value: string): { projectId?: string; path: string } {
  const named = PROJECT_FILE_MENTION.exec(value)
  return named?.[2] ? { projectId: named[1]!, path: named[2] } : { path: value }
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
