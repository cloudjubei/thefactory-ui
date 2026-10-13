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
import { NativeSelect } from '../../primitives/NativeSelect'
import ChatKindTile from '../chat/ChatKindTile'

/**
 * Settings › Notifications › Notify me: how much of each kind of chat reaches
 * the person — every chat can set its own from its settings menu — and how
 * the agents' own exchange shows in a conversation.
 */
export default function ChatNotifySettings() {
  const { settings, setNotifications } = useAppSettings()
  const prefs = settings.notifications
  return (
    <section aria-labelledby="notify-me-title" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h3 id="notify-me-title" className="font-medium">
          {NOTIFY_ME_TITLE}
        </h3>
        <p className="text-[12.5px] text-(--text-secondary)">{NOTIFY_ME_INTRO}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {CHAT_NOTIFY_KINDS.map(({ kind, label }) => (
          <label key={kind} className="flex items-center gap-2.5 text-[13px]">
            <ChatKindTile kind={CHAT_NOTIFY_KIND_TILES[kind]} size="sm" />
            <span className="flex-1">{label}</span>
            <NativeSelect
              size="sm"
              className="w-48"
              aria-label={label}
              value={prefs.chatNotifyLevels[kind]}
              onChange={(e) =>
                setNotifications({
                  chatNotifyLevels: {
                    ...prefs.chatNotifyLevels,
                    [kind]: e.target.value as ChatNotifyLevel,
                  },
                })
              }
            >
              {CHAT_NOTIFY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {CHAT_NOTIFY_LEVEL_LABELS[level]}
                </option>
              ))}
            </NativeSelect>
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-(--border-subtle) pt-3">
        <label className="flex items-center gap-2.5 text-[13px]">
          <span className="flex-1">{AGENT_MESSAGES_TITLE}</span>
          <NativeSelect
            size="sm"
            className="w-48"
            aria-label={AGENT_MESSAGES_TITLE}
            value={prefs.agentMessages}
            onChange={(e) =>
              setNotifications({ agentMessages: e.target.value as AgentMessagesDisplay })
            }
          >
            {AGENT_MESSAGES_DISPLAYS.map((display) => (
              <option key={display} value={display}>
                {AGENT_MESSAGES_DISPLAY_LABELS[display]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <p className="text-[12px] text-(--text-secondary)">{AGENT_MESSAGES_HINT}</p>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-(--border-subtle) pt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)">
          {NEEDS_ME_MEANING_TITLE}
        </div>
        <p className="text-[12.5px] text-(--text-secondary)">{NEEDS_ME_MEANING}</p>
      </div>
    </section>
  )
}
