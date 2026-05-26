import { LANE_COLORS, type GraphNode, type GitLogRefLike } from '../../../../headless/utils/gitCommitGraph'

const ROW_HEIGHT = 32
const LANE_WIDTH = 14
const RADIUS = 4

// Compact (mobile-style) layout overrides — match native `CommitGraph`
// constants 1:1 so the small-screen web peer reads identically.
const COMPACT_ROW_HEIGHT = 36
const COMPACT_LANE_WIDTH = 12

export type GitCommitGraphRowProps = {
  node: GraphNode
  isSelected: boolean
  onClick: () => void
  /**
   * Shared with the header so columns line up. Every column has an explicit
   * pixel width — Graph / Description / Author are user-resizable; Commit
   * and Date are constants. Ignored when `compact` is true.
   */
  colWidths: {
    graph: number
    description: number
    author: number
    commit: number
    date: number
  }
  /**
   * Mobile-style list rendering — drop the column layout in favour of a
   * graph cell + flex-1 two-line cell (refs + subject above, date · hash ·
   * author below). Mirrors the native `CommitGraph` row.
   */
  compact?: boolean
  rowRef?: (el: HTMLDivElement | null) => void
}

const REF_BADGE_CLS: Record<GitLogRefLike['type'], string> = {
  HEAD: 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800',
  branch:
    'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
  remote:
    'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800',
  tag: 'bg-neutral-100 text-neutral-800 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
}

function RefBadges({ refs }: { refs: GitLogRefLike[] }) {
  if (!refs || refs.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1 mr-1 shrink-0">
      {refs.map((r, idx) => (
        <span
          key={idx}
          className={`shrink-0 px-1 rounded text-[9px] uppercase tracking-wider ${REF_BADGE_CLS[r.type]}`}
        >
          {r.name}
        </span>
      ))}
    </span>
  )
}

