import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { slowToolLabel } from '../../../../headless/utils/backgroundJobs'
import { TOOL_SLOW_TICK_MS } from '../../../../headless/utils/backgroundJobsConstants'
import { Pressable, Text, View } from 'react-native'
import Code from '../../Code'
import { Switch } from '../../../primitives/Switch'
import { IconChevronDown, IconChevronRight } from '../../../icons'
import {
  safePreviewString,
  toolArgDisplay,
  toolNotRunReason,
} from '../../../../headless/utils/toolPreview'
import type {
  AlwaysAllowScope,
  GrantCovers,
  ToolCallLike,
  ToolResultTypeLike,
} from '../../../../headless/utils/chatTypes'
import { alwaysAllowChoiceView } from '../../../../headless/utils/alwaysAllow'
import AlwaysAllowControl from '../AlwaysAllowControl'
import { nativePalette, nativeRadii, nativeSpace } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { StatusChip, StatusIcon, statusVisual } from './StatusIcon'
import ToolArgInline from './ToolArgInline'
import ToolOriginBadge from './ToolOriginBadge'
import ToolRowMilestoneLine from './ToolRowMilestoneLine'
import { toolRowMilestone } from '../../../../headless/utils/gitSetupApproval'
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
}: ToolCallCardProps) {
  const { theme } = useNativeTheme()
  const [argsOpen, setArgsOpen] = useState(false)
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

  // Compact one-line args shown inline next to the name (paths render with the
  // nice dir+filename display, a command/pattern as a monospace snippet); the
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
  )

  // A commit the person approved is one receipt line, in place of the row —
  // see the web peer.
  const receipt = commitReceiptView(toolCall.name, result, resultType, toolCall.changeFiles)
  if (receipt) return <CommitReceiptConnected view={receipt} runId={toolCall.runId} />

  const status = statusVisual(resultType)
  const isRequireConfirm = resultType === 'require_confirmation'
  const detail =
    resultType === 'errored'
      ? { code: jsonString(result), language: 'text' as const, label: 'View error' }
      : resultType === 'success'
        ? { code: jsonString(result), language: 'json' as const, label: 'View result' }
        : resultType === 'not_allowed' && result !== undefined
          ? {
              code: toolNotRunReason(result),
              language: 'text' as const,
              label: 'Why it did not run',
            }
          : null

  const custom = renderResult ? renderResult({ toolCall, result, resultType }) : null

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
  return (
    <Pressable
      onPress={onPreview}
      disabled={!onPreview}
      accessibilityRole={onPreview ? 'button' : undefined}
      accessibilityLabel={onPreview ? `Show preview for ${toolCall.name}` : undefined}
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
        {status ? <StatusIcon kind={status.kind} color={status.iconColor} /> : null}
        <Text
          style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}
          numberOfLines={1}
        >
          {toolCall.name}
        </Text>
        <ToolOriginBadge origin={toolCall.origin} />
        <ToolArgInline display={argDisplay} />
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
        {hasArgs ? (
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

      {milestone ? <ToolRowMilestoneLine milestone={milestone} /> : null}

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
    </Pressable>
  )
}

export default memo(ToolCallCardInner)
