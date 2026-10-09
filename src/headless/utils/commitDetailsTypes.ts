/** What a commit changed against its first parent. */
export interface CommitChanges {
  files: number
  insertions: number
  deletions: number
}

/** A commit as its chip's hover card shows it. */
export interface CommitDetails {
  sha: string
  shortSha: string
  subject: string
  authorName: string
  /** Milliseconds since the epoch. */
  authorDate: number
  /** Absent when what it changed could not be read — a root commit has no parent to compare. */
  changes?: CommitChanges
}

/** Where reading a commit for its chip stands. */
export type CommitDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; details: CommitDetails }
  | { status: 'missing' }
  | { status: 'failed'; message: string }

/** A read that has finished, either way. */
export type CommitDetailsSettled<T> = { ok: true; value: T } | { ok: false; error: unknown }

/** The slice of a git log read this chip needs. */
export type CommitLogRead = {
  commits: ReadonlyArray<{ hash: string; subject: string; authorName: string; authorDate: number }>
}

/** The slice of a diff summary this chip needs. */
export type CommitDiffRead = { files: readonly unknown[]; insertions: number; deletions: number }
