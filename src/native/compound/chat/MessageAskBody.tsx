import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'
import { parseResourceLink } from 'thefactory-tools/utils'

import {
  collapsedMessage,
  sendChatMessageTargetLink,
} from '../../../headless/utils/sendChatMessageView'
import { TOOL_ASK_COPY } from '../../../headless/utils/toolAskCardConstants'
import type { ToolAskBody } from '../../../headless/utils/toolAskCardTypes'
import { useProjectsOptional } from '../../../headless/contexts/ProjectsContext'
import { Switch } from '../../primitives/Switch'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { nativeRadii } from '../../../tokens/native'
import Markdown from '../Markdown'
import { renderProjectIcon } from '../projectIcons'

export type MessageAskBodyProps = {
  body: Extract<ToolAskBody, { kind: 'message' }>
  sourceChatTitle?: string
  awaitReply: boolean
  onAwaitReply: (next: boolean) => void
  busy: boolean
  onResourceLink?: (link: ResourceLink) => void
}

/**
 * Native peer of web's `MessageAskBody`: route, user bubble, fold, raw fallback,
 * sender line, and wait-for-reply on the shared tool-ask card.
 */
export default function MessageAskBody({
  body,
  sourceChatTitle,
  awaitReply,
  onAwaitReply,
  busy,
  onResourceLink,
}: MessageAskBodyProps) {
  const { theme, status } = useNativeTheme()
  const [expanded, setExpanded] = useState(false)
  const [rawOpen, setRawOpen] = useState(false)
  const projects = useProjectsOptional()?.projects
  const found = body.targetProjectId
    ? projects?.find((p) => p.id === body.targetProjectId)
    : undefined
  const icon =
    found && typeof (found as { metadata?: { icon?: unknown } }).metadata?.icon === 'string'
      ? ((found as { metadata?: { icon?: string } }).metadata?.icon as string)
      : undefined
  // Backend: targetTitle is the target CHAT's title; the project comes from targetProjectId.
  const chatTitle = body.targetTitle
  const projectTitle = found?.title
  const primary = projectTitle ?? chatTitle ?? body.target
  const secondary =
    projectTitle && chatTitle
      ? chatTitle
      : projectTitle && body.target !== projectTitle
        ? body.target
        : undefined
  const folded = body.message ? collapsedMessage(body.message) : undefined
  const shown = folded !== undefined && !expanded ? folded : body.message
  const link =
    onResourceLink && body.targetProjectId
      ? sendChatMessageTargetLink(body.targetProjectId)
      : undefined

  const openTarget = () => {
    if (!link || !onResourceLink) return
    const parsed = parseResourceLink(link)
    if (parsed) onResourceLink(parsed)
  }

  const targetChip = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
      {renderProjectIcon(icon, 16, theme.text.primary)}
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

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {TOOL_ASK_COPY.from}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }} numberOfLines={1}>
          {sourceChatTitle ?? TOOL_ASK_COPY.unknownChat}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.muted }}>→</Text>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.text.muted,
          }}
        >
          {TOOL_ASK_COPY.to}
        </Text>
        {link ? <Pressable onPress={openTarget}>{targetChip}</Pressable> : targetChip}
      </View>

      <Text style={{ fontSize: 11.5, color: theme.text.muted }}>
        {sourceChatTitle ? TOOL_ASK_COPY.sentBy(sourceChatTitle) : TOOL_ASK_COPY.sentByUnknown}
      </Text>

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
          {shown ? (
            <Markdown
              text={shown}
              onAccent
              textStyle={{ color: theme.text.inverted, fontSize: 13.5 }}
            />
          ) : (
            <Text style={{ fontSize: 13.5, fontStyle: 'italic', color: theme.text.inverted }}>
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

      {body.incomplete ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11.5, color: status.stuck.softFg }}>
            {TOOL_ASK_COPY.incompleteMessage}
          </Text>
          {body.raw !== undefined ? (
            <>
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
                    padding: 8,
                    borderRadius: nativeRadii[2],
                  }}
                >
                  {body.raw}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      <Switch
        checked={awaitReply}
        onCheckedChange={onAwaitReply}
        disabled={busy}
        label={TOOL_ASK_COPY.waitForReply}
      />
    </View>
  )
}
