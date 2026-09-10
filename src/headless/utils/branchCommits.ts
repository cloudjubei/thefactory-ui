/** The fields a commit row needs; matches `GitLogCommit`. */
export type BranchCommit = {
  hash: string
  subject: string
  authorDate: number
}

/**
 * Git's own floor for an abbreviated sha. Below it a "prefix match" is just a
 * coincidence — `b` prefixes `base` — and matching loosely stops the walk on the
 * wrong commit.
 */
const MIN_ABBREV = 7

function sameCommit(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < MIN_ABBREV || b.length < MIN_ABBREV) return false
  return a.startsWith(b) || b.startsWith(a)
}

/**
 * The commits this branch added — everything newer than the base.
 *
 * `git log <branch>` walks back through the base's history too, so the base sha
 * is the stop line: it and everything behind it belong to the branch this work
 * started FROM, and listing them would credit the run with commits it never
 * made. If the base is never reached the window was too small to prove which
 * commits are the branch's own, so it claims none rather than all.
 */
export function commitsSinceBase(
  commits: readonly BranchCommit[],
  baseSha: string | undefined,
): BranchCommit[] {
  if (!baseSha) return []
  const out: BranchCommit[] = []
  for (const commit of commits) {
    if (sameCommit(commit.hash, baseSha)) return out
    out.push(commit)
  }
  return []
}
