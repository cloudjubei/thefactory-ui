import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Code from '../Code'
import { nativePalette, nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

/** Tool result status — execute result types plus the preview-flow states. */
export type ToolResultStatus =
  | 'success'
  | 'errored'
  | 'not_allowed'
  | 'aborted'
  | 'pending'
  | 'running'
  | 'require_confirmation'
  | 'preview'
  | 'not_supported'

export interface ToolResultPanelProps {
  status: ToolResultStatus
  /** Display label — defaults to a humanised `status`. */
  statusLabel?: string
  durationMs?: number
  /** The result payload — rendered as formatted JSON. */
  body: unknown
  /** Copy handler — host wires the platform clipboard. When omitted the copy
   *  affordance is hidden. */
  onCopy?: (text: string) => void
}

const STATUS_COLOR: Record<ToolResultStatus, string> = {
  success: nativePalette.green[700],
  errored: nativePalette.red[700],
  not_allowed: nativePalette.red[700],
  aborted: nativePalette.orange[700],
  pending: nativePalette.gray[700],
  running: nativePalette.blue[700],
  require_confirmation: nativePalette.orange[700],
  preview: nativePalette.blue[700],
  not_supported: nativePalette.gray[700],
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Native peer of web `ToolsView`'s `ResultPanel` — a tool preview / execute
 * result with a status-coloured header, optional duration, a JSON body, and
 * a copy affordance.
 */
export default function ToolResultPanel({
  status,
  statusLabel,
  durationMs,
  body,
  onCopy,
}: ToolResultPanelProps) {
  const { theme } = useNativeTheme()
  const text = useMemo(() => formatJson(body), [body])
  const label = statusLabel ?? status.replace(/_/g, ' ')

  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[3] }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          Result
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: STATUS_COLOR[status],
          }}
        >
          {label}
        </Text>
        {durationMs !== undefined ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{durationMs}ms</Text>
        ) : null}
        <View style={{ flex: 1 }} />
        {onCopy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy result"
            onPress={() => onCopy(text)}
            hitSlop={6}
            style={({ pressed }) => ({
              paddingHorizontal: nativeSpace[3],
              paddingVertical: nativeSpace[1],
              borderRadius: nativeRadii[2],
              borderWidth: 1,
              borderColor: theme.border.subtle,
              backgroundColor: pressed
                ? theme.surface.muted
                : theme.surface.overlay,
            })}
          >
            <Text style={{ fontSize: 11, color: theme.text.secondary }}>Copy</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
        <Code language="json" code={text} />
      </ScrollView>
    </View>
  )
}
