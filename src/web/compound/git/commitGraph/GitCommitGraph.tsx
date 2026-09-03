import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Spinner from '../../../primitives/Spinner'
import type { GitLogCommitLike } from '../types'
import { computeCommitGraph, type GraphNode } from '../../../../headless/utils/gitCommitGraph'
import GitCommitGraphRow from './GitCommitGraphRow'
import GitCommitGraphHeader from './GitCommitGraphHeader'

export type GitCommitGraphProps = {
  /** Caller fetches the log; this component just renders the topology. */
  commits: GitLogCommitLike[]
  loading?: boolean
  error?: string
  selectedCommitSha?: string
  /**
   * When true, prepends a stub `UNCOMMITTED` row pointing at the tip commit —
   * matches desktop's pattern of showing pending changes in the same timeline.
   */
  uncommittedChanges?: boolean
  /** SHA to scroll into view (e.g. when the user picks a branch elsewhere). */
  scrollToSha?: string
  onSelectCommit?: (sha: string) => void
  /**
   * Fired with the commit's SHA when it's the tip of a branch — lets the
   * shell update its branch selection alongside the commit selection.
   */
  onSelectBranchBySha?: (sha: string) => void
  /**
   * Fired when the user scrolls near the bottom of the rendered log. Caller
   * is expected to be idempotent if there's nothing more to load.
   */
  onLoadMore?: () => void
  /** Set while a paginated fetch is in flight (shows a footer spinner). */
  loadingMore?: boolean
  /** When false, the graph stops asking for more pages. */
  hasMore?: boolean
  /**
   * Mobile-style list rendering — drop the resizable column header strip
   * and lay each commit out as a two-line cell (refs + subject above,
   * date · short-hash · author below). Used on small-screen web so the
   * narrow viewport reads identically to the mobile `CommitGraph`.
   */
  compact?: boolean
}

// Graph / Description / Author are user-resizable. Commit (SHA) and Date are
// constant — their content widths are predictable so there's nothing for the
// user to gain by resizing them.
const COMMIT_WIDTH = 72
const DATE_WIDTH = 110

const DEFAULT_GRAPH_WIDTH = 140
const DEFAULT_DESCRIPTION_WIDTH = 480
const DEFAULT_AUTHOR_WIDTH = 140

