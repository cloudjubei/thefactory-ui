import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  VIDEO_TIMELINE_TEXT,
  videoTimelineCloseUps,
  type VideoTimelineGlyph,
  type VideoTimelineMarkLine,
  type VideoTimelineRow,
  type VideoTimelineView,
} from '../../../headless'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconFlag, IconPlay, IconPointer, IconSoundLevels, IconSpeech } from '../../icons'
import ActionMenu from '../ActionMenu'
import VideoCloseUpScreen from './VideoCloseUpScreen'
import VideoMarkSheet from './VideoMarkSheet'

export interface VideoTimelineListProps {
  view: VideoTimelineView
  /** The row the playhead is at, or -1. */
  playheadIndex: number
  onPlayFrom: (atSec: number) => void
  /** Given, a long press on a row offers Mark, which puts its moment in the composer. */
  onMark?: (timeSec: number, note: string) => void
  /** The note of the mark already waiting at a moment, which Mark opens with. */
  markNoteAt?: (timeSec: number) => string | undefined
  /** Opens the long press's sheet on the row at this time, for a showcase view. */
  initialMenuSec?: number
  /** Opens this close-up's screen, by its place among them all, for a showcase view. */
  initialCloseUpIndex?: number
}

/** Where a row's text starts: past its padding, time and glyph, so the lines under it line up. */
const UNDER_TEXT = 100

function Glyph({ glyph }: { glyph: VideoTimelineGlyph }) {
  const { theme, status } = useNativeTheme()
  switch (glyph.kind) {
    case 'still':
      return (
        <Image
          source={{ uri: glyph.url }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          style={{
            width: 40,
            height: 24,
            borderRadius: nativeRadii[1],
            borderWidth: 1,
            borderColor: theme.border.subtle,
            backgroundColor: theme.surface.muted,
          }}
        />
      )
    case 'action':
      return <IconPointer size={16} color={theme.accent.primary} />
    case 'speech':
      return <IconSpeech size={16} color={status.done.softFg} />
    case 'sound':
      return <IconSoundLevels size={16} color={status.working.softFg} />
  }
}

function MarkLine({ mark }: { mark: VideoTimelineMarkLine }) {
  const { theme } = useNativeTheme()
  const waiting = mark.source === 'composer'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
      <IconFlag size={11} color={theme.accent.primary} />
      <Text style={{ fontSize: 12, fontVariant: ['tabular-nums'], color: theme.accent.primary }}>
        {mark.time}
      </Text>
      <Text
        style={{
          flexShrink: 1,
          fontSize: 12,
          fontStyle: mark.hasNote ? 'normal' : 'italic',
          color: mark.hasNote ? theme.text.secondary : theme.text.muted,
        }}
      >
        {mark.note}
      </Text>
      <View
        style={{
          paddingHorizontal: 6,
          borderRadius: nativeRadii.round,
          borderWidth: 1,
          borderColor: waiting ? theme.accent.softBorder : theme.border.default,
          backgroundColor: waiting ? theme.accent.softBg : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '500',
            color: waiting ? theme.accent.softFg : theme.text.muted,
          }}
        >
          {mark.tag}
        </Text>
      </View>
    </View>
  )
}

/**
 * A video's timeline in time order: each moment's time plays the video from there, the row at the
 * playhead stands out. While it is being made, or when it failed or holds nothing, one line says so.
 * Given `onMark`, a long press on a row offers Play from and Mark, which opens the flag's note
 * sheet. Each close-up opens a screen of its own that steps through them all. The person's marks
 * are lines under the rows they fall in. Native peer of web's `VideoTimelineList`.
 */