function formatCommitDate(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return ''
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function GitCommitGraphRow({
  node,
  isSelected,
  onClick,
  colWidths,
  compact = false,
  rowRef,
}: GitCommitGraphRowProps) {
  const { commit, nodeLane, incomingLanes, outgoingLanes, maxLanes } = node
  const getColor = (i: number) => LANE_COLORS[i % LANE_COLORS.length]
  const isUncommitted = commit.hash === 'UNCOMMITTED'

  if (compact) {
    const rowH = COMPACT_ROW_HEIGHT
    const laneW = COMPACT_LANE_WIDTH
    const halfH = rowH / 2
    // Per-row graph width that just fits the lanes — same formula the
    // native `CommitGraph` uses so widths match across renderers.
    const graphWidth = Math.max(laneW * 2, (maxLanes + 1) * laneW + 4)
    return (
      <div
        ref={rowRef}
        className={`flex items-stretch border-b border-neutral-100 dark:border-neutral-800/50 cursor-pointer ${
          isSelected
            ? 'bg-blue-50/80 dark:bg-blue-900/20'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }`}
        style={{ height: rowH }}
        onClick={onClick}
      >
        <div className="shrink-0" style={{ width: graphWidth, height: rowH }}>
          {!isUncommitted && (
            <svg width={graphWidth} height={rowH}>
              {incomingLanes.map((hash, i) => {
                if (hash === commit.hash) {
                  return (
                    <path
                      key={`in-${i}`}
                      d={`M ${i * laneW + laneW} 0 Q ${i * laneW + laneW} ${halfH} ${
                        nodeLane * laneW + laneW
                      } ${halfH}`}
                      fill="none"
                      stroke={getColor(i)}
                      strokeWidth="2"
                    />
                  )
                } else if (hash !== null) {
                  return (
                    <line
                      key={`in-${i}`}
                      x1={i * laneW + laneW}
                      y1={0}
                      x2={i * laneW + laneW}
                      y2={halfH}
                      stroke={getColor(i)}
                      strokeWidth="2"
                    />
                  )
                }
                return null
              })}
              {outgoingLanes.map((hash, i) => {
                if (hash !== null) {
                  const isParent = commit.parents.includes(hash)
                  if (isParent) {
                    return (
                      <path
                        key={`out-${i}`}
                        d={`M ${nodeLane * laneW + laneW} ${halfH} Q ${
                          i * laneW + laneW
                        } ${halfH} ${i * laneW + laneW} ${rowH}`}
                        fill="none"
                        stroke={getColor(i)}
                        strokeWidth="2"
                      />
                    )
                  }
                  return (
                    <line
                      key={`out-${i}`}
                      x1={i * laneW + laneW}
                      y1={halfH}
                      x2={i * laneW + laneW}
                      y2={rowH}
                      stroke={getColor(i)}
                      strokeWidth="2"
                    />
                  )
                }
                return null
              })}
              <circle
                cx={nodeLane * laneW + laneW}
                cy={halfH}
                r={RADIUS}
                fill={getColor(nodeLane)}
                stroke="#fff"
                strokeWidth="2"
                className="dark:stroke-neutral-900"
              />
            </svg>
          )}
        </div>

        {isUncommitted ? (
          <div className="flex-1 min-w-0 flex items-center px-2 text-xs italic font-semibold text-(--text-secondary) truncate">
            Uncommitted changes
          </div>
        ) : (
          // Two-line cell: refs + subject above, date · hash · author below.
          <div className="flex-1 min-w-0 flex flex-col justify-center px-2 gap-0.5">
            <div className="flex items-center gap-1 min-w-0">
              <RefBadges refs={commit.refs} />
              <span className="truncate text-xs text-(--text-primary)">{commit.subject}</span>
            </div>
            <div className="truncate text-[10px] text-(--text-muted)">
              {commit.authorDate ? `${formatCommitDate(commit.authorDate)} · ` : ''}
              <span className="font-mono">{commit.hash.substring(0, 7)}</span>
              {commit.authorName ? ` · ${commit.authorName}` : ''}
            </div>
          </div>
        )}
      </div>
    )
  }

  const halfH = ROW_HEIGHT / 2

  return (
    <div
      ref={rowRef}
      className={`flex items-stretch border-b border-neutral-100 dark:border-neutral-800/50 cursor-pointer ${
        isSelected
          ? 'bg-blue-50/80 dark:bg-blue-900/20'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
      }`}
      style={{ height: ROW_HEIGHT }}
      onClick={onClick}
    >
      {/* Graph canvas — fixed width, matches header */}
      <div className="shrink-0" style={{ width: colWidths.graph, height: ROW_HEIGHT }}>
        {!isUncommitted && (
          <svg width="100%" height="100%">
            {incomingLanes.map((hash, i) => {
              if (hash === commit.hash) {
                return (
                  <path
                    key={`in-${i}`}
                    d={`M ${i * LANE_WIDTH + LANE_WIDTH} 0 Q ${i * LANE_WIDTH + LANE_WIDTH} ${halfH} ${
                      nodeLane * LANE_WIDTH + LANE_WIDTH
                    } ${halfH}`}
                    fill="none"
                    stroke={getColor(i)}
                    strokeWidth="2"
                  />
                )
              } else if (hash !== null) {
                return (
                  <line
                    key={`in-${i}`}
                    x1={i * LANE_WIDTH + LANE_WIDTH}
                    y1={0}
                    x2={i * LANE_WIDTH + LANE_WIDTH}
                    y2={halfH}
                    stroke={getColor(i)}
                    strokeWidth="2"
                  />
                )
              }
              return null
            })}

            {outgoingLanes.map((hash, i) => {
              if (hash !== null) {
                const isParent = commit.parents.includes(hash)
                if (isParent) {
                  return (
                    <path
                      key={`out-${i}`}
                      d={`M ${nodeLane * LANE_WIDTH + LANE_WIDTH} ${halfH} Q ${
                        i * LANE_WIDTH + LANE_WIDTH
                      } ${halfH} ${i * LANE_WIDTH + LANE_WIDTH} ${ROW_HEIGHT}`}
                      fill="none"
                      stroke={getColor(i)}
                      strokeWidth="2"
                    />
                  )
                }
                return (
                  <line
                    key={`out-${i}`}
                    x1={i * LANE_WIDTH + LANE_WIDTH}
                    y1={halfH}
                    x2={i * LANE_WIDTH + LANE_WIDTH}
                    y2={ROW_HEIGHT}
                    stroke={getColor(i)}
                    strokeWidth="2"
                  />
                )
              }
              return null
            })}

            <circle
              cx={nodeLane * LANE_WIDTH + LANE_WIDTH}
              cy={halfH}
              r={RADIUS}
              fill={getColor(nodeLane)}
              stroke="#fff"
              strokeWidth="2"
              className="dark:stroke-neutral-900"
            />
          </svg>
        )}
      </div>

      {isUncommitted ? (
        <div className="flex-1 min-w-0 flex items-center px-2 text-xs italic font-semibold text-neutral-600 dark:text-neutral-400 truncate">
          Uncommitted changes
        </div>
      ) : (
        <>
          {/* Description — fixed width matching the header column. Refs are
              inline-flex chips that don't wrap; the subject truncates if it
              would push past the cell. `whitespace-nowrap` prevents any
              vertical drift when the column shrinks. */}
          <div
            className="shrink-0 flex items-center gap-1 px-2 text-xs text-neutral-800 dark:text-neutral-200 whitespace-nowrap overflow-hidden"
            style={{ width: colWidths.description }}
          >
            <RefBadges refs={commit.refs} />
            <span className="truncate min-w-0">{commit.subject}</span>
          </div>

          {/* Author — fixed width, user-resizable in the header */}
          <div
            className="shrink-0 px-2 text-xs text-neutral-500 truncate flex items-center"
            style={{ width: colWidths.author }}
          >
            {commit.authorName}
          </div>

          {/* Commit hash — fixed width, monospace */}
          <div
            className="shrink-0 px-2 text-[10px] text-neutral-500 font-mono flex items-center"
            style={{ width: colWidths.commit }}
          >
            {commit.hash.substring(0, 7)}
          </div>

          {/* Date — fixed width, right-aligned to mimic desktop */}
          <div
            className="shrink-0 px-2 text-[10px] text-neutral-400 text-right truncate flex items-center justify-end"
            style={{ width: colWidths.date }}
          >
            {formatCommitDate(commit.authorDate)}
          </div>
        </>
      )}
    </div>
  )
}
