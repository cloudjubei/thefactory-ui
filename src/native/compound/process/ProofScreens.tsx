import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  proofScreensPane,
  proofThumbnailFrame,
  type EvidenceTile,
  type ProofPairView,
  type ProofThumbnail,
  type ProofThumbnailSide,
  type ProofUnpairedView,
  type ScreenPair,
  type VerifyProofView,
} from '../../../headless'
import { nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronRight, IconDownload } from '../../icons'
import { Button } from '../../primitives/Button'
import SegmentedControl from '../../primitives/SegmentedControl'

export type ProofScreensProps = {
  view: VerifyProofView
  /** Opens the comparison overlay on a pair or new screen, by its key. */
  onOpen: (key: string) => void
  onRequestImage: (id: string, mediaType: string) => void
  /** Saves one proving pair — the download on each thumbnail and, for all of them, the pane's. */
  onSavePair?: (pair: ScreenPair) => void
}

const THUMB_WIDTH = 92
/** A phone capture's usual shape, held until the image reports its own. */
const THUMB_FALLBACK_ASPECT = 9 / 16

/** One capture, or what stands in its place — see the web peer. */
function Frame({
  tile,
  absent,
  width,
  height,
}: {
  tile: EvidenceTile | undefined
  absent: string | undefined
  width: number
  height: number
}) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderStyle: tile ? 'solid' : 'dashed',
        borderColor: theme.border.default,
        backgroundColor: theme.surface.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {tile?.dataUri ? (
        <Image
          source={{ uri: tile.dataUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : tile ? null : (
        <Text style={{ fontSize: 9.5, color: theme.text.muted, textAlign: 'center', padding: 4 }}>
          {absent}
        </Text>
      )}
    </View>
  )
}

/** A pair that did not count — small, muted, with its reason. See the web peer. */
function UncountedPair({ pair, onOpen }: { pair: ProofPairView; onOpen: (key: string) => void }) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Compare ${pair.subject} — did not count`}
      onPress={() => onOpen(pair.key)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 8,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 4, opacity: 0.75 }}>
        <Frame tile={pair.before} absent={pair.beforeAbsent} width={45} height={80} />
        <Frame tile={pair.after} absent={pair.afterAbsent} width={45} height={80} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}
        >
          {pair.subject}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View
            style={{
              marginTop: 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: theme.text.muted,
            }}
          />
          <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.secondary }}>
            {pair.verdict}
          </Text>
        </View>
        <Text style={{ fontSize: 10.5, color: theme.text.muted }}>
          {pair.sameScreen ? `${pair.change} · ${pair.sameScreen}` : pair.change}
        </Text>
      </View>
    </Pressable>
  )
}

/** An after shown alone, with why it does not count — see the web peer. */
function UnpairedAfter({
  item,
  onOpen,
}: {
  item: ProofUnpairedView
  onOpen: (key: string) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.subject} — did not count`}
      onPress={() => onOpen(item.key)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 8,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.base,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ opacity: 0.75 }}>
        <Frame tile={item.after} absent={item.afterAbsent} width={45} height={80} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}
        >
          {item.subject}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <View
            style={{
              marginTop: 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: theme.text.muted,
            }}
          />
          <Text style={{ flex: 1, fontSize: 11.5, color: theme.text.secondary }}>
            {item.reason}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

/**
 * One thumbnail the proof rests on — the native peer of the web `Thumbnail`.
 * The frame keeps its capture's aspect once the image reports its size; the
 * download stays visible, since a phone has no hover to reveal it.
 */
