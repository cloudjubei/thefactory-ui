import { useMemo, useRef } from 'react'
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

import { VIDEO_TIMELINE_TEXT, type VideoTimelineCloseUpRow } from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronLeft, IconChevronRight, IconClose } from '../../icons'
import { Button } from '../../primitives/Button'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'

export interface VideoCloseUpScreenProps {
  /** Every close-up of the video's timeline, in its order. */
  closeUps: readonly VideoTimelineCloseUpRow[]
  /** The one shown; none, closed. */
  index: number | undefined
  onIndex: (index: number) => void
  onClose: () => void
  /** Play from its time: the screen closes, the video plays from there as a row's time does. */
  onPlayFrom: (atSec: number) => void
}

/** How far a sideways swipe goes before it steps to the next close-up. */
const SWIPE_PX = 48
/** What the picture keeps clear of the screen's edges. */
const GUTTER = 32
/** The most of the screen's height the picture takes. */
const TALLEST = 0.55

/**
 * A timeline's close-up at its real size, as big as the screen allows, as a screen of its own:
 * its time, place and text, a swipe or the arrows to the video's other close-ups, and Play from its
 * time. Native peer of web's `VideoCloseUpViewer`.
 */
export default function VideoCloseUpScreen({
  closeUps,
  index,
  onIndex,
  onClose,
  onPlayFrom,
}: VideoCloseUpScreenProps) {
  const { theme } = useNativeTheme()
  const screen = useWindowDimensions()
  const shown = index === undefined ? undefined : closeUps[index]
  const at = index ?? 0
  const canBack = at > 0
  const canOn = at < closeUps.length - 1
  const stepRef = useRef({ at, canBack, canOn, onIndex })
  stepRef.current = { at, canBack, canOn, onIndex }

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy),
        onPanResponderRelease: (_, { dx }) => {
          const step = stepRef.current
          if (dx <= -SWIPE_PX && step.canOn) step.onIndex(step.at + 1)
          if (dx >= SWIPE_PX && step.canBack) step.onIndex(step.at - 1)
        },
      }),
    [],
  )

  const size = useMemo(() => {
    if (!shown) return undefined
    const scale = Math.min(
      1,
      (screen.width - GUTTER) / shown.width,
      (screen.height * TALLEST) / shown.height,
    )
    return { width: shown.width * scale, height: shown.height * scale }
  }, [shown, screen.width, screen.height])

  const step = (label: string, enabled: boolean, onPress: () => void, back: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: pressed ? theme.surface.hover : theme.surface.raised,
        opacity: enabled ? 1 : 0.4,
      })}
    >
      {back ? (
        <IconChevronLeft size={18} color={theme.text.secondary} />
      ) : (
        <IconChevronRight size={18} color={theme.text.secondary} />
      )}
    </Pressable>
  )

  return (
    <FullScreenOverlay isOpen={!!shown} onClose={onClose} hideHeader>
      {shown && size ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 8,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: theme.border.subtle,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={VIDEO_TIMELINE_TEXT.close}
              onPress={onClose}
              hitSlop={8}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
            >
              <IconClose size={18} color={theme.accent.primary} />
            </Pressable>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.text.primary }}
            >
              {VIDEO_TIMELINE_TEXT.closeUpTitle(shown.time)}
            </Text>
            <Text
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                fontVariant: ['tabular-nums'],
                color: theme.text.muted,
              }}
            >
              {VIDEO_TIMELINE_TEXT.closeUpCount(at + 1, closeUps.length)}
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[3] }}>
            <View
              {...swipe.panHandlers}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 96,
                padding: nativeSpace[3],
                borderRadius: nativeRadii[3],
                backgroundColor: theme.surface.muted,
              }}
            >
              <Image
                key={shown.key}
                source={{ uri: shown.url }}
                resizeMode="contain"
                accessibilityLabel={shown.text}
                style={{
                  width: size.width,
                  height: size.height,
                  borderRadius: nativeRadii[1],
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                }}
              />
            </View>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              <Text style={{ fontVariant: ['tabular-nums'], color: theme.accent.primary }}>
                {shown.time}
              </Text>
              {` · ${shown.place}`}
            </Text>
            {shown.words ? (
              <Text style={{ fontSize: 15, lineHeight: 21, color: theme.text.primary }}>
                {shown.words}
              </Text>
            ) : null}
          </ScrollView>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: nativeSpace[3],
              padding: nativeSpace[4],
              borderTopWidth: 1,
              borderTopColor: theme.border.subtle,
            }}
          >
            {step(VIDEO_TIMELINE_TEXT.previousCloseUp, canBack, () => onIndex(at - 1), true)}
            {step(VIDEO_TIMELINE_TEXT.nextCloseUp, canOn, () => onIndex(at + 1), false)}
            <View style={{ flex: 1 }} />
            <Button
              onPress={() => {
                onClose()
                onPlayFrom(shown.timeSec)
              }}
            >
              {VIDEO_TIMELINE_TEXT.playFrom(shown.time)}
            </Button>
          </View>
        </>
      ) : null}
    </FullScreenOverlay>
  )
}
