import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import {
  Text,
  View,
  type FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import {
  listDragSlot,
  listMoveTarget,
  listRowShift,
  listSettleOffset,
  listSlotTops,
} from '../../../headless/utils/listDragSlots'
import type { ListDropTarget } from '../../../headless/utils/listReorderTypes'
import { nativeRadii, nativeShadows, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  DRAG_ESTIMATED_ROW_HEIGHT,
  DRAG_LIFT_AFTER_MS,
  DRAG_LIFTED_SCALE,
  DRAG_SCROLL_EDGE,
  DRAG_SCROLL_MAX_STEP,
  DRAG_SLIDE_MS,
} from './dragReorderListConstants'

export interface DragReorderListProps<T> extends Omit<
  FlatListProps<T>,
  | 'data'
  | 'renderItem'
  | 'keyExtractor'
  | 'onScroll'
  | 'scrollEnabled'
  | 'ListHeaderComponent'
  | 'CellRendererComponent'
> {
  data: readonly T[]
  keyOf: (item: T) => string
  renderItem: (item: T, index: number) => ReactElement
  /** Whether a row can be lifted — off while the list shows an order that is not its own. */
  enabled: boolean
  /** A row was dropped beside another: save the move. The list shows the new order meanwhile. */
  onMove: (id: string, target: ListDropTarget) => Promise<void>
  /** A row was just lifted — e.g. for a haptic tap. */
  onLift?: () => void
}

type DragState = {
  heights: SharedValue<number[]>
  dragIndex: SharedValue<number>
  slot: SharedValue<number>
  dragY: SharedValue<number>
  ghostShown: SharedValue<number>
  updateSlot: () => void
  settle: () => void
  lift: (index: number) => void
}

/**
 * A list whose rows are put in order by hand: press and hold a row until it
 * lifts, then drag it — its neighbours slide aside, and the list scrolls when
 * the row is held at its top or bottom edge. Dropped, the row settles into its
 * slot, the list shows the new order at once and `onMove` saves it.
 *
 * The lifted row is drawn as a copy floating over the list, so it stays above
 * its neighbours on both platforms. Requires a `GestureHandlerRootView` at the
 * app root.
 */
export default function DragReorderList<T>({
  data,
  keyOf,
  renderItem,
  enabled,
  onMove,
  onLift,
  onLayout,
  onContentSizeChange,
  ...listProps
}: DragReorderListProps<T>) {
  const { theme } = useNativeTheme()
  const listRef = useAnimatedRef<FlatList<T>>()
  const [pending, setPending] = useState<readonly T[] | null>(null)
  const [lifted, setLifted] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const shown = pending ?? data

  useEffect(() => setPending(null), [data])

  const heightsRef = useRef<number[]>([])
  const heights = useSharedValue<number[]>([])
  const dragIndex = useSharedValue(-1)
  const slot = useSharedValue(-1)
  const dragY = useSharedValue(0)
  const ghostBase = useSharedValue(0)
  const ghostShown = useSharedValue(0)
  const dragging = useSharedValue(0)
  const scrollY = useSharedValue(0)
  const liftScrollY = useSharedValue(0)
  const viewportHeight = useSharedValue(0)
  const contentHeight = useSharedValue(0)

  const publishHeights = useCallback(() => {
    const known = heightsRef.current.filter((h) => h > 0)
    const estimate =
      known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : DRAG_ESTIMATED_ROW_HEIGHT
    heights.value = Array.from(
      { length: shown.length },
      (_, i) => heightsRef.current[i] || estimate,
    )
  }, [heights, shown.length])

  useEffect(publishHeights, [publishHeights])

  const measureRow = useCallback(
    (index: number, height: number) => {
      if (heightsRef.current[index] === height) return
      heightsRef.current[index] = height
      publishHeights()
    },
    [publishHeights],
  )

  const reset = useCallback(() => {
    dragIndex.value = -1
    slot.value = -1
    dragY.value = 0
    ghostShown.value = 0
    dragging.value = 0
    setLifted(null)
  }, [dragIndex, slot, dragY, ghostShown, dragging])

  useLayoutEffect(reset, [shown, reset])

  const ids = useMemo(() => shown.map(keyOf), [shown, keyOf])

  const drop = useCallback(
    (from: number, to: number) => {
      const target = listMoveTarget(ids, from, to)
      if (!target) {
        reset()
        return
      }
      const next = [...shown]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      setPending(next)
      setSaving(true)
      onMove(ids[from], target)
        .catch(() => setPending(null))
        .finally(() => setSaving(false))
    },
    [ids, shown, onMove, reset],
  )

  const lift = useCallback(
    (index: number) => {
      setLifted(index)
      onLift?.()
    },
    [onLift],
  )

  const updateSlot = useCallback(() => {
    'worklet'
    const from = dragIndex.value
    if (from < 0) return
    const h = heights.value
    const center =
      listSlotTops(h)[from] + h[from] / 2 + dragY.value + scrollY.value - liftScrollY.value
    slot.value = listDragSlot(h, from, center)
  }, [dragIndex, heights, dragY, scrollY, liftScrollY, slot])

  const settle = useCallback(() => {
    'worklet'
    const from = dragIndex.value
    const to = slot.value
    dragging.value = 0
    const h = heights.value
    const restingTop = listSlotTops(h)[from] + listSettleOffset(h, from, to) - scrollY.value
    dragY.value = withTiming(restingTop - ghostBase.value, { duration: DRAG_SLIDE_MS }, () => {
      runOnJS(drop)(from, to)
    })
  }, [dragIndex, slot, dragging, heights, scrollY, dragY, ghostBase, drop])

  const startDrag = useCallback(
    (index: number) => {
      'worklet'
      dragIndex.value = index
      slot.value = index
      dragY.value = 0
      liftScrollY.value = scrollY.value
      ghostBase.value = listSlotTops(heights.value)[index] - scrollY.value
      dragging.value = 1
      runOnJS(lift)(index)
    },
    [dragIndex, slot, dragY, liftScrollY, scrollY, ghostBase, heights, dragging, lift],
  )

  const state = useMemo<DragState>(
    () => ({ heights, dragIndex, slot, dragY, ghostShown, updateSlot, settle, lift: startDrag }),
    [heights, dragIndex, slot, dragY, ghostShown, updateSlot, settle, startDrag],
  )

  useFrameCallback(() => {
    if (dragging.value === 0) return
    const from = dragIndex.value
    const h = heights.value
    const top = ghostBase.value + dragY.value
    const bottom = top + h[from]
    let step = 0
    if (top < DRAG_SCROLL_EDGE) {
      step = -Math.min(DRAG_SCROLL_MAX_STEP, (DRAG_SCROLL_EDGE - top) / 4)
    } else if (bottom > viewportHeight.value - DRAG_SCROLL_EDGE) {
      step = Math.min(DRAG_SCROLL_MAX_STEP, (bottom - viewportHeight.value + DRAG_SCROLL_EDGE) / 4)
    }
    if (step === 0) return
    const maxScroll = Math.max(0, contentHeight.value - viewportHeight.value)
    const next = Math.min(maxScroll, Math.max(0, scrollY.value + step))
    if (next === scrollY.value) return
    scrollTo(listRef, 0, next, false)
    scrollY.value = next
    updateSlot()
  })

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y
  })

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ghostBase.value + dragY.value }, { scale: DRAG_LIFTED_SCALE }],
  }))

  const canLift = enabled && !saving

  const renderRow = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) => (
      <DragRow index={index} canLift={canLift} state={state} onMeasure={measureRow}>
        {renderItem(item, index)}
      </DragRow>
    ),
    [canLift, state, measureRow, renderItem],
  )

  const liftedItem = lifted !== null ? shown[lifted] : undefined

  return (
    <View style={{ flex: 1 }}>
      <Animated.FlatList
        {...listProps}
        ref={listRef}
        data={shown as T[]}
        keyExtractor={keyOf}
        renderItem={renderRow}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={lifted === null}
        removeClippedSubviews={false}
        onLayout={(e: LayoutChangeEvent) => {
          viewportHeight.value = e.nativeEvent.layout.height
          onLayout?.(e)
        }}
        onContentSizeChange={(width: number, height: number) => {
          contentHeight.value = height
          onContentSizeChange?.(width, height)
        }}
      />
      {liftedItem !== undefined && lifted !== null ? (
        <Animated.View
          pointerEvents="none"
          onLayout={() => {
            ghostShown.value = 1
          }}
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              ...nativeShadows[3],
            },
            ghostStyle,
          ]}
        >
          {renderItem(liftedItem, lifted)}
        </Animated.View>
      ) : null}
      {saving ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            right: nativeSpace[4],
            bottom: nativeSpace[4],
            paddingHorizontal: nativeSpace[4],
            paddingVertical: nativeSpace[2],
            borderRadius: nativeRadii.round,
            backgroundColor: theme.surface.raised,
            borderWidth: 1,
            borderColor: theme.border.subtle,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>Reordering…</Text>
        </View>
      ) : null}
    </View>
  )
}

