import { useState } from 'react'
import { Text, View } from 'react-native'

import { useChatActions } from '../../../headless/contexts/ChatActionsContext'
import { chatStopCardView, chatStopDetailsLabel } from '../../../headless/utils/chatStopNotice'
import { CHAT_STOP_COPY } from '../../../headless/utils/chatStopNoticeConstants'
import type { ChatStopNotice, ChatStopRestart } from '../../../headless/utils/chatStopNoticeTypes'
import { nativeFontFamilies, nativeRadii } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconStop } from '../../icons'
import { Button } from '../../primitives/Button'
import ToneBadge from '../chips/ToneBadge'

export type ChatStopCardProps = {
  notice: ChatStopNotice
  /** The restart its primary button runs; absent where the row offers none. */
  restart?: ChatStopRestart
  onRestart?: () => void
  /** The turn whose changes "Open the changes" opens; the chat's open changes when absent. */
  runId?: string
  /** Opens with the raw error shown. */
  defaultShowDetails?: boolean
}

/**
 * Native peer of [web's `ChatStopCard`](../../../web/compound/chat/ChatStopCard.tsx): one card
 * for a stopped turn or story run — whose problem it was, what happened, what to do next.
 */
export default function ChatStopCard({
  notice,
  restart,
  onRestart,
  runId,
  defaultShowDetails = false,
}: ChatStopCardProps) {
  const { theme, status } = useNativeTheme()
  const [showDetails, setShowDetails] = useState(defaultShowDetails)
  const actions = useChatActions()
  const view = chatStopCardView(notice)
  const tone = status[view.tone]
  const askAgentDraft = actions ? view.askAgentDraft : undefined
  const hasActions = !!(restart && onRestart) || !!actions || !!view.details
  return (
    <View
      accessibilityRole="summary"
      style={{
        borderWidth: 1,
        borderRadius: nativeRadii[3],
        borderColor: tone.softBorder,
        backgroundColor: theme.surface.raised,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
        }}
      >
        <View style={{ marginTop: 2 }}>
          <IconStop size={18} color={tone.softFg} />
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 10,
            rowGap: 6,
          }}
        >
          <Text
            style={{
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: 180,
              fontSize: 14,
              lineHeight: 22,
              fontWeight: '600',
              color: theme.text.primary,
            }}
          >
            {view.title}
          </Text>
          {view.pill ? <ToneBadge tone={view.pill.tone} label={view.pill.label} /> : null}
        </View>
      </View>
      <Text
        style={{
          paddingLeft: 44,
          paddingRight: 16,
          paddingBottom: 12,
          fontSize: 13.5,
          lineHeight: 20,
          color: theme.text.primary,
        }}
      >
        {view.reason}
      </Text>
      {view.repeatLine ? (
        <Text
          style={{
            paddingLeft: 44,
            paddingRight: 16,
            paddingBottom: 12,
            fontSize: 12.5,
            fontWeight: '600',
            color: tone.softFg,
          }}
        >
          {view.repeatLine}
        </Text>
      ) : null}
      {hasActions ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          {restart && onRestart ? (
            <Button
              size="sm"
              accessibilityHint={restart.title}
              disabled={restart.disabled}
              onPress={onRestart}
            >
              {view.primaryLabel}
            </Button>
          ) : null}
          {askAgentDraft ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => actions?.draftMessage(askAgentDraft)}
            >
              {CHAT_STOP_COPY.askAgent}
            </Button>
          ) : null}
          {actions ? (
            <Button size="sm" variant="secondary" onPress={() => actions.openReview(runId)}>
              {CHAT_STOP_COPY.openChanges}
            </Button>
          ) : null}
          {view.details ? (
            <Button
              size="sm"
              variant="ghost"
              style={{ marginLeft: 'auto' }}
              textStyle={{ color: theme.text.secondary }}
              accessibilityState={{ expanded: showDetails }}
              onPress={() => setShowDetails((open) => !open)}
            >
              {chatStopDetailsLabel(showDetails)}
            </Button>
          ) : null}
        </View>
      ) : null}
      {view.details && showDetails ? (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: nativeRadii[3],
            backgroundColor: theme.surface.overlay,
          }}
        >
          <Text
            selectable
            style={{
              fontFamily: nativeFontFamilies.mono,
              fontSize: 12,
              lineHeight: 18,
              color: theme.text.primary,
            }}
          >
            {view.details}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
