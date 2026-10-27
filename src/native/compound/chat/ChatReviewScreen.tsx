import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { CHAT_CHANGES_DOCK_COPY } from '../../../headless/utils/chatChangesDockConstants'
import type { ChatReviewHeaderView } from '../../../headless/utils/chatChangesDockTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevronLeft } from '../../icons'
import RefChip from '../chips/RefChip'

export type ChatReviewScreenProps = {
  header: ChatReviewHeaderView
  /** Back to the chat the review was opened from. */
  onBack: () => void
  /** The review itself — it fills the screen and scrolls itself, its decision pinned under it. */
  children: ReactNode
}

/**
 * A turn's full review as a screen of its own, pushed over the chat: "‹ Chat"
 * back, what it holds and the branch it waits on, and the review filling the
 * rest — its content scrolling, its decision pinned at the bottom (a bare
 * `CliRunArtifactPanel` lays itself out so). Native peer of web's
 * `ChatReviewPanel` sheet.
 */
export function ChatReviewScreen({ header, onBack, children }: ChatReviewScreenProps) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
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
          accessibilityLabel={CHAT_CHANGES_DOCK_COPY.backToChat}
          onPress={onBack}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', height: 32, paddingHorizontal: 4 }}
        >
          <IconChevronLeft size={18} color={theme.accent.primary} />
          <Text style={{ fontSize: 15, color: theme.accent.primary }}>
            {CHAT_CHANGES_DOCK_COPY.backToChat}
          </Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: header.branch ? 0 : 1,
            fontSize: 15,
            fontWeight: '600',
            color: theme.text.primary,
          }}
        >
          {header.title}
        </Text>
        {header.branch ? (
          <View style={{ marginLeft: 'auto', flexShrink: 1, minWidth: 0 }}>
            <RefChip kind="branch" value={header.branch} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
