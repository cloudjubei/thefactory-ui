import { useEffect, useMemo, useRef } from 'react'
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import {
  buildColumns,
  buildYearGroups,
  bucketStart,
  columnIndex,
  statusKey,
  type Bucket,
  type StoryFeatureEvent,
  type StatusSemanticKey,
  type TimelineColumn,
} from '../../../headless'
import { nativePalette } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/**
 * Native peer of web's `ProjectTimelineView` body. Renders the same
 * Gantt-style grid (year strip + date strip + one row per story) using a
 * synced pair of horizontal `ScrollView`s. Story rows go through a
 * `FlatList` so hundreds of stories stay cheap to scroll — only the rows on
 * screen pay layout cost. Inside a row, events are absolute-positioned
 * `View`s at `columnIndex(event.ts) * columnWidth`, which keeps each event
 * a constant 3 views regardless of the bucket / zoom.
 */
export interface TimelineGanttStory {
  /** Story identifier — also used as the `FlatList` key. */
  storyId: string
  title: string
  events: ReadonlyArray<StoryFeatureEvent>
}

export interface TimelineGanttLabel {
  id: string
  label: string
  ts: string
}

export interface TimelineGanttProps {
  stories: ReadonlyArray<TimelineGanttStory>
  /** Single-project mode only — pass `[]` when in all-projects mode. */
  labels: ReadonlyArray<TimelineGanttLabel>
  bucket: Bucket
  /** Leftmost column's start (snapped to bucket start by the caller). */
  originDate: Date
  /** Number of columns the body covers. */
  columnCount: number
  /** Pixel width of one column — matches the active bucket. */
  columnWidth: number
  rowHeight: number
  /** Width of the left "story title" sticky column. */
  leftColumnWidth?: number
  onSelectEvent: (event: StoryFeatureEvent) => void
  onSelectLabel: (labelId: string) => void
  /**
   * Signal: every change of this number triggers a horizontal scroll to
   * today's column. The value itself is opaque — bump it (e.g. `Date.now()`)
   * to request a new scroll-to-today.
   */
  scrollToToday?: number
}

const YEAR_STRIP_HEIGHT = 22
const DATE_STRIP_HEIGHT = 34
const HEADER_HEIGHT = YEAR_STRIP_HEIGHT + DATE_STRIP_HEIGHT
const EVENT_BAR_HEIGHT = 22
const LABEL_STRIP_HEIGHT = 26

// Status palette tuned for small horizontal bars on a phone. Matches web's
// emerald/purple stories vs features split plus the StatusControl semantic
// colours — `working` / `done` / `stuck` / `onhold` / `queued`.
const SEMANTIC_FILL: Record<StatusSemanticKey, { bg: string; border: string; fg: string }> = {
  queued: {
    bg: nativePalette.gray[100],
    fg: nativePalette.gray[800],
    border: nativePalette.gray[400],
  },
  working: {
    bg: nativePalette.orange[100],
    fg: nativePalette.orange[800],
    border: nativePalette.orange[500],
  },
  done: {
    bg: nativePalette.green[100],
    fg: nativePalette.green[800],
    border: nativePalette.green[500],
  },
  stuck: { bg: nativePalette.red[100], fg: nativePalette.red[800], border: nativePalette.red[500] },
  onhold: {
    bg: nativePalette.purple[100],
    fg: nativePalette.purple[800],
    border: nativePalette.purple[500],
  },
}

const FEATURE_DEFAULT = {
  bg: nativePalette.purple[100],
  fg: nativePalette.purple[800],
  border: nativePalette.purple[500],
}
const STORY_DEFAULT = {
  bg: nativePalette.green[100],
  fg: nativePalette.green[800],
  border: nativePalette.green[500],
}

function colorsFor(event: StoryFeatureEvent) {
  if (event.status) {
    const key = (() => {
      try {
        return statusKey(event.status)
      } catch {
        return 'queued' as StatusSemanticKey
      }
    })()
    return SEMANTIC_FILL[key]
  }
  return event.kind === 'feature' ? FEATURE_DEFAULT : STORY_DEFAULT
}

interface RenderableEvent {
  event: StoryFeatureEvent
  colIndex: number
  leftPx: number
}

function buildRenderableEvents(
  story: TimelineGanttStory,
  bucket: Bucket,
  originDate: Date,
  columnCount: number,
  columnWidth: number,
): RenderableEvent[] {
  const out: RenderableEvent[] = []
  for (const event of story.events) {
    const idx = columnIndex(event.ts, bucket, originDate)
    if (idx < 0 || idx >= columnCount) continue
    out.push({ event, colIndex: idx, leftPx: idx * columnWidth })
  }
  return out
}

