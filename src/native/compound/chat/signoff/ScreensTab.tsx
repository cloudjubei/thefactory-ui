import { useState } from 'react'
import { Image, Pressable, ScrollView, Text, View } from 'react-native'

import type { ScreenPair, ScreenPairClass } from '../../../../headless'
import { nativeRadii, nativeShadows } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import SegmentedControl from '../../../primitives/SegmentedControl'
import Tooltip from '../../../primitives/Tooltip'
import { Button } from '../../../primitives/Button'
import { IconDownload } from '../../../icons'

export type ScreensTabProps = {
  pairs: readonly ScreenPair[]
  onOpen: (key: string) => void
  /** When the capture happened, as a label — the one fact the footer keeps. */
  capturedLabel: string | undefined
  /** Saves every capture; omitted when the host cannot put a file anywhere. */
  onSaveAll?: () => void
}

type ThumbMode = 'before' | 'after'

const META: Record<ScreenPairClass, string> = {
  pair: 'before / after',
  new: 'only on the branch',
  removed: 'only on the base',
  single: 'single capture',
}

const TILE_WIDTH = 110
const TILE_HEIGHT = 196
const FRAME_WIDTH = 96
const FRAME_HEIGHT = 184
const TILE_GAP = 12

function Frame({ src }: { src: string | undefined }) {
  const { theme } = useNativeTheme()
  return src ? (
    <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
  ) : (
    <View style={{ flex: 1, backgroundColor: theme.surface.muted }} />
  )
}

/**
 * Every captured screen, in walkthrough order, as a snapping strip — so a
 * reviewer can walk them one by one with a thumb. Each tile is a stacked card:
 * the base peeks out behind the branch. There is no changed/unchanged split
 * here yet, because nothing has compared pixels; the tile number is the
 * walkthrough position and never renumbers.
 */
export default function ScreensTab({ pairs, onOpen, capturedLabel, onSaveAll }: ScreensTabProps) {
  const { theme, status } = useNativeTheme()
  // With nothing captured on the base there is no "before" to switch to, and a
  // segment that changes nothing reads as broken.
  const hasBefore = pairs.some((p) => p.before !== undefined)
  const [mode, setMode] = useState<ThumbMode>('after')

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          <Text style={{ fontWeight: '600', color: theme.text.primary }}>{pairs.length}</Text>
          {` ${pairs.length === 1 ? 'screen' : 'screens'} captured`}
        </Text>
        <View style={{ flex: 1 }} />
        <Tooltip
          content={
            <Text style={{ fontSize: 12, color: theme.text.primary }}>
              A pixel comparison has not been computed for this run yet, so there is no Diff view.
              Open a screen to compare it by eye.
            </Text>
          }
          placement="top"
        >
          <Text style={{ fontSize: 11, color: theme.text.muted }}>Diff · not computed</Text>
        </Tooltip>
        {onSaveAll ? (
          <Button
            variant="secondary"
            size="icon"
            accessibilityLabel="Save screens"
            onPress={onSaveAll}
          >
            <IconDownload size={16} color={theme.text.primary} />
          </Button>
        ) : null}
        {hasBefore ? (
          <SegmentedControl
            size="sm"
            ariaLabel="What the thumbnails show"
            value={mode}
            onChange={(v) => setMode(v as ThumbMode)}
            options={[
              { value: 'before', label: 'Before' },
              { value: 'after', label: 'After' },
            ]}
          />
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TILE_WIDTH + TILE_GAP}
        decelerationRate="fast"
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          gap: TILE_GAP,
          paddingHorizontal: 2,
          paddingTop: 6,
          paddingBottom: 10,
        }}
      >
        {pairs.map((pair) => {
          const front =
            mode === 'before' ? (pair.before ?? pair.after) : (pair.after ?? pair.before)
          const hasBack = pair.class === 'pair' && mode === 'after'
          return (
            <View key={pair.key} style={{ width: TILE_WIDTH, gap: 4 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Compare ${pair.title}`}
                onPress={() => onOpen(pair.key)}
                style={({ pressed }) => ({
                  width: TILE_WIDTH,
                  height: TILE_HEIGHT,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {hasBack ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: -3,
                      top: -3,
                      width: FRAME_WIDTH,
                      height: FRAME_HEIGHT,
                      borderRadius: nativeRadii[2],
                      borderWidth: 1,
                      borderColor: theme.border.subtle,
                      backgroundColor: theme.surface.raised,
                    }}
                  />
                ) : null}
                <View
                  style={{
                    position: 'absolute',
                    left: 6,
                    top: 6,
                    width: FRAME_WIDTH,
                    height: FRAME_HEIGHT,
                    overflow: 'hidden',
                    borderRadius: nativeRadii[2],
                    borderWidth: 1,
                    borderColor: theme.border.default,
                    backgroundColor: theme.surface.muted,
                    ...nativeShadows[1],
                  }}
                >
                  <Frame src={front?.dataUri} />
                </View>
                {pair.class === 'new' || pair.class === 'removed' ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: 10,
                      top: 10,
                      paddingHorizontal: 4,
                      borderRadius: 3,
                      backgroundColor: pair.class === 'new' ? status.review.bg : status.queued.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8.5,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        color: pair.class === 'new' ? status.review.fg : status.queued.fg,
                      }}
                    >
                      {pair.class === 'new' ? 'New' : 'Removed'}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Text numberOfLines={1} style={{ fontSize: 10.5, color: theme.text.secondary }}>
                <Text style={{ fontVariant: ['tabular-nums'], color: theme.text.muted }}>
                  {String(pair.index).padStart(2, '0')}
                </Text>
                {` · ${pair.title}`}
              </Text>
              <Text style={{ fontSize: 10, color: theme.text.muted }}>{META[pair.class]}</Text>
            </View>
          )
        })}
      </ScrollView>

      {capturedLabel ? (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle, paddingTop: 6 }}>
          <Text
            style={{ fontSize: 11, color: theme.text.muted }}
          >{`captured ${capturedLabel}`}</Text>
        </View>
      ) : null}
    </View>
  )
}
