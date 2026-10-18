import { Text, View } from 'react-native'
import type { LaunchSuggestionRow } from '../../../headless/utils/workLaunchViewTypes'
import {
  LAUNCH_SUGGEST_APPLY,
  LAUNCH_SUGGEST_BUSY,
  LAUNCH_SUGGEST_DISMISS,
  LAUNCH_SUGGEST_LABEL,
} from '../../../headless/utils/workLaunchViewConstants'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'

export type LaunchSuggestionPanelProps = {
  /** What the agent suggested, one row per setting — empty until asked. */
  rows: LaunchSuggestionRow[]
  /** The model that suggested it. */
  answeredBy?: string
  busy?: boolean
  error?: string
  onAsk: () => void
  onApply: () => void
  onDismiss: () => void
  disabled?: boolean
}

/** Native peer of the web launch card's "Suggest setup". Never launches. */
export default function LaunchSuggestionPanel({
  rows,
  answeredBy,
  busy,
  error,
  onAsk,
  onApply,
  onDismiss,
  disabled,
}: LaunchSuggestionPanelProps) {
  const { theme, status } = useNativeTheme()
  if (rows.length === 0) {
    return (
      <View style={{ gap: nativeSpace[1] }}>
        <View style={{ flexDirection: 'row' }}>
          <Button size="sm" variant="secondary" onPress={onAsk} disabled={busy || disabled}>
            {busy ? LAUNCH_SUGGEST_BUSY : LAUNCH_SUGGEST_LABEL}
          </Button>
        </View>
        {error ? <Text style={{ fontSize: 12, color: status.stuck.fg }}>{error}</Text> : null}
      </View>
    )
  }
  return (
    <View
      style={{
        gap: nativeSpace[2],
        borderWidth: 1,
        borderRadius: 8,
        padding: nativeSpace[2],
        borderColor: theme.accent.softBorder,
        backgroundColor: theme.accent.softBg,
      }}
    >
      {rows.map((row) => (
        <Text key={row.key} style={{ fontSize: 13, color: theme.text.primary }}>
          <Text style={{ fontWeight: '600' }}>{row.label}: </Text>
          {row.value}
          <Text style={{ color: theme.text.secondary }}> — {row.reason}</Text>
        </Text>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}>
        <Button size="sm" variant="primary" onPress={onApply} disabled={disabled}>
          {LAUNCH_SUGGEST_APPLY}
        </Button>
        <Button size="sm" variant="ghost" onPress={onDismiss}>
          {LAUNCH_SUGGEST_DISMISS}
        </Button>
        {answeredBy ? (
          <Text style={{ marginLeft: 'auto', fontSize: 11, color: theme.text.muted }}>
            by {answeredBy}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
