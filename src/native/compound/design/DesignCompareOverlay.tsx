import { useState } from 'react'
import { Image, Text, View, useWindowDimensions } from 'react-native'
import { DESIGN_TEXT, designViewKind, type DesignShown } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Slider } from '../../primitives/Slider'
import DesignFileBody from './DesignFileBody'
import { useDesignHost } from './DesignHostContext'

/** One side of a compare: a file and what it is. */
export type DesignCompareSide = { shown: DesignShown; label: string }

export type DesignCompareOverlayProps = {
  /** What is current; with `proposed`, `undefined` keeps the compare closed. */
  current: DesignCompareSide | undefined
  proposed: DesignCompareSide | undefined
  srcOf: (shown: DesignShown) => string | undefined
  onClose: () => void
}

type Mode = 'side' | 'slider'

function Pane({
  side,
  src,
  divided,
}: {
  side: DesignCompareSide
  src: string | undefined
  divided: 'right' | 'bottom' | undefined
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        ...(divided === 'right'
          ? { borderRightWidth: 1, borderRightColor: theme.border.subtle }
          : {}),
        ...(divided === 'bottom'
          ? { borderBottomWidth: 1, borderBottomColor: theme.border.subtle }
          : {}),
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          color: theme.text.secondary,
          paddingHorizontal: nativeSpace[6],
          paddingVertical: nativeSpace[3],
        }}
      >
        <Text style={{ fontWeight: '600', color: theme.text.primary }}>{side.label}</Text> ·{' '}
        {side.shown.name}
      </Text>
      <View style={{ flex: 1, minHeight: 0 }}>
        <DesignFileBody shown={side.shown} src={src} />
      </View>
    </View>
  )
}

function SliderCompare({ before, after }: { before: string; after: string }) {
  const { theme } = useNativeTheme()
  const [at, setAt] = useState(50)
  const [width, setWidth] = useState(0)
  const cut = (width * at) / 100
  return (
    <View style={{ flex: 1, minHeight: 0, padding: nativeSpace[6], gap: nativeSpace[6] }}>
      <View
        style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <Image
          source={{ uri: before }}
          resizeMode="contain"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: width || '100%' }}
        />
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: cut,
            right: 0,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: after }}
            resizeMode="contain"
            style={{ position: 'absolute', top: 0, bottom: 0, left: -cut, width: width || '100%' }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: cut - 1,
            width: 2,
            backgroundColor: theme.accent.primary,
          }}
        />
      </View>
      <Slider value={at} min={0} max={100} onChange={setAt} />
    </View>
  )
}

/**
 * Native peer of web's `DesignCompareOverlay`: a proposed look beside what is
 * current — one beside the other (stacked on a phone held upright), or, for two
 * images, one over the other with a slider.
 */
export default function DesignCompareOverlay({
  current,
  proposed,
  srcOf,
  onClose,
}: DesignCompareOverlayProps) {
  const { topInset, bottomInset } = useDesignHost()
  const { width, height } = useWindowDimensions()
  const [mode, setMode] = useState<Mode>('side')
  const open = current !== undefined && proposed !== undefined
  const canSlide =
    open &&
    designViewKind(current.shown.source) === 'image' &&
    designViewKind(proposed.shown.source) === 'image'
  const beforeSrc = current ? srcOf(current.shown) : undefined
  const afterSrc = proposed ? srcOf(proposed.shown) : undefined
  const shown: Mode = canSlide ? mode : 'side'
  const across = width > height
  return (
    <FullScreenOverlay
      isOpen={open}
      onClose={onClose}
      {...(proposed ? { title: `${DESIGN_TEXT.compareWithCurrent} · ${proposed.shown.name}` } : {})}
      {...(canSlide
        ? {
            headerActions: (
              <SegmentedControl
                size="sm"
                ariaLabel="Compare how"
                value={shown}
                onChange={(v) => setMode(v as Mode)}
                options={[
                  { value: 'side', label: DESIGN_TEXT.sideBySide },
                  { value: 'slider', label: DESIGN_TEXT.slider },
                ]}
              />
            ),
          }
        : {})}
      {...(topInset !== undefined ? { topInset } : {})}
      {...(bottomInset !== undefined ? { bottomInset } : {})}
    >
      {open ? (
        shown === 'slider' && beforeSrc && afterSrc ? (
          <SliderCompare before={beforeSrc} after={afterSrc} />
        ) : (
          <View style={{ flex: 1, minHeight: 0, flexDirection: across ? 'row' : 'column' }}>
            <Pane side={current} src={beforeSrc} divided={across ? 'right' : 'bottom'} />
            <Pane side={proposed} src={afterSrc} divided={undefined} />
          </View>
        )
      ) : null}
    </FullScreenOverlay>
  )
}
