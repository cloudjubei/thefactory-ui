import { Text, View } from 'react-native'
import { Switch } from '../../primitives/Switch'
import { Slider } from '../../primitives/Slider'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'

export type MessageSanitization = {
  enabled: boolean
  keepLastMessages?: number
  maxAssistantChars?: number
  maxToolArgChars?: number
  maxToolContentChars?: number
  toolContentPreviewChars?: number
}

export type MessageSanitizationSettingsProps = {
  messageSanitization?: MessageSanitization
  persistSettings: (patch: { messageSanitization?: MessageSanitization }) => Promise<void> | void
}

/**
 * Native peer of web's `MessageSanitizationSettings`. Rendered in the
 * `ChatSettingsDropdown`'s `extraContent` slot.
 */
export default function MessageSanitizationSettings({
  messageSanitization,
  persistSettings,
}: MessageSanitizationSettingsProps) {
  const { theme } = useNativeTheme()
  const enabled = messageSanitization?.enabled ?? false
  const keepLast = messageSanitization?.keepLastMessages ?? 8

  const persist = (next: Partial<MessageSanitization>) => {
    void persistSettings({
      messageSanitization: {
        ...(messageSanitization ?? { enabled: false }),
        enabled,
        keepLastMessages: keepLast,
        ...next,
      },
    })
  }

  return (
    <View
      style={{
        gap: nativeSpace[3],
        paddingTop: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: nativeSpace[3],
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
            Message sanitization
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
            Clamp very large tool outputs/arguments before sending to the LLM
          </Text>
        </View>
        <Switch checked={enabled} onCheckedChange={(c) => persist({ enabled: c })} />
      </View>

      <View style={{ gap: nativeSpace[1] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary }}>
            Keep last messages
          </Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>{keepLast}</Text>
        </View>
        <Slider
          value={keepLast}
          min={0}
          max={30}
          onChange={(v) => persist({ keepLastMessages: v })}
          disabled={!enabled}
        />
      </View>
    </View>
  )
}
