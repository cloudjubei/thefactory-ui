// Cross-client commit-graph topology computation.
//
// Lifted from `src/web/compound/git/commitGraph/gitCommitGraphUtils.ts` so the
// native peer (`src/native/compound/git/CommitGraph.tsx`) can share the exact
// same lane-assignment algorithm. Web re-exports from here.
//
// Renderer-agnostic — returns plain data the row component lays out into SVG
// (web) or `react-native-svg` (native).

/** Single ref tag attached to a commit (branch/remote/tag/HEAD). */
export type GitLogRefLike = {
  type: 'branch' | 'remote' | 'tag' | 'HEAD'
  name: string
}

/** Minimal commit shape consumed by `computeCommitGraph`. */
export type GitLogCommitLike = {
  hash: string
  parents: string[]
  subject: string
  authorName: string
  authorEmail: string
  authorDate: number
  refs: GitLogRefLike[]
}

/**
 * One graph row — incoming/outgoing lane vectors carry the parent hash
 * threading through each lane, or `null` for an unused lane.
 */
export type GraphNode = {
  commit: GitLogCommitLike
  nodeLane: number
  incomingLanes: (string | null)[]
  outgoingLanes: (string | null)[]
  maxLanes: number
}

/**
 * Walk commits top-to-bottom, assigning each to an open lane.
 *
 *   - When a commit's hash already appears in `currentLanes` (the next-expected
 *     parent of an earlier commit), reuse that lane.
 *   - Otherwise drop into the first empty lane or push a new one.
 *   - Replace the node's lane with its first parent; any additional parents
 *     spawn new lanes (merge commits).
 *   - Trailing `null`s are trimmed so `maxLanes` stays minimal.
 */
export function computeCommitGraph(commits: GitLogCommitLike[]): GraphNode[] {
  const nodes: GraphNode[] = []
  let currentLanes: (string | null)[] = []

  for (const commit of commits) {
    const incomingLanes = [...currentLanes]
    const outgoingLanes = [...currentLanes]

    let nodeLane = incomingLanes.indexOf(commit.hash)
    if (nodeLane === -1) {
      nodeLane = incomingLanes.indexOf(null)
      if (nodeLane === -1) {
        nodeLane = incomingLanes.length
        outgoingLanes.push(null)
      }
    }

    // Merge multiple incoming lanes that point to this commit (branch merges).
    for (let i = 0; i < incomingLanes.length; i++) {
      if (incomingLanes[i] === commit.hash && i !== nodeLane) {
        outgoingLanes[i] = null
      }
    }

    // Replace the node's lane with its first parent.
    if (commit.parents.length > 0) {
      outgoingLanes[nodeLane] = commit.parents[0]
      for (let i = 1; i < commit.parents.length; i++) {
        const p = commit.parents[i]
        if (!outgoingLanes.includes(p)) {
          let emptyIdx = outgoingLanes.indexOf(null)
          if (emptyIdx === -1) {
            emptyIdx = outgoingLanes.length
            outgoingLanes.push(null)
          }
          outgoingLanes[emptyIdx] = p
        }
      }
    } else {
      outgoingLanes[nodeLane] = null
    }

    while (outgoingLanes.length > 0 && outgoingLanes[outgoingLanes.length - 1] === null) {
      outgoingLanes.pop()
    }

    nodes.push({
      commit,
      nodeLane,
      incomingLanes,
      outgoingLanes,
      maxLanes: Math.max(incomingLanes.length, outgoingLanes.length),
    })

    currentLanes = [...outgoingLanes]
  }

  return nodes
}

/** Color palette used by both renderers, indexed `lane % LANE_COLORS.length`. */
export const LANE_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#14b8a6',
  '#ec4899',
  '#6366f1',
] as const
