import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import {
  applyChatHistoryShare,
  applyChatNotesTurns,
  buildChatContextSettings,
  CHAT_CONTEXT_SETTINGS_COPY,
  CHAT_HISTORY_SHARE_MAX,
  CHAT_HISTORY_SHARE_MIN,
  CHAT_NOTES_TURNS_MAX,
  CHAT_NOTES_TURNS_MIN,
  type ChatContextSettingsStored,
} from '../../../headless'
import { nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { IconChevron } from '../../icons'
import { Slider } from '../../primitives/Slider'

export type ChatContextSettingsProps = {
  completion: Partial<ChatContextSettingsStored>
  persistSettings: (patch: Partial<ChatContextSettingsStored>) => Promise<void> | void
  /** Opens with the section unfolded. */
  defaultOpen?: boolean
}

function SliderRow({
  label,
  hint,
  shown,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint: string
  shown: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const { theme } = useNativeTheme()
  return (
    <View style={{ gap: nativeSpace[1] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpace[3] }}>
        <Text
          style={{ flexShrink: 1, fontSize: 12, fontWeight: '500', color: theme.text.secondary }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>{shown}</Text>
      </View>
      <Slider value={value} min={min} max={max} onChange={onChange} />
      <Text style={{ fontSize: 11, color: theme.text.muted }}>{hint}</Text>
    </View>
  )
}

/** Native peer of the web `ChatContextSettings`: the advanced section of a chat's settings. */
export default function ChatContextSettings({
  completion,
  persistSettings,
  defaultOpen = false,
}: ChatContextSettingsProps) {
  const { theme } = useNativeTheme()
  const [open, setOpen] = useState(defaultOpen)
  const { historyShare, notesTurns } = buildChatContextSettings(completion)
  return (
    <View
      style={{
        gap: nativeSpace[3],
        paddingTop: nativeSpace[3],
        borderTopWidth: 1,
        borderTopColor: theme.border.subtle,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary }}>
          {CHAT_CONTEXT_SETTINGS_COPY.section}
        </Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <IconChevron size={14} color={theme.text.secondary} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ gap: nativeSpace[3] }}>
          <SliderRow
            label={CHAT_CONTEXT_SETTINGS_COPY.historyShare}
            hint={CHAT_CONTEXT_SETTINGS_COPY.historyShareHint}
            shown={`${historyShare}%`}
            value={historyShare}
            min={CHAT_HISTORY_SHARE_MIN}
            max={CHAT_HISTORY_SHARE_MAX}
            onChange={(percent) => void persistSettings(applyChatHistoryShare(percent))}
          />
          <SliderRow
            label={CHAT_CONTEXT_SETTINGS_COPY.notesTurns}
            hint={CHAT_CONTEXT_SETTINGS_COPY.notesTurnsHint}
            shown={notesTurns === 0 ? CHAT_CONTEXT_SETTINGS_COPY.off : String(notesTurns)}
            value={notesTurns}
            min={CHAT_NOTES_TURNS_MIN}
            max={CHAT_NOTES_TURNS_MAX}
            onChange={(turns) => void persistSettings(applyChatNotesTurns(turns))}
          />
        </View>
      ) : null}
    </View>
  )
}