export default function VideoTimelineList({
  view,
  playheadIndex,
  onPlayFrom,
  onMark,
  markNoteAt,
  initialMenuSec,
  initialCloseUpIndex,
}: VideoTimelineListProps) {
  const { theme } = useNativeTheme()
  const [menuRow, setMenuRow] = useState<VideoTimelineRow>()
  const [marking, setMarking] = useState<VideoTimelineRow>()
  const [viewing, setViewing] = useState<number | undefined>(initialCloseUpIndex)
  const closeUps = useMemo(() => videoTimelineCloseUps(view), [view])
  const rows = view.state === 'rows' ? view.rows : undefined

  useEffect(() => {
    if (initialMenuSec === undefined || !onMark) return
    const row = rows?.find((one) => one.timeSec === initialMenuSec)
    if (row) setMenuRow(row)
  }, [initialMenuSec, onMark, rows])

  const sheets = (
    <>
      {onMark ? (
        <>
          <ActionMenu
            isOpen={!!menuRow}
            onClose={() => setMenuRow(undefined)}
            {...(menuRow ? { title: menuRow.text } : {})}
            actions={
              menuRow
                ? [
                    {
                      key: 'play',
                      label: VIDEO_TIMELINE_TEXT.playFrom(menuRow.time),
                      icon: <IconPlay size={18} fill={theme.accent.primary} />,
                      onPress: () => {
                        setMenuRow(undefined)
                        onPlayFrom(menuRow.timeSec)
                      },
                    },
                    {
                      key: 'mark',
                      label: VIDEO_TIMELINE_TEXT.markFrom(menuRow.time),
                      icon: <IconFlag size={18} color={theme.accent.primary} />,
                      onPress: () => {
                        setMenuRow(undefined)
                        setMarking(menuRow)
                      },
                    },
                  ]
                : []
            }
          />
          <VideoMarkSheet
            isOpen={!!marking}
            time={marking?.time ?? ''}
            where={marking?.text ?? ''}
            note={marking ? markNoteAt?.(marking.timeSec) : undefined}
            onCancel={() => setMarking(undefined)}
            onAdd={(note) => {
              if (marking) onMark(marking.timeSec, note)
              setMarking(undefined)
            }}
          />
        </>
      ) : null}
      <VideoCloseUpScreen
        closeUps={closeUps}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(undefined)}
        onPlayFrom={onPlayFrom}
      />
    </>
  )
  if (view.state !== 'rows') {
    return (
      <Text
        style={{
          paddingHorizontal: nativeSpace[4],
          paddingVertical: nativeSpace[3],
          fontSize: 13,
          color: view.state === 'failed' ? theme.text.primary : theme.text.muted,
        }}
      >
        {view.state === 'loading' ? VIDEO_TIMELINE_TEXT.loading : view.line}
      </Text>
    )
  }
  return (
    <View style={{ gap: 2 }}>
      {view.onEveryScreen ? (
        <Text
          style={{
            paddingHorizontal: nativeSpace[4],
            paddingBottom: nativeSpace[2],
            fontSize: 12,
            color: theme.text.muted,
          }}
        >
          {view.onEveryScreen}
        </Text>
      ) : null}
      {view.rows.map((row, index) => (
        <View
          key={row.key}
          style={{
            borderRadius: nativeRadii[3],
            backgroundColor: index === playheadIndex ? theme.accent.softBg : 'transparent',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityHint={VIDEO_TIMELINE_TEXT.playFrom(row.time)}
            onPress={() => onPlayFrom(row.timeSec)}
            {...(onMark ? { onLongPress: () => setMenuRow(row) } : {})}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: nativeSpace[3],
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[3],
              borderRadius: nativeRadii[3],
              backgroundColor: pressed ? theme.surface.hover : 'transparent',
            })}
          >
            <View style={{ width: 42 }}>
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 18,
                  fontVariant: ['tabular-nums'],
                  color: theme.accent.primary,
                }}
              >
                {row.time}
              </Text>
            </View>
            <View style={{ width: 40, height: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Glyph glyph={row.glyph} />
            </View>
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: theme.text.primary }}>
              {row.text}
            </Text>
          </Pressable>
          {row.closeUps.length || row.marks.length ? (
            <View
              style={{
                gap: nativeSpace[2],
                marginTop: -nativeSpace[2],
                paddingLeft: UNDER_TEXT,
                paddingRight: nativeSpace[3],
                paddingBottom: nativeSpace[3],
              }}
            >
              {row.closeUps.map((closeUp) => (
                <Pressable
                  key={closeUp.key}
                  accessibilityRole="button"
                  accessibilityLabel={closeUp.text}
                  accessibilityHint={VIDEO_TIMELINE_TEXT.openCloseUp(closeUp.time)}
                  onPress={() => setViewing(closeUps.indexOf(closeUp))}
                  hitSlop={4}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: nativeSpace[2],
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Image
                    source={{ uri: closeUp.url }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                    style={{
                      width: 26,
                      height: 14,
                      borderRadius: nativeRadii[1],
                      borderWidth: 1,
                      borderColor: theme.border.subtle,
                    }}
                  />
                  <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>
                    {closeUp.text}
                  </Text>
                </Pressable>
              ))}
              {row.marks.map((mark) => (
                <MarkLine key={mark.key} mark={mark} />
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {sheets}
    </View>
  )
}
