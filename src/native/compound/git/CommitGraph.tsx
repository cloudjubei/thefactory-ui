import { useEffect, useMemo, useRef } from 'react'
import { FlatList, Pressable, Text, View, type FlatListProps } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import {
  LANE_COLORS,
  computeCommitGraph,
  type GitLogCommitLike,
  type GraphNode,
} from '../../../headless/utils/gitCommitGraph'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/**
 * Format a commit's authorDate (ms since epoch — already converted by
 * `GitTools.getLog`, see thefactory-tools/src/git/GitTools.ts:640) as
 * `Mon DD, YYYY` to match web's `GitCommitGraphRow` exactly. Empty string
 * when the date is missing / invalid so the surrounding ` · ` separators
 * still read cleanly.
 */
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

export type CommitGraphProps = {
  /** Caller fetches the log; this component renders the topology + metadata. */
  commits: GitLogCommitLike[]
  selectedCommitSha?: string
  /**
   * When true, prepends a stub `UNCOMMITTED` row pointing at the tip commit —
   * matches desktop's pattern of showing pending changes in the same timeline.
   */
  uncommittedChanges?: boolean
  /** SHA to scroll into view (e.g. when the user picks a branch elsewhere). */
  scrollToSha?: string
  onSelectCommit?: (sha: string) => void
  /** Fired with the commit's SHA when it's the tip of a branch. */
  onSelectBranchBySha?: (sha: string) => void
  /** Bottom-reached pagination callback (caller is expected to be idempotent). */
  onLoadMore?: () => void
  /** Set while a paginated fetch is in flight. */
  loadingMore?: boolean
  /** When false, the graph stops asking for more pages. */
  hasMore?: boolean
}

const ROW_HEIGHT = 36
const LANE_WIDTH = 12
const RADIUS = 4

/**
 * Native peer of `web/compound/git/commitGraph/GitCommitGraph`. Renders the
 * shared lane topology with `react-native-svg` and lays each commit out as
 * a tappable row containing the graph cell + the commit subject + author +
 * short hash. Branch / remote / tag refs render as inline chips next to
 * the subject.
 *
 * The mobile layout drops web's resizable columns and constant date column —
 * those don't fit a phone width. The author + hash render under the subject
 * to keep the row touch-comfortable while still surfacing the same data.
 */
export function CommitGraph({
  commits,
  selectedCommitSha,
  uncommittedChanges,
  scrollToSha,
  onSelectCommit,
  onSelectBranchBySha,
  onLoadMore,
  loadingMore,
  hasMore,
}: CommitGraphProps) {
  const { theme } = useNativeTheme()
  const listRef = useRef<FlatList<GraphNode>>(null)
  const lastScrolledShaRef = useRef<string | null>(null)

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

  // Auto-select first commit (or the UNCOMMITTED stub) when nothing is
  // selected yet — mirrors the web bootstrap behaviour.
  useEffect(() => {
    if (selectedCommitSha || !onSelectCommit) return
    if (uncommittedChanges) onSelectCommit('UNCOMMITTED')
    else if (commits.length > 0) onSelectCommit(commits[0].hash)
  }, [commits, uncommittedChanges, selectedCommitSha, onSelectCommit])

  // Scroll to a target SHA when it changes; re-attempt as more pages
  // arrive if the SHA isn't in the loaded window yet.
  useEffect(() => {
    if (!scrollToSha) return
    if (lastScrolledShaRef.current === scrollToSha) return
    const idx = graphNodes.findIndex((n) => n.commit.hash === scrollToSha)
    if (idx >= 0) {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 })
      } catch {
        // index may be out of range while items are still settling — fall
        // through and try again on the next render.
      }
      lastScrolledShaRef.current = scrollToSha
      return
    }
    if (hasMore && onLoadMore && !loadingMore) onLoadMore()
  }, [scrollToSha, graphNodes, hasMore, onLoadMore, loadingMore])

  if (graphNodes.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 13, color: theme.text.muted }}>No commits found.</Text>
      </View>
    )
  }

  const renderItem: FlatListProps<GraphNode>['renderItem'] = ({ item }) => {
    const sha = item.commit.hash
    return (
      <CommitGraphRow
        node={item}
        isSelected={selectedCommitSha === sha}
        onPress={() => {
          onSelectCommit?.(sha)
          if (sha !== 'UNCOMMITTED') onSelectBranchBySha?.(sha)
        }}
      />
    )
  }

  return (
    <FlatList
      ref={listRef}
      data={graphNodes}
      keyExtractor={(n) => n.commit.hash}
      renderItem={renderItem}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!onLoadMore || !hasMore || loadingMore) return
        onLoadMore()
      }}
      // FlatList of fixed-height rows — declaring `getItemLayout` is required
      // for `scrollToIndex` to work without the user scrolling first.
      getItemLayout={(_, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
      ListFooterComponent={
        <View style={{ padding: 8, alignItems: 'center' }}>
          {loadingMore ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              Loading more commits…
            </Text>
          ) : !hasMore && commits.length > 0 ? (
            <Text style={{ fontSize: 10, color: theme.text.muted }}>
              — End of history —
            </Text>
          ) : null}
        </View>
      }
    />
  )
}

