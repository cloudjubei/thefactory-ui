import { memo, useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import Code from '../../Code'
import { PathDisplay } from '../../PathDisplay'
import { IconChevronDown, IconChevronRight } from '../../../icons'
import { isFilePathTool } from '../../../../headless/utils/toolPreview'
import type { ToolCallLike, ToolResultTypeLike } from '../../../../headless/utils/chatTypes'
import {
  nativePalette,
  nativeRadii,
  nativeSpace,
} from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import { StatusIcon, statusVisual } from './StatusIcon'

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
}

function jsonString(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
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
  renderResult,
  headerPath,
  onPreview,
}: ToolCallCardProps) {
  const { theme } = useNativeTheme()
  const [argsOpen, setArgsOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)

  const hasArgs = useMemo(() => {
    const a = toolCall.arguments
    if (!a) return false
    if (typeof a !== 'object') return true
    return Object.keys(a as object).length > 0
  }, [toolCall.arguments])

  const status = statusVisual(resultType)
  const isRequireConfirm = resultType === 'require_confirmation'
  const detail =
    resultType === 'errored'
      ? { code: jsonString(result), language: 'text' as const, label: 'View error' }
      : resultType === 'success'
        ? { code: jsonString(result), language: 'json' as const, label: 'View result' }
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
        backgroundColor: isRequireConfirm
          ? 'rgba(22,163,74,0.08)'
          : theme.surface.overlay,
      }}
    >
      {/* Header — status icon + name. The chevron lives in its own
          Pressable on the right so tapping it ONLY toggles args (doesn't
          open the preview). */}
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
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: '600',
            color: theme.text.primary,
          }}
          numberOfLines={1}
        >
          {toolCall.name}
        </Text>
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

      {headerPath ? (
        <View style={{ paddingHorizontal: PAD, paddingBottom: PAD }}>
          {isFilePathTool(toolCall.name) ? (
            <PathDisplay path={headerPath} />
          ) : (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: 'Menlo',
                fontSize: 11,
                color: theme.text.secondary,
              }}
            >
              {headerPath}
            </Text>
          )}
        </View>
      ) : null}

      {(status || durationMs) ? (
        // Status pill on the left, time-taken on the right. Mirrors web's
        // `<StatusPill>` row 1:1.
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: PAD,
            paddingBottom: PAD,
          }}
        >
          {status ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: nativeRadii.round,
                backgroundColor: status.pillBg,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: status.pillText,
                }}
              >
                {status.label}
              </Text>
            </View>
          ) : <View />}
          {durationMs ? (
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>
              {formatDurationLabel(durationMs)}
            </Text>
          ) : null}
        </View>
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
