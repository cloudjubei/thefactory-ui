/** One changed file as the Changes view shows it, whichever diff it came from. */
export type GitChangeFile = {
  path: string
  status: 'A' | 'M' | 'D' | 'R'
  oldPath?: string
  additions?: number
  deletions?: number
  patch?: string
  /** Why there is no patch to show, when there is none. */
  note?: string
  /** A warning to surface beside the path (a conflict, an unsafe path). */
  warning?: string
}

/** One file in the report's "What changed": its path, letter and lines added and removed. */
export type ProcessChangeRow = {
  key: string
  path: string
  status: GitChangeFile['status']
  /** "+1 −0". */
  stat: string
}

/** The report's "What changed" body: a row per file, and a note when the seams are in it. */
export type ProcessChangesBody = {
  rows: ProcessChangeRow[]
  note: string | undefined
}