function DragRow({
  index,
  canLift,
  state,
  onMeasure,
  children,
}: {
  index: number
  canLift: boolean
  state: DragState
  onMeasure: (index: number, height: number) => void
  children: ReactElement
}) {
  const { heights, dragIndex, slot, dragY, ghostShown, updateSlot, settle, lift } = state

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canLift)
        .activateAfterLongPress(DRAG_LIFT_AFTER_MS)
        .onStart(() => {
          lift(index)
        })
        .onUpdate((event) => {
          if (dragIndex.value !== index) return
          dragY.value = event.translationY
          updateSlot()
        })
        .onFinalize(() => {
          if (dragIndex.value !== index) return
          settle()
        }),
    [canLift, index, lift, dragIndex, dragY, updateSlot, settle],
  )

  const style = useAnimatedStyle(() => {
    const from = dragIndex.value
    if (from < 0) return { opacity: 1, transform: [{ translateY: 0 }] }
    if (from === index) {
      return { opacity: ghostShown.value === 1 ? 0 : 1, transform: [{ translateY: 0 }] }
    }
    const shift = listRowShift(index, from, slot.value, heights.value[from])
    return {
      opacity: 1,
      transform: [{ translateY: withTiming(shift, { duration: DRAG_SLIDE_MS }) }],
    }
  })

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={style}
        onLayout={(e: LayoutChangeEvent) => onMeasure(index, e.nativeEvent.layout.height)}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  )
}
