import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'

import {
  screenPairFileStem,
  zoomIn,
  zoomLabel,
  zoomOut,
  type ScreenPair,
} from '../../../../headless'
import { nativePalette, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDownload,
  IconRefresh,
  IconZoomIn,
  IconZoomOut,
} from '../../../icons'
import type { SaveFileHandler } from './signoffTypes'
import { Button } from '../../../primitives/Button'
import FullScreenOverlay from '../../../primitives/FullScreenOverlay'
import SegmentedControl from '../../../primitives/SegmentedControl'
import { Slider } from '../../../primitives/Slider'
import RefChip from '../../chips/RefChip'
import { chipPillStyle, chipPillTextStyle } from '../../chips/pillStyles'

export type ComparisonOverlayProps = {
  pairs: readonly ScreenPair[]
  /** Key of the pair to show; `undefined` keeps the overlay closed. */
  openKey: string | undefined
  onClose: () => void
  baseSha: string | undefined
  headSha: string | undefined
  /** Saves the pair; omitted when the host cannot put a file anywhere. */
  onSaveFile?: SaveFileHandler
}

type Mode = 'mirror' | 'slide'

const BASE_WIDTH = 240
/** Overlay padding, stage padding and the gap between two mirrored frames. */
const MIRROR_CHROME = 16 * 2 + 8 * 2 + 24
/** A phone screenshot, until the real size arrives with the bytes. */
const DEFAULT_ASPECT = 0.5

function Pill({ word }: { word: 'Before' | 'After' }) {
  const { theme } = useNativeTheme()
  return (
    <View style={chipPillStyle(theme)}>
      <Text style={chipPillTextStyle(theme)}>{word}</Text>
    </View>
  )
}

function Caption({ word, sha }: { word: 'Before' | 'After'; sha: string | undefined }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Pill word={word} />
      {sha ? <RefChip kind="commit" value={sha} /> : null}
    </View>
  )
}

function Frame({ src, width }: { src: string | undefined; width: number }) {
  const { theme } = useNativeTheme()
  const [aspect, setAspect] = useState(DEFAULT_ASPECT)
  const height = Math.round(width / aspect)
  return src ? (
    <Image
      source={{ uri: src }}
      resizeMode="contain"
      onLoad={(e) => {
        const { width: w, height: h } = e.nativeEvent.source
        if (w > 0 && h > 0) setAspect(w / h)
      }}
      style={{
        width,
        height,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: '#ffffff',
      }}
    />
  ) : (
    <View
      style={{
        width,
        height,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.muted,
      }}
    />
  )
}

/**
 * The before/after comparison, edge to edge. Two modes for stills — Mirror
 * (both frames, left is always base) and Slide (one frame, a divider reveals
 * the branch) — under ONE shared zoom, so the pair can only ever be compared
 * at the same scale. Diff needs a pixel comparison the backend does not file
 * yet, so it is not offered rather than offered and empty.
 */
