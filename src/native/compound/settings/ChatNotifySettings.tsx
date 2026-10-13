import { Text, View } from 'react-native'
import { useAppSettings } from '../../../headless/contexts/AppSettingsContext'
import {
  AGENT_MESSAGES_DISPLAYS,
  AGENT_MESSAGES_DISPLAY_LABELS,
  AGENT_MESSAGES_HINT,
  AGENT_MESSAGES_TITLE,
  CHAT_NOTIFY_KINDS,
  CHAT_NOTIFY_KIND_TILES,
  CHAT_NOTIFY_LEVELS,
  CHAT_NOTIFY_LEVEL_LABELS,
  NEEDS_ME_MEANING,
  NEEDS_ME_MEANING_TITLE,
  NOTIFY_ME_INTRO,
  NOTIFY_ME_TITLE,
} from '../../../headless/utils/chatNotifyConstants'
import type { AgentMessagesDisplay, ChatNotifyLevel } from '../../../headless/utils/chatNotifyTypes'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import ChatKindTile from '../chat/ChatKindTile'

/** Native peer of web's `ChatNotifySettings`: Settings › Notifications › Notify me. */
export default function ChatNotifySettings() {
  const { theme } = useNativeTheme()
  const { settings, setNotifications } = useAppSettings()
  const prefs = settings.notifications
  const row = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border.subtle,
    backgroundColor: theme.surface.raised,
  } as const
  const caption = {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.text.muted,
  } as const
  const hint = { paddingHorizontal: 16, paddingTop: 8, fontSize: 12.5, color: theme.text.secondary }
  return (
    <View>
      <Text accessibilityRole="header" style={caption}>
        {NOTIFY_ME_TITLE}
      </Text>
      <Text style={{ ...hint, paddingTop: 0, paddingBottom: 8 }}>{NOTIFY_ME_INTRO}</Text>
      {CHAT_NOTIFY_KINDS.map(({ kind, label }) => (
        <View key={kind} style={row}>
          <ChatKindTile kind={CHAT_NOTIFY_KIND_TILES[kind]} size="sm" />
          <Text style={{ flex: 1, fontSize: 15, color: theme.text.primary }}>{label}</Text>
          <View style={{ width: 180 }}>
            <Select
              value={prefs.chatNotifyLevels[kind]}
              onValueChange={(v) =>
                setNotifications({
                  chatNotifyLevels: { ...prefs.chatNotifyLevels, [kind]: v as ChatNotifyLevel },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={label} />
              </SelectTrigger>
              <SelectContent>
                {CHAT_NOTIFY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {CHAT_NOTIFY_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        </View>
      ))}
      <Text style={caption}>{AGENT_MESSAGES_TITLE}</Text>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <Select
            value={prefs.agentMessages}
            onValueChange={(v) => setNotifications({ agentMessages: v as AgentMessagesDisplay })}
          >
            <SelectTrigger>
              <SelectValue placeholder={AGENT_MESSAGES_TITLE} />
            </SelectTrigger>
            <SelectContent>
              {AGENT_MESSAGES_DISPLAYS.map((display) => (
                <SelectItem key={display} value={display}>
                  {AGENT_MESSAGES_DISPLAY_LABELS[display]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
      </View>
      <Text style={hint}>{AGENT_MESSAGES_HINT}</Text>
      <Text style={caption}>{NEEDS_ME_MEANING_TITLE}</Text>
      <Text style={{ ...hint, paddingTop: 0 }}>{NEEDS_ME_MEANING}</Text>
    </View>
  )
}
