import { Pressable, ScrollView, Text, View } from 'react-native'

import { VIDEO_TIMELINE_TEXT, type VideoTimelineView } from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronLeft } from '../../icons'
import FullScreenOverlay from '../../primitives/FullScreenOverlay'
import VideoTimelineList from './VideoTimelineList'

export interface VideoTimelineScreenProps {
  isOpen: boolean
  name: string
  view: VideoTimelineView
  playheadIndex: number
  onBack: () => void
  /** A time pressed: back to the chat, where the video plays from there. */
  onPlayFrom: (atSec: number) => void
}

/** A video's timeline as a screen of its own, over the chat. Native peer of web's `VideoTimelineScreen`. */
export default function VideoTimelineScreen({
  isOpen,
  name,
  view,
  playheadIndex,
  onBack,
  onPlayFrom,
}: VideoTimelineScreenProps) {
  const { theme } = useNativeTheme()
  return (
    <FullScreenOverlay isOpen={isOpen} onClose={onBack} hideHeader>
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
          accessibilityLabel={VIDEO_TIMELINE_TEXT.back}
          onPress={onBack}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 4 }}
        >
          <IconChevronLeft size={18} color={theme.accent.primary} />
          <Text style={{ fontSize: 15, color: theme.accent.primary }}>
            {VIDEO_TIMELINE_TEXT.back}
          </Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={{ flexShrink: 1, fontSize: 15, fontWeight: '600', color: theme.text.primary }}
        >
          {name}
        </Text>
        {view.state === 'rows' ? (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{view.count}</Text>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: nativeSpace[2] }}>
        <VideoTimelineList view={view} playheadIndex={playheadIndex} onPlayFrom={onPlayFrom} />
      </ScrollView>
    </FullScreenOverlay>
  )
}
