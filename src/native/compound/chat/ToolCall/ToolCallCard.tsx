import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { slowToolLabel } from '../../../../headless/utils/backgroundJobs'
import { TOOL_SLOW_TICK_MS } from '../../../../headless/utils/backgroundJobsConstants'
import { Pressable, Text, View } from 'react-native'
import type { ResourceLink } from 'thefactory-tools/types'
import Code from '../../Code'
import { Switch } from '../../../primitives/Switch'
import { IconChevronDown, IconChevronRight } from '../../../icons'
import {
  safePreviewString,
  toolArgDisplay,
  toolNotRunReason,
  toolRowReason,
} from '../../../../headless/utils/toolPreview'
import type {
  AlwaysAllowScope,
  GrantCovers,
  PendingToolGrant,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../../headless/utils/chatTypes'
import { toolAskRowView } from '../../../../headless/utils/toolAskRow'
import ToolAskRowCard from '../ToolAskRowCard'
import { alwaysAllowChoiceView } from '../../../../headless/utils/alwaysAllow'
import {
  isSendChatMessageTool,
  sendChatMessageView,
} from '../../../../headless/utils/sendChatMessageView'
import AlwaysAllowControl from '../AlwaysAllowControl'
import SendChatMessageCard from '../SendChatMessageCard'
import StoredSecretCard from '../StoredSecretCard'
import {
  isShowStoredSecretTool,
  storedSecretView,
} from '../../../../headless/utils/storedSecretView'
import { nativePalette, nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { StatusChip, StatusIcon, statusVisual } from './StatusIcon'
import ToolArgInline from './ToolArgInline'
import ToolOriginBadge from './ToolOriginBadge'
import ToolRowMilestoneLine from './ToolRowMilestoneLine'
import { toolRowFellShort, toolRowMilestone } from '../../../../headless/utils/gitSetupApproval'
import { commitReceiptView } from '../../../../headless/utils/gitChangeApproval'
import { CommitReceiptConnected } from '../CommitReceipt'

function formatDurationLabel(ms?: number): string | undefined {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return undefined
  if (ms < 1000) return `${Math.round(ms)} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = s - m * 60
  return `${m}m ${rem.toFixed(0)}s`
}

export type ToolCallCardProps = {
  toolCall: ToolCallLike
  result?: unknown
  resultType?: ToolResultTypeLike
  durationMs?: number
  /** When the call was made — a running call says where it waits once it has run a while. */
  startedAt?: string
  /** Optional pluggable result renderer — same registry contract as web. */
  renderResult?: (args: {
    toolCall: ToolCallLike
    result?: unknown
    resultType?: ToolResultTypeLike
  }) => ReactNode
  /** Optional headline (e.g. the file the tool operates on). */
  headerPath?: string
  /**
   * Touch analogue of web's hover card — tapping the card body opens a
   * bottom sheet with the full preview. The chevron and "View result"
   * rows each have their own `Pressable` so they consume their own
   * touches and do NOT bubble to this handler.
   */
  onPreview?: () => void
  /** When true, the card shows a toggle granting this call inside a batch awaiting approval. */
  selectable?: boolean
  /** Whether the toggle is on. */
  selected?: boolean
  onToggleSelect?: () => void
  /** Where "Always allow" may apply for this call, the default first. Defaults to this chat only. */
  alwaysAllowScopes?: readonly AlwaysAllowScope[]
  /** What an always-allow of this call covers. Defaults to the whole tool. */
  grantCovers?: GrantCovers
  /** Marked "Always allow" in this place: the batch's Resume grants it there. */
  alwaysAllowScope?: AlwaysAllowScope
  /** Mark "Always allow" in `scope`, or (`undefined`) unmark — offered beside the toggle. */
  onAlwaysAllow?: (scope: AlwaysAllowScope | undefined) => void
  /** Route an in-app `overseer://…` link on the row (a sent message's target chat). */
  onResourceLink?: (link: ResourceLink) => void
  /** The chat this row is in, by name — the sender of a message the call sends to another chat. */
  sourceChatTitle?: string
  /**
   * The ask this row decides. Where its card says more than the row, the row
   * reads compact — the card's headline, "Cannot be undone" where it is — and
   * opens to that card on tap, in place of the preview.
   */
  ask?: PendingToolGrant
  /** Start with the ask's card open. */
  askOpen?: boolean
}

const CHAT_ONLY: readonly AlwaysAllowScope[] = ['chat']

function jsonString(v: unknown): string {
  return safePreviewString(v).text
}

/**
 * Native peer of [web's `ToolCallCard`](../../../../web/compound/chat/ToolCall/ToolCallCard.tsx).
 * Web reveals arguments / results in a hover card — touch has no hover, so
 * the native card uses inline collapsible disclosures instead.
 */
function ToolCallCardInner({
  toolCall,
  result,
  resultType,
  durationMs,
  startedAt,
  renderResult,
  onPreview,
  selectable = false,
  selected = false,
  onToggleSelect,
  alwaysAllowScopes = CHAT_ONLY,
  grantCovers = 'tool',
  alwaysAllowScope,
  onAlwaysAllow,
  onResourceLink,
  sourceChatTitle,
  ask,
  askOpen = false,
}: ToolCallCardProps) {
  const { theme, status: statusTokens } = useNativeTheme()
  const [argsOpen, setArgsOpen] = useState(false)
  const askView = useMemo(
    () => (ask && selectable ? toolAskRowView(ask) : undefined),
    [ask, selectable],
  )
  const [cardOpen, setCardOpen] = useState(askOpen)
  const storedSecret = useMemo(
    () =>
      isShowStoredSecretTool(toolCall.name)
        ? storedSecretView({ args: toolCall.arguments, result, resultType })
        : undefined,
    [toolCall.name, toolCall.arguments, result, resultType],
  )
  const [resultOpen, setResultOpen] = useState(false)
  // A running call's row counts how long it has waited; nothing else re-renders
  // a memoised card while its call is open.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (resultType !== 'running' || startedAt === undefined) return
    const id = setInterval(() => setTick((t) => t + 1), TOOL_SLOW_TICK_MS)
    return () => clearInterval(id)
  }, [resultType, startedAt])

  const hasArgs = useMemo(() => {
    const a = toolCall.arguments
    if (!a) return false
    if (typeof a !== 'object') return true
    return Object.keys(a as object).length > 0
  }, [toolCall.arguments])

  // Compact one-line args on their own line under the name, as web's narrow row
  // (paths render with the nice dir+filename display, a command/pattern as a
  // monospace snippet); the
  // full args expand under the chevron. Falls back to a JSON one-liner when no
  // single field stands in for the call.
  const argDisplay = useMemo(() => {
    if (!hasArgs) return null
    return (
      toolArgDisplay(toolCall) ?? { kind: 'text' as const, text: jsonString(toolCall.arguments) }
    )
  }, [hasArgs, toolCall])
  const timeLabel = formatDurationLabel(durationMs)
  const milestone = toolRowMilestone(
    toolCall.name,
    result,
    resultType,
    toolCall.awaitingDecision === true,
    toolCall.executionResult,
  )

  // A commit the person approved is one receipt line, in place of the row —
  // see the web peer.
  const receipt = commitReceiptView(toolCall.name, result, resultType, toolCall.changeFiles)
  if (receipt) return <CommitReceiptConnected view={receipt} runId={toolCall.runId} />

  const status = statusVisual(resultType)
  const isRequireConfirm = resultType === 'require_confirmation'
  const reason = toolRowReason(resultType, result)
  const detail =
    resultType === 'errored'
      ? { code: jsonString(result), language: 'text' as const, label: 'View error' }
      : resultType === 'success'
        ? { code: jsonString(result), language: 'json' as const, label: 'View result' }
        : resultType === 'not_allowed' && result !== undefined && reason === undefined
          ? {
              code: toolNotRunReason(result),
              language: 'text' as const,
              label: 'Why it did not run',
            }
          : null

  // sendChatMessage already surfaces its preview (or a host renderResult) above.
  const custom =
    !isSendChatMessageTool(toolCall.name) && renderResult
      ? renderResult({ toolCall, result, resultType })
      : null

  // Inner padding — `nativeSpace[4]` = 8px — applied uniformly across the
  // header / status row / args / result blocks so each section reads with
  // the same breathing room. Matches web's `px-3 py-2` once we tighten
  // the chrome to vector icons.
  const PAD = nativeSpace[4]

  // Outer Pressable opens the bottom-sheet preview. The chevron and the
  // "View result" row each render their own inner `Pressable`, which
  // consumes the touch (React Native gestures route to the deepest
  // pressable for any tap), so tapping near either of those does NOT
  // bubble to the card-level preview handler — matches the user's spec
  // for item 7.
  const onPress = askView ? () => setCardOpen((v) => !v) : onPreview
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        askView
          ? cardOpen
            ? 'Hide details'
            : 'Show details'
          : onPreview
            ? `Show preview for ${toolCall.name}`
            : undefined
      }
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: isRequireConfirm ? nativePalette.green[600] : theme.border.subtle,
        backgroundColor: isRequireConfirm ? 'rgba(22,163,74,0.08)' : theme.surface.overlay,
      }}
    >
      {/* Row 1: status icon · name · compact input · time chip · chevron. The
          icon (left) conveys outcome, so no separate status pill. The chevron
          has its own Pressable so tapping it only toggles args. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: PAD,
          paddingTop: PAD,
          paddingBottom: PAD,
        }}
      >
        {status ? (
          toolRowFellShort(resultType, milestone) ? (
            <StatusIcon kind="fell_short" color={nativePalette.gold[600]} />
          ) : (
            <StatusIcon kind={status.kind} color={status.iconColor} />
          )
        ) : null}
        <Text
          style={{ flexShrink: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}
          numberOfLines={1}
        >
          {toolCall.name}
        </Text>
        <ToolOriginBadge origin={toolCall.origin} />
        <View style={{ flex: 1 }} />
        <StatusChip
          resultType={resultType}
          timeLabel={timeLabel}
          awaitingDecision={toolCall.awaitingDecision === true}
          slowLabel={
            resultType === 'running'
              ? slowToolLabel({
                  ...(toolCall.origin !== undefined ? { origin: toolCall.origin } : {}),
                  ...(startedAt !== undefined ? { startedAt } : {}),
                  nowMs: Date.now(),
                })
              : undefined
          }
        />
        {askView?.tag ? (
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 0,
              borderRadius: nativeRadii.round,
              overflow: 'hidden',
              paddingHorizontal: nativeSpace[3],
              paddingVertical: 1,
              fontSize: 11,
              fontWeight: '600',
              color: statusTokens.blocked.softFg,
              backgroundColor: statusTokens.blocked.softBg,
            }}
          >
            {askView.tag}
          </Text>
        ) : null}
        {selectable && onAlwaysAllow ? (
          <AlwaysAllowControl
            view={alwaysAllowChoiceView({
              scopes: alwaysAllowScopes,
              toolName: toolCall.name,
              covers: grantCovers,
              ...(alwaysAllowScope ? { marked: alwaysAllowScope } : {}),
            })}
            toolName={toolCall.name}
            onChoose={onAlwaysAllow}
          />
        ) : null}
        {selectable ? (
          <Switch checked={selected} onCheckedChange={() => onToggleSelect?.()} />
        ) : null}
        {askView ? (
          <Pressable
            onPress={() => setCardOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={cardOpen ? 'Hide details' : 'Show details'}
            hitSlop={8}
            style={{ padding: 2 }}
          >
            {cardOpen ? (
              <IconChevronDown size={14} color={theme.text.secondary} />
            ) : (
              <IconChevronRight size={14} color={theme.text.secondary} />
            )}
          </Pressable>
        ) : hasArgs ? (
          <Pressable
            onPress={() => setArgsOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={argsOpen ? 'Hide arguments' : 'Show arguments'}
            hitSlop={8}
            style={{ padding: 2 }}
          >
            {argsOpen ? (
              <IconChevronDown size={14} color={theme.text.secondary} />
            ) : (
              <IconChevronRight size={14} color={theme.text.secondary} />
            )}
          </Pressable>
        ) : null}
      </View>

      {askView ? (
        <Text
          numberOfLines={1}
          style={{
            marginTop: -nativeSpace[2],
            paddingHorizontal: PAD,
            paddingBottom: PAD,
            fontSize: 13,
            color: theme.text.secondary,
          }}
        >
          {askView.headline}
        </Text>
      ) : argDisplay ? (
        <View
          style={{
            flexDirection: 'row',
            marginTop: -nativeSpace[2],
            paddingHorizontal: PAD,
            paddingBottom: PAD,
          }}
        >
          <ToolArgInline display={argDisplay} />
        </View>
      ) : null}

      {reason ? (
        <Text
          numberOfLines={3}
          style={{
            marginTop: -nativeSpace[2],
            paddingHorizontal: PAD,
            paddingBottom: PAD,
            fontSize: 12,
            lineHeight: 16,
            color: resultType === 'errored' ? statusTokens.stuck.softFg : theme.text.secondary,
          }}
        >
          {reason}
        </Text>
      ) : null}

      {milestone ? <ToolRowMilestoneLine milestone={milestone} /> : null}

      {isSendChatMessageTool(toolCall.name) ? (
        <View
          style={{
            paddingHorizontal: PAD,
            paddingTop: PAD,
            paddingBottom: PAD,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          {renderResult?.({ toolCall, result, resultType }) ?? (
            <SendChatMessageCard
              view={sendChatMessageView({
                args: toolCall.arguments,
                result,
                ...(resultType !== undefined ? { resultType } : {}),
              })}
              {...(onResourceLink ? { onResourceLink } : {})}
              {...(sourceChatTitle ? { sourceChatTitle } : {})}
            />
          )}
        </View>
      ) : null}

      {storedSecret ? (
        <View
          style={{
            paddingHorizontal: PAD,
            paddingTop: PAD,
            paddingBottom: PAD,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          <StoredSecretCard secret={storedSecret} />
        </View>
      ) : null}

      {toolCall.decisionNote ? (
        <Text
          style={{
            paddingHorizontal: PAD,
            paddingBottom: nativeSpace[2],
            fontSize: 11,
            color: theme.text.secondary,
          }}
        >
          {toolCall.decisionNote}
        </Text>
      ) : null}

      {argsOpen && hasArgs ? (
        <View
          style={{
            paddingHorizontal: PAD,
            paddingTop: PAD,
            paddingBottom: PAD,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          <Code language="json" code={jsonString(toolCall.arguments)} />
        </View>
      ) : null}

      {custom ? (
        <View
          style={{
            paddingHorizontal: PAD,
            paddingTop: PAD,
            paddingBottom: PAD,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          {custom}
        </View>
      ) : detail ? (
        // The "View result" row + its expanded body are their own
        // Pressables — taps inside this section don't bubble to the
        // card-root preview handler. Per the user's item-7 spec.
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
          <Pressable
            onPress={() => setResultOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={resultOpen ? 'Hide result' : detail.label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: PAD,
              paddingVertical: PAD,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.primary }}>
              {detail.label}
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>
              {resultOpen ? '−' : '+'}
            </Text>
          </Pressable>
          {resultOpen ? (
            <Pressable
              // Wrap the expanded body in a Pressable too so taps on the
              // code block are absorbed here instead of bubbling to the
              // outer card → preview handler.
              onPress={() => {}}
              style={{
                paddingHorizontal: PAD,
                paddingTop: PAD,
                paddingBottom: PAD,
                borderTopWidth: 1,
                borderTopColor: theme.border.subtle,
              }}
            >
              <Code language={detail.language} code={detail.code} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {ask && askView && cardOpen ? (
        <Pressable
          onPress={() => {}}
          accessible={false}
          style={{
            padding: PAD,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
            backgroundColor: theme.surface.base,
          }}
        >
          <ToolAskRowCard grant={ask} onClose={() => setCardOpen(false)} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

export default memo(ToolCallCardInner)
