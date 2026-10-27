import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  SEND_CHAT_MESSAGE_COPY as COPY,
  SEND_CHAT_MESSAGE_OUTCOME_LABEL,
  collapsedMessage,
  type SendChatMessageOutcomeStatus,
  type SendChatMessageView,
} from '../../../headless/utils/sendChatMessageView'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import Markdown from '../Markdown'
import { renderProjectIcon } from '../projectIcons'

export type SendChatMessagePreviewProps = {
  view: SendChatMessageView
  project?: { title?: string; iconKey?: string }
  sourceChatTitle?: string
  onOpenTarget?: () => void
  defaultExpanded?: boolean
  defaultRawOpen?: boolean
}

const OUTCOME_COLOR: Record<SendChatMessageOutcomeStatus, 'review' | 'working' | 'done' | 'stuck'> =
  {
    awaiting: 'review',
    sending: 'working',
    sent: 'done',
    denied: 'stuck',
    failed: 'stuck',
    cancelled: 'stuck',
  }

/**
 * Native peer of web's `SendChatMessagePreview` — inline tool row and hover
 * equivalent for what `sendChatMessage` will post, and where.
 */
export default function SendChatMessagePreview({
  view,
  project,
  sourceChatTitle,
  onOpenTarget,
  defaultExpanded = false,
  defaultRawOpen = false,
}: SendChatMessagePreviewProps) {
  const { theme, status } = useNativeTheme()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [rawOpen, setRawOpen] = useState(defaultRawOpen)

  const projectTitle = project?.title
  const chatTitle = view.target.chatTitle
  const source = view.source.chatTitle ?? sourceChatTitle
  const folded = view.message !== undefined ? collapsedMessage(view.message) : undefined
  const shown = folded !== undefined && !expanded ? folded : view.message
  const decided = view.outcome.status !== 'awaiting' && view.outcome.status !== 'sending'
  const incomplete = view.missing.length > 0

  const primary =
    projectTitle ??
    chatTitle ??
    view.target.label ??
    view.target.projectId ??
    TOOL_ASK_COPY.unknownChat
  const secondary =
    projectTitle && chatTitle
      ? chatTitle
      : projectTitle && view.target.label && view.target.label !== projectTitle
        ? view.target.label
        : undefined

  const labelStyle = {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
  }

  const targetChip = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {renderProjectIcon(project?.iconKey, 16, theme.text.primary)}
      <Text
        style={{ fontSize: 12.5, fontWeight: '600', color: theme.text.primary }}
        numberOfLines={1}
      >
        {primary}
      </Text>
      {secondary ? (
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }} numberOfLines={1}>
          {`· ${secondary}`}
        </Text>
      ) : null}
    </View>
  )

  const tone = OUTCOME_COLOR[view.outcome.status]
  const toneFg =
    tone === 'done'
      ? status.done.softFg
      : tone === 'stuck'
        ? status.stuck.softFg
        : tone === 'working'
          ? status.working.softFg
          : status.review.softFg

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text style={labelStyle}>{TOOL_ASK_COPY.from}</Text>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }} numberOfLines={1}>
          {source ?? TOOL_ASK_COPY.unknownChat}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.muted }}>→</Text>
        <Text style={labelStyle}>{TOOL_ASK_COPY.to}</Text>
        {onOpenTarget ? <Pressable onPress={onOpenTarget}>{targetChip}</Pressable> : targetChip}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {view.awaitReply ? (
          <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>{COPY.waitsForReply}</Text>
        ) : null}
        {view.held ? (
          <Text style={{ fontSize: 11.5, color: status.working.softFg }}>{COPY.held}</Text>
        ) : null}
        {view.agentStarted ? (
          <Text style={{ fontSize: 11.5, color: status.working.softFg }}>{COPY.agentStarted}</Text>
        ) : null}
        <Text style={{ fontSize: 11.5, color: theme.text.muted }}>
          {source ? TOOL_ASK_COPY.sentBy(source) : TOOL_ASK_COPY.sentByUnknown}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View
          style={{
            maxWidth: '100%',
            borderRadius: nativeRadii[3],
            borderBottomRightRadius: nativeRadii[1],
            backgroundColor: theme.accent.primary,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          {shown !== undefined ? (
            <Markdown
              text={shown}
              onAccent
              textStyle={{ color: theme.text.onAccent, fontSize: 13.5 }}
            />
          ) : (
            <Text style={{ fontSize: 13.5, fontStyle: 'italic', color: theme.text.onAccent }}>
              {TOOL_ASK_COPY.noMessage}
            </Text>
          )}
        </View>
        {folded !== undefined ? (
          <Pressable onPress={() => setExpanded((v) => !v)}>
            <Text style={{ fontSize: 11.5, color: theme.accent.primary }}>
              {expanded ? TOOL_ASK_COPY.showLess : TOOL_ASK_COPY.showMore}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {incomplete ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11.5, color: status.stuck.softFg }}>{COPY.incomplete}</Text>
          <Pressable onPress={() => setRawOpen((v) => !v)}>
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
              {TOOL_ASK_COPY.rawPayload}
            </Text>
          </Pressable>
          {rawOpen ? (
            <Text
              style={{
                fontFamily: 'Menlo',
                fontSize: 11,
                color: theme.text.primary,
                backgroundColor: theme.surface.muted,
                padding: nativeSpace[2],
                borderRadius: nativeRadii[2],
              }}
            >
              {view.raw}
            </Text>
          ) : null}
        </View>
      ) : null}

      {view.outcome.status !== 'awaiting' ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            paddingTop: nativeSpace[2],
          }}
        >
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: toneFg }}>
            {SEND_CHAT_MESSAGE_OUTCOME_LABEL[view.outcome.status]}
          </Text>
          {view.outcome.detail ? (
            <Text style={{ fontSize: 11.5, color: theme.text.secondary }}>
              {view.outcome.detail}
            </Text>
          ) : null}
          {decided && onOpenTarget ? (
            <Pressable onPress={onOpenTarget} style={{ marginLeft: 'auto' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.accent.primary }}>
                {COPY.openTarget} →
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
