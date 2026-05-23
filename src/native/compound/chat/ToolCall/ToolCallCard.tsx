import { memo, useMemo, useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import Code from '../../Code'
import { IconChevronDown, IconChevronRight } from '../../../icons'
import type { ToolCallLike, ToolResultTypeLike } from '../../../../headless/utils/chatTypes'
import {
  nativeLightTheme,
  nativePalette,
  nativeRadii,
  nativeSpace,
} from '../../../../tokens/native'

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
}

function jsonString(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

type StatusVisual = { icon: string; color: string; label: string }

function statusVisual(resultType?: ToolResultTypeLike): StatusVisual {
  switch (resultType) {
    case 'errored':
      return { icon: '⨯', color: nativePalette.red[500], label: 'errored' }
    case 'aborted':
      return { icon: '◼', color: nativePalette.orange[500], label: 'aborted' }
    case 'not_allowed':
      return { icon: '⊘', color: nativeLightTheme.text.muted, label: 'not allowed' }
    case 'pending':
    case 'running':
      return { icon: '⧖', color: nativePalette.blue[500], label: resultType }
    case 'require_confirmation':
      return { icon: '⧖', color: nativePalette.green[600], label: 'needs confirmation' }
    case 'success':
      return { icon: '✓', color: nativePalette.green[600], label: 'success' }
    default:
      return { icon: '✓', color: nativeLightTheme.text.muted, label: '' }
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
}: ToolCallCardProps) {
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

  return (
    <View
      style={{
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: isRequireConfirm ? nativePalette.green[600] : nativeLightTheme.border.subtle,
        backgroundColor: isRequireConfirm
          ? 'rgba(22,163,74,0.08)'
          : nativeLightTheme.surface.overlay,
      }}
    >
      {/* Header */}
      <Pressable
        onPress={() => hasArgs && setArgsOpen((v) => !v)}
        disabled={!hasArgs}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: nativeSpace[2],
          paddingHorizontal: nativeSpace[3],
          paddingTop: nativeSpace[2],
          paddingBottom: nativeSpace[1],
        }}
      >
        <Text style={{ fontSize: 13, color: status.color }}>{status.icon}</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: '600',
            color: nativeLightTheme.text.primary,
          }}
          numberOfLines={1}
        >
          {toolCall.name}
        </Text>
        {durationMs ? (
          <Text style={{ fontSize: 11, color: nativeLightTheme.text.secondary }}>
            {durationMs}ms
          </Text>
        ) : null}
        {hasArgs ? (
          argsOpen ? (
            <IconChevronDown size={14} color={nativeLightTheme.text.secondary} />
          ) : (
            <IconChevronRight size={14} color={nativeLightTheme.text.secondary} />
          )
        ) : null}
      </Pressable>

      {headerPath ? (
        <Text
          numberOfLines={1}
          style={{
            paddingHorizontal: nativeSpace[3],
            fontFamily: 'Menlo',
            fontSize: 11,
            color: nativeLightTheme.text.secondary,
          }}
        >
          {headerPath}
        </Text>
      ) : null}

      {status.label ? (
        <View style={{ paddingHorizontal: nativeSpace[3], paddingVertical: nativeSpace[2] }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: nativeSpace[2],
              paddingVertical: 1,
              borderRadius: nativeRadii.round,
              backgroundColor: status.color,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: '700',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: '#ffffff',
              }}
            >
              {status.label}
            </Text>
          </View>
        </View>
      ) : null}

      {argsOpen && hasArgs ? (
        <View style={{ paddingHorizontal: nativeSpace[3], paddingBottom: nativeSpace[2] }}>
          <Code language="json" code={jsonString(toolCall.arguments)} />
        </View>
      ) : null}

      {custom ? (
        <View
          style={{
            paddingHorizontal: nativeSpace[3],
            paddingBottom: nativeSpace[2],
            borderTopWidth: 1,
            borderTopColor: nativeLightTheme.border.subtle,
            paddingTop: nativeSpace[2],
          }}
        >
          {custom}
        </View>
      ) : detail ? (
        <View style={{ borderTopWidth: 1, borderTopColor: nativeLightTheme.border.subtle }}>
          <Pressable
            onPress={() => setResultOpen((v) => !v)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[2],
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: nativeLightTheme.text.primary }}>
              {detail.label}
            </Text>
            <Text style={{ fontSize: 13, color: nativeLightTheme.text.secondary }}>
              {resultOpen ? '−' : '+'}
            </Text>
          </Pressable>
          {resultOpen ? (
            <View
              style={{
                paddingHorizontal: nativeSpace[3],
                paddingBottom: nativeSpace[2],
                borderTopWidth: 1,
                borderTopColor: nativeLightTheme.border.subtle,
                paddingTop: nativeSpace[2],
              }}
            >
              <Code language={detail.language} code={detail.code} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export default memo(ToolCallCardInner)