export default function ComparisonOverlay({
  pairs,
  openKey,
  onClose,
  baseSha,
  headSha,
  onSaveFile,
}: ComparisonOverlayProps) {
  const { theme } = useNativeTheme()
  const { width: screenWidth } = useWindowDimensions()
  const [mode, setMode] = useState<Mode>('slide')
  const [zoom, setZoom] = useState(1)
  const [slidePct, setSlidePct] = useState(50)
  const [holdBase, setHoldBase] = useState(false)
  const [position, setPosition] = useState(0)

  const isOpen = openKey !== undefined
  const openIndex = useMemo(() => pairs.findIndex((p) => p.key === openKey), [pairs, openKey])

  useEffect(() => {
    if (openIndex >= 0) setPosition(openIndex)
  }, [openIndex])

  const pair = pairs[position]
  // Both mirrored frames must fit at 100% on a phone, and Slide shares the same
  // base so one zoom means one scale in either mode.
  const base = Math.min(BASE_WIDTH, Math.floor((screenWidth - MIRROR_CHROME) / 2))
  const width = Math.round(base * zoom)
  const before = pair?.before?.dataUri
  const after = pair?.after?.dataUri
  const canSlide = Boolean(pair?.before && pair?.after)
  const effectiveMode: Mode = canSlide ? mode : 'mirror'
  const cut = holdBase ? 100 : slidePct
  const step = (d: number) =>
    setPosition((p) => (pairs.length ? (p + d + pairs.length) % pairs.length : 0))
  const heading = pair ? `${String(pair.index).padStart(2, '0')} · ${pair.title}` : ''
  const iconColor = theme.text.primary

  const pairFact =
    pair?.class === 'new'
      ? 'This screen exists only on the branch.'
      : pair?.class === 'removed'
        ? 'This screen exists only on the base.'
        : pair?.class === 'single'
          ? 'A single capture — there is nothing to compare it with.'
          : 'Captured on both the base and the branch.'

  const hint =
    effectiveMode === 'mirror'
      ? 'Both frames are on screen, so there is nothing to flip.'
      : 'Drag the handle, or hold the button to swing it fully to the base.'

  return (
    <FullScreenOverlay isOpen={isOpen} onClose={onClose} hideHeader>
      <View style={{ flex: 1, gap: 12, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary }}
          >
            {heading}
          </Text>
          <SegmentedControl
            size="sm"
            ariaLabel="Comparison mode"
            value={effectiveMode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'mirror', label: 'Mirror' },
              { value: 'slide', label: 'Slide' },
            ]}
          />
          {onSaveFile && pair && (before || after) ? (
            <Button
              variant="secondary"
              size="icon"
              accessibilityLabel="Save this pair"
              onPress={() => {
                const stem = screenPairFileStem(pair)
                if (before) void onSaveFile({ name: `${stem}-before.png`, dataUri: before })
                if (after) void onSaveFile({ name: `${stem}-after.png`, dataUri: after })
              }}
            >
              <IconDownload size={16} color={iconColor} />
            </Button>
          ) : null}
          <Button variant="secondary" size="icon" accessibilityLabel="Close" onPress={onClose}>
            <IconClose size={16} color={iconColor} />
          </Button>
        </View>

        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Zoom out"
            onPress={() => setZoom(zoomOut)}
          >
            <IconZoomOut size={16} color={iconColor} />
          </Button>
          <Text
            style={{
              width: 48,
              textAlign: 'center',
              fontSize: 12,
              fontVariant: ['tabular-nums'],
              color: theme.text.muted,
            }}
          >
            {zoomLabel(zoom)}
          </Text>
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Zoom in"
            onPress={() => setZoom(zoomIn)}
          >
            <IconZoomIn size={16} color={iconColor} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Reset zoom"
            onPress={() => setZoom(1)}
          >
            <IconRefresh size={16} color={iconColor} />
          </Button>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: 24,
            }}
          >
            {effectiveMode === 'mirror' ? (
              <>
                {pair?.before || !pair?.after ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Frame src={before} width={width} />
                    <Caption word="Before" sha={baseSha} />
                  </View>
                ) : null}
                {pair?.after ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Frame src={after} width={width} />
                    <Caption word="After" sha={headSha} />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={{ width }}>
                  <Frame src={before} width={width} />
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      right: 0,
                      left: `${cut}%`,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ position: 'absolute', top: 0, left: -(width * cut) / 100 }}>
                      <Frame src={after} width={width} />
                    </View>
                  </View>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${cut}%`,
                      width: 2,
                      marginLeft: -1,
                      backgroundColor: nativePalette.pink[600],
                    }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </ScrollView>

        {effectiveMode === 'slide' ? (
          // OUTSIDE both scrollers on purpose: the reveal handle is a PanResponder,
          // and inside the horizontal ScrollView the scroller claimed every drag as
          // soon as the zoomed stage overflowed, so the divider stopped moving.
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Pill word="Before" />
              {baseSha ? <RefChip kind="commit" value={baseSha} /> : null}
              <Text style={{ fontSize: 12, color: theme.text.muted }}>drag</Text>
              <Pill word="After" />
              {headSha ? <RefChip kind="commit" value={headSha} /> : null}
            </View>
            <View style={{ width: Math.min(width, screenWidth - 32) }}>
              <Slider value={slidePct} min={0} max={100} onChange={setSlidePct} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hold to show the base"
              onPressIn={() => setHoldBase(true)}
              onPressOut={() => setHoldBase(false)}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: nativeRadii[2],
                borderWidth: 1,
                borderColor: pressed ? theme.accent.primary : theme.border.default,
                backgroundColor: theme.surface.raised,
              })}
            >
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>Hold for base</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ gap: 2 }}>
          {/* What this pair IS comes first — the mode hint is secondary. */}
          <Text style={{ textAlign: 'center', fontSize: 12, color: theme.text.secondary }}>
            {pairFact}
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 12, color: theme.text.muted }}>{hint}</Text>
        </View>

        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}
        >
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Previous screen"
            onPress={() => step(-1)}
            disabled={pairs.length < 2}
          >
            <IconChevronLeft size={16} color={iconColor} />
          </Button>
          <Text
            style={{
              minWidth: 64,
              textAlign: 'center',
              fontSize: 12,
              fontVariant: ['tabular-nums'],
              color: theme.text.secondary,
            }}
          >
            {pairs.length ? `${position + 1} of ${pairs.length}` : ''}
          </Text>
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Next screen"
            onPress={() => step(1)}
            disabled={pairs.length < 2}
          >
            <IconChevronRight size={16} color={iconColor} />
          </Button>
        </View>
      </View>
    </FullScreenOverlay>
  )
}
