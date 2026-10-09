import { useState } from 'react'
import { Image, Text, View, useWindowDimensions } from 'react-native'
import { DESIGN_TEXT, designItemViewKind, type DesignCompareBaseline } from '../../../headless'
import type { DesignItem } from '../../../headless/api'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Slider } from '../../primitives/Slider'
import DesignItemBody from './DesignItemBody'
import { useDesignHost } from './DesignHostContext'

export type DesignCompareOverlayProps = {
  /** The built version to compare; `undefined` keeps the compare closed. */
  built: DesignItem | undefined
  baseline: DesignCompareBaseline | undefined
  srcOf: (itemId: string) => string | undefined
  onClose: () => void
}

type Mode = 'side' | 'slider'

function Pane({
  label,
  item,
  src,
  divided,
}: {
  label: string
  item: DesignItem
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
        <Text style={{ fontWeight: '600', color: theme.text.primary }}>{label}</Text> · {item.name}
      </Text>
      <View style={{ flex: 1, minHeight: 0 }}>
        <DesignItemBody item={item} src={src} />
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
 * Native peer of web's `DesignCompareOverlay`: a built version against what it
 * is compared with — the approved design when that is an image, else the built
 * version before it — one beside the other (stacked on a phone held upright),
 * or, for two images, one over the other with a slider.
 */
export default function DesignCompareOverlay({
  built,
  baseline,
  srcOf,
  onClose,
}: DesignCompareOverlayProps) {
  const { topInset, bottomInset } = useDesignHost()
  const { width, height } = useWindowDimensions()
  const [mode, setMode] = useState<Mode>('side')
  const open = built !== undefined && baseline !== undefined
  const canSlide =
    open && designItemViewKind(built) === 'image' && designItemViewKind(baseline.item) === 'image'
  const beforeSrc = baseline ? srcOf(baseline.item.id) : undefined
  const afterSrc = built ? srcOf(built.id) : undefined
  const shown: Mode = canSlide ? mode : 'side'
  const across = width > height
  return (
    <FullScreenOverlay
      isOpen={open}
      onClose={onClose}
      {...(built ? { title: `${DESIGN_TEXT.compare} · ${built.name}` } : {})}
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
            <Pane
              label={baseline.label}
              item={baseline.item}
              src={beforeSrc}
              divided={across ? 'right' : 'bottom'}
            />
            <Pane label="Built version" item={built} src={afterSrc} divided={undefined} />
          </View>
        )
      ) : null}
    </FullScreenOverlay>
  )
}