export function GitCommitGraph({
  commits,
  loading = false,
  error,
  selectedCommitSha,
  uncommittedChanges,
  scrollToSha,
  onSelectCommit,
  onSelectBranchBySha,
  onLoadMore,
  loadingMore,
  hasMore,
  compact = false,
}: GitCommitGraphProps) {
  const [graphWidth, setGraphWidth] = useState(DEFAULT_GRAPH_WIDTH)
  const [descriptionWidth, setDescriptionWidth] = useState(DEFAULT_DESCRIPTION_WIDTH)
  const [authorWidth, setAuthorWidth] = useState(DEFAULT_AUTHOR_WIDTH)

  const rowRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const setRowRef = useCallback(
    (sha: string) => (el: HTMLDivElement | null) => {
      if (el) rowRefsMap.current.set(sha, el)
      else rowRefsMap.current.delete(sha)
    },
    [],
  )
  // Track the last SHA we've scrolled to so we don't re-scroll every time
  // `commits` updates (pagination is the common case). The user's scroll
  // position should be preserved after each appended page.
  const lastScrolledShaRef = useRef<string | null>(null)
  const scrollRegionRef = useRef<HTMLDivElement | null>(null)

  // Auto-select a sensible default whenever the parent clears
  // `selectedCommitSha` (mount, project switch, branch switch).
  //
  // `autoSelectedRef` tracks which sha we last auto-picked. A manual click
  // changes `selectedCommitSha` but leaves the ref behind, so the
  // re-evaluation block below is guarded by `ref === selected` — once the
  // user has picked something explicit, we never override it.
  //
  // Re-evaluation priority for an auto-driven selection:
  //   1. Parent provided a new `scrollToSha` (branch tip / UNCOMMITTED) →
  //      follow it. This is the path that fixes branch switches: when the
  //      user picks a non-current branch, `scrollToSha = branch.localSha`
  //      and the highlight tracks it instead of staying on the previous
  //      tip or jumping to UNCOMMITTED.
  //   2. Our previous pick is no longer in the log (stale auto-pick after
  //      a branch switch) → re-pick from the new log.
  //   3. The parent left `scrollToSha` empty AND the working tree just
  //      became dirty → promote to UNCOMMITTED. This is the initial-load
  //      race fix (commits arrived before status).
  const autoSelectedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!onSelectCommit) return

    if (!selectedCommitSha) {
      if (scrollToSha) {
        autoSelectedRef.current = scrollToSha
        onSelectCommit(scrollToSha)
      } else if (uncommittedChanges) {
        autoSelectedRef.current = 'UNCOMMITTED'
        onSelectCommit('UNCOMMITTED')
      } else if (commits.length > 0) {
        autoSelectedRef.current = commits[0].hash
        onSelectCommit(commits[0].hash)
      }
      return
    }

    if (autoSelectedRef.current !== selectedCommitSha) return

    if (
      scrollToSha &&
      scrollToSha !== selectedCommitSha &&
      (scrollToSha === 'UNCOMMITTED' || commits.some((c) => c.hash === scrollToSha))
    ) {
      autoSelectedRef.current = scrollToSha
      onSelectCommit(scrollToSha)
      return
    }

    const isStale =
      selectedCommitSha !== 'UNCOMMITTED' &&
      commits.length > 0 &&
      !commits.some((c) => c.hash === selectedCommitSha)
    if (isStale) {
      if (uncommittedChanges) {
        autoSelectedRef.current = 'UNCOMMITTED'
        onSelectCommit('UNCOMMITTED')
      } else {
        autoSelectedRef.current = commits[0].hash
        onSelectCommit(commits[0].hash)
      }
      return
    }

    if (uncommittedChanges && selectedCommitSha !== 'UNCOMMITTED' && !scrollToSha) {
      autoSelectedRef.current = 'UNCOMMITTED'
      onSelectCommit('UNCOMMITTED')
    }
  }, [scrollToSha, commits, uncommittedChanges, selectedCommitSha, onSelectCommit])

  useEffect(() => {
    if (!scrollToSha) return
    // Already scrolled to this SHA in a previous render — don't yank the
    // user's scroll position around just because more commits were
    // appended via pagination.
    if (lastScrolledShaRef.current === scrollToSha) return
    const id = window.setTimeout(() => {
      const el = rowRefsMap.current.get(scrollToSha)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        lastScrolledShaRef.current = scrollToSha
        return
      }
      // SHA isn't in the loaded window yet — pull another page. Subsequent
      // renders will re-fire this effect (lastScrolledShaRef is still
      // unset for this sha), eventually finding the row or exhausting
      // history via `hasMore`.
      if (hasMore && onLoadMore && !loadingMore) onLoadMore()
    }, 50)
    return () => window.clearTimeout(id)
  }, [scrollToSha, commits, hasMore, onLoadMore, loadingMore])

  const graphNodes = useMemo(() => {
    let nodes = computeCommitGraph(commits)
    if (uncommittedChanges) {
      const stub: GraphNode = {
        commit: {
          hash: 'UNCOMMITTED',
          parents: commits.length > 0 ? [commits[0].hash] : [],
          subject: 'Uncommitted changes',
          authorName: '',
          authorEmail: '',
          authorDate: Date.now(),
          refs: [],
        },
        nodeLane: 0,
        maxLanes: 0,
        incomingLanes: [],
        outgoingLanes: [],
      }
      nodes = [stub, ...nodes]
    }
    return nodes
  }, [commits, uncommittedChanges])

  const colLayout = {
    graph: graphWidth,
    description: descriptionWidth,
    author: authorWidth,
    commit: COMMIT_WIDTH,
    date: DATE_WIDTH,
  }

  if (loading && commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-(--text-muted)">
        <Spinner />
        <span className="ml-2">Loading commit graph…</span>
      </div>
    )
  }
  if (error) {
    return <div className="p-4 text-sm text-red-600">Error loading graph: {error}</div>
  }
  if (graphNodes.length === 0) {
    return <div className="p-4 text-sm text-(--text-muted)">No commits found.</div>
  }

  const onScrollMore = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || loadingMore) return
    const el = e.currentTarget
    // Pull the next page when the user reaches the last ~250px of the
    // rendered log. Threshold is generous enough that fetch latency
    // doesn't show through as a scroll halt.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
      onLoadMore()
    }
  }

  const footer = (
    <>
      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-(--text-muted)">
          <Spinner /> Loading more commits…
        </div>
      )}
      {!loadingMore && !hasMore && commits.length > 0 && (
        <div className="text-center py-2 text-[10px] text-(--text-muted)">— End of history —</div>
      )}
    </>
  )

  // Compact (mobile-style) list — no column-headers strip, no horizontal
  // scroll, no resize handles. Each row lays out as a graph cell + a flex-1
  // two-line cell (refs+subject above, date · hash · author below) to match
  // the native `CommitGraph` 1:1 on narrow viewports.
  if (compact) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-(--surface-raised)">
        <div
          ref={scrollRegionRef}
          className="flex-1 min-h-0 overflow-y-auto"
          onScroll={onScrollMore}
        >
          {graphNodes.map((node) => {
            const sha = node.commit.hash
            return (
              <GitCommitGraphRow
                key={sha}
                node={node}
                isSelected={selectedCommitSha === sha}
                colWidths={colLayout}
                compact
                rowRef={setRowRef(sha)}
                onClick={() => {
                  onSelectCommit?.(sha)
                  onSelectBranchBySha?.(sha)
                }}
              />
            )
          })}
          {footer}
        </div>
      </div>
    )
  }

  return (
    // Outer pane owns horizontal scroll (so wide rows can extend beyond the
    // visible width); inner rows region owns vertical scroll so the column
    // header stays pinned without depending on `position: sticky` (which
    // misbehaves when ancestor stacking contexts are introduced).
    // Scrollbars are hidden — the graph is busy enough already and the
    // user can still scroll via wheel/trackpad.
    <div className="flex-1 min-h-0 flex flex-col bg-(--surface-raised) relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col min-w-fit min-h-0 flex-1">
        <div className="flex items-stretch shrink-0 bg-(--surface-muted) shadow-sm border-b border-(--border-subtle)">
          <GitCommitGraphHeader
            title="Graph"
            width={colLayout.graph}
            minWidth={80}
            maxWidth={400}
            onResize={setGraphWidth}
          />
          <GitCommitGraphHeader
            title="Description"
            width={colLayout.description}
            minWidth={160}
            maxWidth={1000}
            onResize={setDescriptionWidth}
          />
          <GitCommitGraphHeader
            title="Author"
            width={colLayout.author}
            minWidth={90}
            maxWidth={300}
            onResize={setAuthorWidth}
          />
          <GitCommitGraphHeader title="Commit" width={colLayout.commit} />
          <GitCommitGraphHeader title="Date" width={colLayout.date} />
        </div>

        <div
          ref={scrollRegionRef}
          className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={onScrollMore}
        >
          {graphNodes.map((node) => {
            const sha = node.commit.hash
            return (
              <GitCommitGraphRow
                key={sha}
                node={node}
                isSelected={selectedCommitSha === sha}
                colWidths={colLayout}
                rowRef={setRowRef(sha)}
                onClick={() => {
                  onSelectCommit?.(sha)
                  onSelectBranchBySha?.(sha)
                }}
              />
            )
          })}
          {footer}
        </div>
      </div>
    </div>
  )
}

export default GitCommitGraph