function Thumbnail({
  thumb,
  side,
  onOpen,
  onSave,
}: {
  thumb: ProofThumbnail
  side: ProofThumbnailSide
  onOpen: (key: string) => void
  onSave: ((pair: ScreenPair) => void) | undefined
}) {
  const { theme } = useNativeTheme()
  const [aspect, setAspect] = useState<number | undefined>()
  const frame = proofThumbnailFrame(thumb, side)
  const savable = onSave && (thumb.screen.before?.dataUri || thumb.screen.after?.dataUri)
  return (
    <View style={{ width: THUMB_WIDTH, gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Compare ${thumb.subject}`}
        onPress={() => onOpen(thumb.key)}
        style={({ pressed }) => ({
          width: THUMB_WIDTH,
          overflow: 'hidden',
          borderRadius: nativeRadii[2],
          borderWidth: 1,
          borderStyle: frame.tile ? 'solid' : 'dashed',
          borderColor: theme.border.default,
          backgroundColor: theme.surface.muted,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {frame.tile?.dataUri ? (
          <Image
            source={{ uri: frame.tile.dataUri }}
            accessibilityLabel={`${thumb.subject} — ${side}`}
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source
              if (width > 0 && height > 0) setAspect(width / height)
            }}
            style={{ width: '100%', aspectRatio: aspect ?? THUMB_FALLBACK_ASPECT }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: THUMB_FALLBACK_ASPECT,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            }}
          >
            {frame.tile ? null : (
              <Text style={{ fontSize: 9.5, color: theme.text.muted, textAlign: 'center' }}>
                {frame.absent}
              </Text>
            )}
          </View>
        )}
        {thumb.marker ? (
          <View
            style={{
              position: 'absolute',
              right: 4,
              bottom: 4,
              paddingHorizontal: 4,
              borderRadius: 4,
              backgroundColor: theme.accent.primary,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                lineHeight: 14,
                fontVariant: ['tabular-nums'],
                color: '#ffffff',
              }}
            >
              {thumb.marker}
            </Text>
          </View>
        ) : null}
      </Pressable>
      {savable ? (
        <View style={{ position: 'absolute', right: 4, top: 4, zIndex: 20 }}>
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel={`Save ${thumb.subject}`}
            onPress={() => onSave(thumb.screen)}
          >
            <IconDownload size={14} color={theme.text.primary} />
          </Button>
        </View>
      ) : null}
      <Text style={{ fontSize: 10, lineHeight: 13, color: theme.text.muted }}>{thumb.subject}</Text>
    </View>
  )
}

/**
 * Exactly the screens a verify gate judged, as the agreed grid — the native
 * peer of the web `ProofScreens`. One thumbnail per pair the proof rests on,
 * then each screen the change adds, under a Before/After toggle and a download
 * for all; everything that did not count folds into one pressable line that
 * opens the list, each with its reason.
 */
export default function ProofScreens({
  view,
  onOpen,
  onRequestImage,
  onSavePair,
}: ProofScreensProps) {
  const { status, theme } = useNativeTheme()
  const pane = proofScreensPane(view)
  const [side, setSide] = useState<ProofThumbnailSide>('after')
  const [foldOpen, setFoldOpen] = useState(false)
  const uncounted = view.pairs.filter((p) => !p.counted)

  useEffect(() => {
    for (const thumb of pane.thumbnails) {
      if (thumb.before) onRequestImage(thumb.before.ref.id, thumb.before.ref.mediaType)
      if (thumb.after) onRequestImage(thumb.after.ref.id, thumb.after.ref.mediaType)
    }
  }, [pane.thumbnails, onRequestImage])

  useEffect(() => {
    if (!foldOpen) return
    for (const pair of view.pairs) {
      if (pair.counted) continue
      if (pair.before) onRequestImage(pair.before.ref.id, pair.before.ref.mediaType)
      if (pair.after) onRequestImage(pair.after.ref.id, pair.after.ref.mediaType)
    }
    for (const item of view.unpaired) {
      if (item.after) onRequestImage(item.after.ref.id, item.after.ref.mediaType)
    }
  }, [foldOpen, view, onRequestImage])

  const savable = pane.thumbnails.filter((t) => t.screen.before?.dataUri || t.screen.after?.dataUri)
  const summaryColor = !pane.summary
    ? undefined
    : pane.summary.tone === 'empty'
      ? theme.text.secondary
      : status[pane.summary.tone].softFg

  return (
    <View style={{ gap: 12 }}>
      {pane.summary ? (
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: summaryColor }}>
          {pane.summary.text}
        </Text>
      ) : null}

      {pane.thumbnails.length > 0 ? (
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {pane.hasBefore ? (
              <SegmentedControl
                size="sm"
                ariaLabel="What the thumbnails show"
                value={side}
                onChange={(v) => setSide(v as ProofThumbnailSide)}
                options={[
                  { value: 'before', label: 'Before' },
                  { value: 'after', label: 'After' },
                ]}
              />
            ) : null}
            {onSavePair && savable.length > 0 ? (
              <Button
                variant="secondary"
                size="icon"
                accessibilityLabel={pane.saveAllLabel}
                onPress={() => savable.forEach((t) => onSavePair(t.screen))}
              >
                <IconDownload size={16} color={theme.text.primary} />
              </Button>
            ) : null}
          </View>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 }}
          >
            {pane.thumbnails.map((t) => (
              <Thumbnail key={t.key} thumb={t} side={side} onOpen={onOpen} onSave={onSavePair} />
            ))}
          </View>
        </View>
      ) : null}

      {pane.notCounted ? (
        <View style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: foldOpen }}
            onPress={() => setFoldOpen((o) => !o)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 2,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 11.5, color: theme.text.muted }}>{pane.notCounted.label}</Text>
            <View style={{ transform: [{ rotate: foldOpen ? '90deg' : '0deg' }] }}>
              <IconChevronRight size={12} color={theme.text.muted} />
            </View>
          </Pressable>
          {foldOpen ? (
            <View style={{ gap: 6 }}>
              {uncounted.map((p) => (
                <UncountedPair key={p.key} pair={p} onOpen={onOpen} />
              ))}
              {view.unpaired.map((u) => (
                <UnpairedAfter key={u.key} item={u} onOpen={onOpen} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
