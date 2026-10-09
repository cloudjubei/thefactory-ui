/**
 * Where a `?commit=` link stands against the loaded log: nothing linked, a
 * link too short to match, one commit found, several matching, still paging,
 * or not found — in the whole history (`exhausted`) or the part searched.
 */
export type GitCommitLinkResolution =
  | { state: 'none' }
  | { state: 'too-short'; link: string }
  | { state: 'found'; sha: string }
  | { state: 'ambiguous'; link: string; matches: number }
  | { state: 'searching'; link: string }
  | { state: 'not-found'; link: string; searched: number; exhausted: boolean }