function CommitGraphRow({
  node,
  isSelected,
  onPress,
}: {
  node: GraphNode
  isSelected: boolean
  onPress: () => void
}) {
  const { theme } = useNativeTheme()
  const { commit, nodeLane, incomingLanes, outgoingLanes } = node
  const halfH = ROW_HEIGHT / 2
  const getColor = (i: number) => LANE_COLORS[i % LANE_COLORS.length]
  const isUncommitted = commit.hash === 'UNCOMMITTED'
  const graphWidth = Math.max(LANE_WIDTH * 2, (node.maxLanes + 1) * LANE_WIDTH + 4)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'stretch',
        height: ROW_HEIGHT,
        backgroundColor: isSelected
          ? theme.accent.primary + '22'
          : pressed
            ? theme.surface.hover
            : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      })}
    >
      <View style={{ width: graphWidth, height: ROW_HEIGHT }}>
        {!isUncommitted ? (
          <Svg width={graphWidth} height={ROW_HEIGHT}>
            {incomingLanes.map((hash, i) => {
              if (hash === commit.hash) {
                return (
                  <Path
                    key={`in-${i}`}
                    d={`M ${i * LANE_WIDTH + LANE_WIDTH} 0 Q ${i * LANE_WIDTH + LANE_WIDTH} ${halfH} ${
                      nodeLane * LANE_WIDTH + LANE_WIDTH
                    } ${halfH}`}
                    fill="none"
                    stroke={getColor(i)}
                    strokeWidth={2}
                  />
                )
              } else if (hash !== null) {
                return (
                  <Line
                    key={`in-${i}`}
                    x1={i * LANE_WIDTH + LANE_WIDTH}
                    y1={0}
                    x2={i * LANE_WIDTH + LANE_WIDTH}
                    y2={halfH}
                    stroke={getColor(i)}
                    strokeWidth={2}
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
                    <Path
                      key={`out-${i}`}
                      d={`M ${nodeLane * LANE_WIDTH + LANE_WIDTH} ${halfH} Q ${
                        i * LANE_WIDTH + LANE_WIDTH
                      } ${halfH} ${i * LANE_WIDTH + LANE_WIDTH} ${ROW_HEIGHT}`}
                      fill="none"
                      stroke={getColor(i)}
                      strokeWidth={2}
                    />
                  )
                }
                return (
                  <Line
                    key={`out-${i}`}
                    x1={i * LANE_WIDTH + LANE_WIDTH}
                    y1={halfH}
                    x2={i * LANE_WIDTH + LANE_WIDTH}
                    y2={ROW_HEIGHT}
                    stroke={getColor(i)}
                    strokeWidth={2}
                  />
                )
              }
              return null
            })}

            <Circle
              cx={nodeLane * LANE_WIDTH + LANE_WIDTH}
              cy={halfH}
              r={RADIUS}
              fill={getColor(nodeLane)}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </Svg>
        ) : null}
      </View>

      {isUncommitted ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontStyle: 'italic',
              fontWeight: '600',
              color: theme.text.secondary,
            }}
          >
            Uncommitted changes
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
            {commit.refs.map((r, i) => (
              <RefBadge key={`${r.type}-${r.name}-${i}`} type={r.type} name={r.name} />
            ))}
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ flexShrink: 1, fontSize: 12, color: theme.text.primary }}
            >
              {commit.subject}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 10, color: theme.text.muted }}
          >
            {commit.authorDate ? `${formatCommitDate(commit.authorDate)} · ` : ''}
            <Text style={{ fontFamily: 'Menlo' }}>{commit.hash.slice(0, 7)}</Text>
            {commit.authorName ? ` · ${commit.authorName}` : ''}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const REF_PALETTE: Record<
  'branch' | 'remote' | 'tag' | 'HEAD',
  { bg: string; fg: string; bd: string }
> = {
  HEAD: { bg: '#e0f2fe', fg: '#075985', bd: '#bae6fd' },
  branch: { bg: '#dcfce7', fg: '#166534', bd: '#bbf7d0' },
  remote: { bg: '#ffedd5', fg: '#9a3412', bd: '#fed7aa' },
  tag: { bg: '#f3f4f6', fg: '#374151', bd: '#e5e7eb' },
}

function RefBadge({ type, name }: { type: 'branch' | 'remote' | 'tag' | 'HEAD'; name: string }) {
  const palette = REF_PALETTE[type]
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: palette.bd,
        backgroundColor: palette.bg,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
      }}
    >
      <Text
        style={{ fontSize: 9, color: palette.fg, textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        {name}
      </Text>
    </View>
  )
}

export default CommitGraph