export function TimelineGantt({
  stories,
  labels,
  bucket,
  originDate,
  columnCount,
  columnWidth,
  rowHeight,
  leftColumnWidth = 96,
  onSelectEvent,
  onSelectLabel,
  scrollToToday,
}: TimelineGanttProps) {
  const { theme } = useNativeTheme()
  const headerScrollRef = useRef<ScrollView>(null)
  const bodyScrollRef = useRef<ScrollView>(null)
  const labelStripScrollRef = useRef<ScrollView>(null)

  const columns = useMemo(
    () => buildColumns(originDate, bucket, columnCount),
    [originDate, bucket, columnCount],
  )
  const yearGroups = useMemo(() => buildYearGroups(columns), [columns])
  const totalWidth = columnCount * columnWidth

  const todayCol = useMemo(() => {
    const now = new Date()
    const start = bucketStart(now, bucket)
    return columnIndex(start, bucket, originDate)
  }, [bucket, originDate])

  // Scroll-to-today signal: every distinct value triggers exactly one scroll.
  const lastScrollSignalRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (scrollToToday === undefined) return
    if (lastScrollSignalRef.current === scrollToToday) return
    lastScrollSignalRef.current = scrollToToday
    const target = Math.max(0, todayCol * columnWidth - columnWidth)
    headerScrollRef.current?.scrollTo({ x: target, animated: false })
    bodyScrollRef.current?.scrollTo({ x: target, animated: false })
    labelStripScrollRef.current?.scrollTo({ x: target, animated: false })
  }, [scrollToToday, todayCol, columnWidth])

  // Group labels by column index so the strip is cheap to lay out.
  const labelsByColumn = useMemo(() => {
    const out = new Map<number, TimelineGanttLabel[]>()
    for (const l of labels) {
      const idx = columnIndex(l.ts, bucket, originDate)
      if (idx < 0 || idx >= columnCount) continue
      const list = out.get(idx) ?? []
      list.push(l)
      out.set(idx, list)
    }
    return out
  }, [labels, bucket, originDate, columnCount])

  /** Keep header strip + body horizontal scroll in lockstep with the active scroller. */
  const onBodyScroll = (x: number) => {
    headerScrollRef.current?.scrollTo({ x, animated: false })
    labelStripScrollRef.current?.scrollTo({ x, animated: false })
  }
  const onHeaderScroll = (x: number) => {
    bodyScrollRef.current?.scrollTo({ x, animated: false })
    labelStripScrollRef.current?.scrollTo({ x, animated: false })
  }
  const onLabelStripScroll = (x: number) => {
    bodyScrollRef.current?.scrollTo({ x, animated: false })
    headerScrollRef.current?.scrollTo({ x, animated: false })
  }

  return (
    <View className="flex-1">
      {/* Header: year strip + date strip — horizontally scrollable and synced. */}
      <View
        style={{
          height: HEADER_HEIGHT,
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.raised,
        }}
      >
        <View
          style={{
            width: leftColumnWidth,
            borderRightWidth: 1,
            borderRightColor: theme.border.subtle,
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.muted }}>
            Stories
          </Text>
        </View>
        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => onHeaderScroll(e.nativeEvent.contentOffset.x)}
        >
          <View style={{ width: totalWidth }}>
            {/* Year strip */}
            <View
              style={{
                height: YEAR_STRIP_HEIGHT,
                flexDirection: 'row',
                position: 'relative',
              }}
            >
              {yearGroups.map((g, i) => (
                <View
                  key={`${g.label}-${i}`}
                  style={{
                    position: 'absolute',
                    left: g.startIdx * columnWidth,
                    width: g.len * columnWidth,
                    height: YEAR_STRIP_HEIGHT,
                    borderLeftWidth: i > 0 ? 1 : 0,
                    borderLeftColor: theme.border.subtle,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      letterSpacing: 0.5,
                      color: theme.text.primary,
                    }}
                  >
                    {g.label}
                  </Text>
                </View>
              ))}
            </View>
            {/* Date strip */}
            <View style={{ height: DATE_STRIP_HEIGHT, flexDirection: 'row' }}>
              {columns.map((col) => (
                <DateStripCell
                  key={col.key}
                  col={col}
                  columnWidth={columnWidth}
                  isToday={col.index === todayCol}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Optional label strip: above the body, synced horizontally. */}
      {labels.length > 0 ? (
        <View
          style={{
            height: LABEL_STRIP_HEIGHT,
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          <View
            style={{
              width: leftColumnWidth,
              borderRightWidth: 1,
              borderRightColor: theme.border.subtle,
              justifyContent: 'center',
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.muted }}>
              Labels
            </Text>
          </View>
          <ScrollView
            ref={labelStripScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => onLabelStripScroll(e.nativeEvent.contentOffset.x)}
          >
            <View style={{ width: totalWidth, height: LABEL_STRIP_HEIGHT }}>
              {Array.from(labelsByColumn.entries()).map(([idx, ls]) => (
                <Pressable
                  key={`label-${idx}`}
                  onPress={() => ls[0] && onSelectLabel(ls[0].id)}
                  style={{
                    position: 'absolute',
                    left: idx * columnWidth + 2,
                    top: 3,
                    height: LABEL_STRIP_HEIGHT - 6,
                    maxWidth: Math.max(40, columnWidth - 4),
                    paddingHorizontal: 6,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: nativePalette.orange[500],
                    backgroundColor: nativePalette.orange[100],
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 10, fontWeight: '600', color: nativePalette.orange[800] }}
                  >
                    {ls.length === 1 ? ls[0].label : `${ls[0].label} +${ls.length - 1}`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {/* Body: vertical FlatList for the rows, each row is its own horizontal scroller-synced view. */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sticky left column listing story titles. */}
        <View
          style={{
            width: leftColumnWidth,
            borderRightWidth: 1,
            borderRightColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          <FlatList
            data={stories}
            keyExtractor={(s) => s.storyId}
            initialNumToRender={20}
            windowSize={11}
            removeClippedSubviews
            renderItem={({ item }) => (
              <View
                style={{
                  height: rowHeight,
                  paddingHorizontal: 8,
                  justifyContent: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border.subtle,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 11, color: theme.text.primary }}
                >
                  {item.title || '(untitled)'}
                </Text>
              </View>
            )}
          />
        </View>
        {/* Horizontal scroller for the grid. */}
        <ScrollView
          ref={bodyScrollRef}
          horizontal
          showsHorizontalScrollIndicator
          scrollEventThrottle={16}
          onScroll={(e) => onBodyScroll(e.nativeEvent.contentOffset.x)}
        >
          <View style={{ width: totalWidth, flex: 1 }}>
            <FlatList
              data={stories}
              keyExtractor={(s) => s.storyId}
              initialNumToRender={20}
              windowSize={11}
              removeClippedSubviews
              renderItem={({ item }) => (
                <GridRow
                  story={item}
                  bucket={bucket}
                  originDate={originDate}
                  columnCount={columnCount}
                  columnWidth={columnWidth}
                  rowHeight={rowHeight}
                  todayCol={todayCol}
                  onSelectEvent={onSelectEvent}
                />
              )}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

function DateStripCell({
  col,
  columnWidth,
  isToday,
}: {
  col: TimelineColumn
  columnWidth: number
  isToday: boolean
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        width: columnWidth,
        height: DATE_STRIP_HEIGHT,
        borderLeftWidth: col.index > 0 ? 1 : 0,
        borderLeftColor: theme.border.subtle,
        backgroundColor: isToday
          ? `${theme.accent.primary}1A` // ~10% alpha
          : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          fontWeight: isToday ? '700' : '500',
          color: isToday ? theme.accent.primary : theme.text.primary,
        }}
      >
        {col.label}
      </Text>
    </View>
  )
}

function GridRow({
  story,
  bucket,
  originDate,
  columnCount,
  columnWidth,
  rowHeight,
  todayCol,
  onSelectEvent,
}: {
  story: TimelineGanttStory
  bucket: Bucket
  originDate: Date
  columnCount: number
  columnWidth: number
  rowHeight: number
  todayCol: number
  onSelectEvent: (event: StoryFeatureEvent) => void
}) {
  const { theme } = useNativeTheme()
  const renderable = useMemo(
    () => buildRenderableEvents(story, bucket, originDate, columnCount, columnWidth),
    [story, bucket, originDate, columnCount, columnWidth],
  )

  return (
    <View
      style={{
        height: rowHeight,
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: theme.border.subtle,
      }}
    >
      {/* Today's column highlight */}
      {todayCol >= 0 && todayCol < columnCount ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: todayCol * columnWidth,
            width: columnWidth,
            height: rowHeight,
            backgroundColor: `${theme.accent.primary}0F`,
          }}
        />
      ) : null}
      {/* Today's vertical line */}
      {todayCol >= 0 && todayCol < columnCount ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: todayCol * columnWidth + columnWidth / 2,
            width: 1,
            height: rowHeight,
            backgroundColor: theme.accent.primary,
            opacity: 0.6,
          }}
        />
      ) : null}
      {renderable.map(({ event, leftPx }, i) => {
        const colors = colorsFor(event)
        const label = event.title || (event.kind === 'feature' ? 'Feature' : 'Story')
        return (
          <Pressable
            key={`${event.kind}-${'featureId' in event ? event.featureId : event.storyId}-${i}`}
            onPress={() => onSelectEvent(event)}
            style={{
              position: 'absolute',
              left: leftPx + 2,
              top: (rowHeight - EVENT_BAR_HEIGHT) / 2,
              height: EVENT_BAR_HEIGHT,
              maxWidth: Math.max(28, columnWidth - 4),
              paddingHorizontal: 6,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.bg,
              justifyContent: 'center',
            }}
          >
            <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: colors.fg }}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default TimelineGantt
