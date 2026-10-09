import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Image,
  PixelRatio,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

import {
  CAPTURE_SAME_CODE_LABEL,
  captureBuildCaption,
  capturedOnLabel,
  comparisonPairFacts,
  useEvidenceDiff,
  canPairViewerZoomIn,
  canPairViewerZoomOut,
  framePane,
  pairFitScale,
  pairViewerZoomFloor,
  pairViewerZoomIn,
  pairViewerZoomLabel,
  pairViewerZoomOut,
  resolveViewerScale,
  screenPairFileStem,
  type CaptureBuildCaption,
  type PairViewerSize,
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
import {
  PAIR_CAPTION_RESERVE,
  PAIR_LOADING_FRAME,
  PAIR_STAGE_GAP,
  PAIR_STAGE_PADDING,
} from './comparisonOverlayConstants'
import type { SaveFileHandler } from './signoffTypes'
import { useImageNaturalSize } from './useImageNaturalSize'
import { Button } from '../../../primitives/Button'
import FullScreenOverlay from '../../../primitives/FullScreenOverlay'
import SegmentedControl from '../../../primitives/SegmentedControl'
import { Slider } from '../../../primitives/Slider'
import CommitChip from '../../chips/CommitChip'
import { chipPillStyle, chipPillTextStyle } from '../../chips/pillStyles'

export type ComparisonOverlayProps = {
  pairs: readonly ScreenPair[]
  /** Key of the pair to show; `undefined` keeps the overlay closed. */
  openKey: string | undefined
  onClose: () => void
  /** The commit befores should be built from — the expectation, never a capture's caption. */
  baseSha: string | undefined
  /** The commit afters should be built from — the expectation, never a capture's caption. */
  headSha: string | undefined
  /** Saves the pair; omitted when the host cannot put a file anywhere. */
  onSaveFile?: SaveFileHandler
  /** Ask the evidence store to decode the open pair's frames. */
  onRequestImage: (id: string, mediaType: string) => void
  /** Whose evidence store to compute the pixel comparison against. */
  projectId: string
}

type Mode = 'mirror' | 'slide' | 'diff'

function Pill({ word }: { word: 'Before' | 'After' }) {
  const { theme } = useNativeTheme()
  return (
    <View style={chipPillStyle(theme)}>
      <Text style={chipPillTextStyle(theme)}>{word}</Text>
    </View>
  )
}

/** A side's build as its own record states it, and apart, what it was expected to be — see the web peer. */
function BuildMarks({ projectId, build }: { projectId: string; build: CaptureBuildCaption }) {
  const { theme, status } = useNativeTheme()
  return (
    <>
      {build.builtSha ? <CommitChip projectId={projectId} sha={build.builtSha} /> : null}
      {build.sameCodeAsExpected ? (
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{CAPTURE_SAME_CODE_LABEL}</Text>
      ) : null}
      {build.dirty ? (
        <Text style={{ fontSize: 12, color: status.stuck.softFg }}>uncommitted changes</Text>
      ) : null}
      {build.expectedSha ? (
        <>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>expected</Text>
          <CommitChip projectId={projectId} sha={build.expectedSha} />
        </>
      ) : null}
    </>
  )
}

function Caption({
  projectId,
  word,
  build,
}: {
  projectId: string
  word: 'Before' | 'After'
  build: CaptureBuildCaption
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Pill word={word} />
      <BuildMarks projectId={projectId} build={build} />
    </View>
  )
}

/** A frame at `width`, its height from its own natural aspect; the loading box until that is known. */
function Frame({
  src,
  width,
  natural,
  loading,
}: {
  src: string | undefined
  width: number
  natural: PairViewerSize | undefined
  loading: PairViewerSize
}) {
  const { theme } = useNativeTheme()
  const box = natural
    ? { width, height: Math.round((width * natural.h) / natural.w) }
    : { width: loading.w, height: loading.h }
  return src ? (
    <Image
      source={{ uri: src }}
      resizeMode="contain"
      style={{
        ...box,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: '#ffffff',
      }}
    />
  ) : (
    <View
      style={{
        ...box,
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
  onRequestImage,
  projectId,
}: ComparisonOverlayProps) {
  const { theme } = useNativeTheme()
  const { width: screenWidth } = useWindowDimensions()
  const [mode, setMode] = useState<Mode>('slide')
  const [manualScale, setManualScale] = useState<number | undefined>(undefined)
  const [stage, setStage] = useState<PairViewerSize | undefined>(undefined)
  const [slidePct, setSlidePct] = useState(50)
  const [holdBase, setHoldBase] = useState(false)
  const [position, setPosition] = useState(0)

  const isOpen = openKey !== undefined
  const openIndex = useMemo(() => pairs.findIndex((p) => p.key === openKey), [pairs, openKey])

  useEffect(() => {
    if (openIndex >= 0) setPosition(openIndex)
  }, [openIndex])

  const pair = pairs[position]
  useEffect(() => {
    setManualScale(undefined)
  }, [openKey, position])
  // Decode the open pair's frames on demand — the strip only decoded thumbnails.
  useEffect(() => {
    if (!isOpen || !pair) return
    if (pair.before) onRequestImage(pair.before.ref.id, pair.before.ref.mediaType)
    if (pair.after) onRequestImage(pair.after.ref.id, pair.after.ref.mediaType)
  }, [isOpen, pair, onRequestImage])
  const before = pair?.before?.dataUri
  const after = pair?.after?.dataUri
  const canSlide = Boolean(pair?.before && pair?.after)
  const effectiveMode: Mode = canSlide ? mode : 'mirror'
  const cut = holdBase ? 100 : slidePct
  const step = (d: number) =>
    setPosition((p) => (pairs.length ? (p + d + pairs.length) % pairs.length : 0))
  const heading = pair ? `${String(pair.index).padStart(2, '0')} · ${pair.title}` : ''
  const capturedOn = pair ? capturedOnLabel(pair) : undefined
  const iconColor = theme.text.primary

  const pairFacts = pair ? comparisonPairFacts(pair) : []
  const beforeBuild = captureBuildCaption(pair?.before, pair?.expectedBaseSha ?? baseSha, {
    counted: pair?.counted === true,
  })
  const afterBuild = captureBuildCaption(pair?.after, pair?.expectedHeadSha ?? headSha, {
    counted: pair?.counted === true,
  })

  const diff = useEvidenceDiff(
    projectId,
    pair?.before?.ref.id,
    pair?.after?.ref.id,
    effectiveMode === 'diff',
  )

  const beforeNatural = useImageNaturalSize(before)
  const afterNatural = useImageNaturalSize(after)
  const diffNatural = useImageNaturalSize(effectiveMode === 'diff' ? diff.dataUri : undefined)
  const showBefore = Boolean(pair?.before || !pair?.after)
  const showAfter = Boolean(pair?.after)
  // Slide's reveal controls sit outside the stage, so only Mirror/Diff keep caption room.
  const pane = framePane(
    stage && { w: stage.w - PAIR_STAGE_PADDING, h: stage.h - PAIR_STAGE_PADDING },
    {
      columns: effectiveMode === 'mirror' && showBefore && showAfter ? 2 : 1,
      gap: PAIR_STAGE_GAP,
      reserveHeight: effectiveMode === 'slide' ? 0 : PAIR_CAPTION_RESERVE,
    },
  )
  const naturals =
    effectiveMode === 'diff'
      ? [diffNatural]
      : effectiveMode === 'slide'
        ? [beforeNatural, afterNatural]
        : [showBefore ? beforeNatural : undefined, showAfter ? afterNatural : undefined]
  const fit = pairFitScale({ naturals, pane, pixelRatio: PixelRatio.get() })
  const scale = resolveViewerScale(manualScale, fit)
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const floor = pairViewerZoomFloor(fit)
  const loading: PairViewerSize = {
    w: Math.min(PAIR_LOADING_FRAME.w, pane?.w ?? PAIR_LOADING_FRAME.w),
    h: Math.min(PAIR_LOADING_FRAME.h, pane?.h ?? PAIR_LOADING_FRAME.h),
  }
  const widthOf = (natural: PairViewerSize | undefined) =>
    natural ? Math.round(natural.w * scale) : loading.w
  const slideWidth = widthOf(beforeNatural ?? afterNatural)
  const zoomTo = (next: (current: number) => number) =>
    setManualScale((m) => next(m ?? scaleRef.current))

  const hint =
    effectiveMode === 'mirror'
      ? 'Both frames are on screen, so there is nothing to flip.'
      : effectiveMode === 'diff'
        ? 'Every pixel that changed, marked. The unchanged screen shows through faintly for context.'
        : 'Drag the handle, or hold the button to swing it fully to the base.'

  return (
    <FullScreenOverlay isOpen={isOpen} onClose={onClose} hideHeader>
      <View style={{ flex: 1, gap: 12, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}
            >
              {heading}
            </Text>
            {/* WHERE it was captured — see the web peer. */}
            {capturedOn ? (
              <Text numberOfLines={1} style={{ fontSize: 11, color: theme.text.secondary }}>
                {capturedOn}
              </Text>
            ) : null}
          </View>
          <SegmentedControl
            size="sm"
            ariaLabel="Comparison mode"
            value={effectiveMode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'mirror', label: 'Mirror' },
              { value: 'diff', label: 'Diff' },
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
            disabled={!canPairViewerZoomOut(scale, floor)}
            onPress={() => zoomTo((s) => pairViewerZoomOut(s, floor))}
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
            {pairViewerZoomLabel(scale)}
          </Text>
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Zoom in"
            disabled={!canPairViewerZoomIn(scale)}
            onPress={() => zoomTo((s) => pairViewerZoomIn(s, floor))}
          >
            <IconZoomIn size={16} color={iconColor} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Fit to screen"
            onPress={() => setManualScale(undefined)}
          >
            <IconRefresh size={16} color={iconColor} />
          </Button>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, padding: 8 }}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout
            setStage((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }))
          }}
        >
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
            {effectiveMode === 'diff' ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                {diff.dataUri ? (
                  <Frame
                    src={diff.dataUri}
                    width={widthOf(diffNatural)}
                    natural={diffNatural}
                    loading={loading}
                  />
                ) : (
                  <View
                    style={{
                      width: loading.w,
                      minHeight: 160,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 24,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: theme.border.default,
                      borderRadius: nativeRadii[2],
                    }}
                  >
                    {/* A refusal always says WHY — see the web peer. */}
                    <Text
                      style={{ fontSize: 12, color: theme.text.secondary, textAlign: 'center' }}
                    >
                      {diff.loading ? 'Comparing…' : (diff.error ?? 'No comparison available.')}
                    </Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: theme.text.secondary }}>Changed pixels</Text>
              </View>
            ) : effectiveMode === 'mirror' ? (
              <>
                {showBefore ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Frame
                      src={before}
                      width={widthOf(beforeNatural)}
                      natural={beforeNatural}
                      loading={loading}
                    />
                    <Caption projectId={projectId} word="Before" build={beforeBuild} />
                  </View>
                ) : null}
                {pair?.after ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Frame
                      src={after}
                      width={widthOf(afterNatural)}
                      natural={afterNatural}
                      loading={loading}
                    />
                    <Caption projectId={projectId} word="After" build={afterBuild} />
                  </View>
                ) : null}
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={{ width: slideWidth }}>
                  <Frame
                    src={before}
                    width={slideWidth}
                    natural={beforeNatural}
                    loading={loading}
                  />
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
                    <View style={{ position: 'absolute', top: 0, left: -(slideWidth * cut) / 100 }}>
                      <Frame
                        src={after}
                        width={slideWidth}
                        natural={afterNatural}
                        loading={loading}
                      />
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
              <BuildMarks projectId={projectId} build={beforeBuild} />
              <Text style={{ fontSize: 12, color: theme.text.muted }}>drag</Text>
              <Pill word="After" />
              <BuildMarks projectId={projectId} build={afterBuild} />
            </View>
            <View style={{ width: Math.min(slideWidth, screenWidth - 32) }}>
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
          {pairFacts.map((fact) => (
            <Text
              key={fact}
              style={{ textAlign: 'center', fontSize: 12, color: theme.text.secondary }}
            >
              {fact}
            </Text>
          ))}
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
