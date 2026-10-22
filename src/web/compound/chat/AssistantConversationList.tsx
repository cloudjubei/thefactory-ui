import { useEffect, useState } from 'react'
import type { ChatContext } from 'thefactory-tools/types'

import {
  ASSISTANT_COPY,
  CHAT_LIST_COPY,
  CHAT_LIST_NOTICE_MS,
  formatFriendlyTimestamp,
  inkBadgeLook,
  useAppSettings,
  useChats,
  type AssistantRow,
  type InkBadgeLook,
} from '../../../headless'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { CHAT_NOTIFY_MUTED_LABEL } from '../../../headless/utils/chatNotifyConstants'
import { IconBellOff, IconDotsVertical, IconPlus } from '../../icons'
import DotBadge from '../../primitives/DotBadge'
import { useToast } from '../../primitives/Toast'
import InkBadge from '../shell/InkBadge'

export type AssistantConversationListProps = {
  /** The conversations in the list, the one being started at the top. */
  conversations: readonly AssistantRow[]
  /** The conversations archived from the list. */
  archived: readonly AssistantRow[]
  /** The conversation on screen, highlighted. */
  activeKey?: string
  onOpen: (context: ChatContext) => void
  /** Starts a new conversation. */
  onNew: () => void
}

/**
 * The Assistant's conversation list: newest first, each with its title, when
 * it last had a message and a blue dot for a reply not read yet; ⋯ switches to
 * the conversations archived from the list and back; + starts a new one. A
 * conversation archived or moved back says so in a toast, with Undo. The
 * native `AssistantConversationList` draws the same list.
 */
export default function AssistantConversationList({
  conversations,
  archived,
  activeKey,
  onOpen,
  onNew,
}: AssistantConversationListProps) {
  const { chatListNotice, dismissChatListNotice, showChatInList } = useChats()
  const { settings } = useAppSettings()
  const { toast } = useToast()
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!chatListNotice) return
    const undo = chatListNotice.undo
    toast({
      description: chatListNotice.text,
      durationMs: CHAT_LIST_NOTICE_MS,
      ...(undo
        ? { action: { label: CHAT_LIST_COPY.undo, onClick: () => void showChatInList(undo) } }
        : {}),
    })
    dismissChatListNotice()
  }, [chatListNotice, dismissChatListNotice, showChatInList, toast])

  const rows = showArchived ? archived : conversations
  const toggleLabel = showArchived
    ? ASSISTANT_COPY.backToConversations
    : ASSISTANT_COPY.showArchived
  const look = inkBadgeLook(settings.userPreferences)
  const badgeColors = settings.notifications.badgeColors

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 px-3 pt-3 pb-2">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-(--text-primary)">
          {showArchived ? ASSISTANT_COPY.archived : ASSISTANT_COPY.conversations}
        </span>
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          aria-label={toggleLabel}
          aria-pressed={showArchived}
          title={`${toggleLabel} (${archived.length})`}
          className="inline-flex size-7 items-center justify-center rounded-md text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
        >
          <IconDotsVertical className="size-4 rotate-90" />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowArchived(false)
            onNew()
          }}
          aria-label={ASSISTANT_COPY.newConversation}
          title={ASSISTANT_COPY.newConversation}
          className="inline-flex size-7 items-center justify-center rounded-md border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
        >
          <IconPlus className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-px overflow-auto px-1.5 pb-2">
        {rows.map((row) => (
          <AssistantConversationRow
            key={row.key}
            row={row}
            active={row.key === activeKey}
            look={look}
            badgeColors={badgeColors}
            onOpen={onOpen}
          />
        ))}
        {rows.length === 0 ? (
          <p className="px-4 py-7 text-center text-[13px] leading-relaxed text-(--text-secondary)">
            {showArchived ? ASSISTANT_COPY.archivedEmpty : ASSISTANT_COPY.empty}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function AssistantConversationRow({
  row,
  active,
  look,
  badgeColors,
  onOpen,
}: {
  row: AssistantRow
  active: boolean
  look: InkBadgeLook
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  onOpen: (context: ChatContext) => void
}) {
  const loud = row.needsYou > 0 || row.fresh
  const badgeLabel = [
    row.needsYou > 0 ? `${ASSISTANT_COPY.needsYou}: ${row.needsYou}` : '',
    row.running ? ASSISTANT_COPY.running : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={() => onOpen(row.context)}
      aria-current={active ? 'true' : undefined}
      title={row.title}
      className="flex w-full flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors"
      style={
        active
          ? {
              background: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)',
              borderColor: 'var(--color-brand-200)',
            }
          : { background: 'transparent', borderColor: 'transparent' }
      }
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="min-w-0 flex-1 truncate text-[13px] text-(--text-primary)"
          style={{ fontWeight: loud ? 650 : 500 }}
        >
          {row.title}
        </span>
        {row.needsYou > 0 || row.running ? (
          <InkBadge
            badge={{
              parts: row.needsYou > 0 ? [{ channel: 'chat', count: row.needsYou }] : [],
              ...(row.running ? { running: 'chat' as const } : {}),
              rollup: false,
            }}
            look={look}
            badgeColors={badgeColors}
            label={badgeLabel}
          />
        ) : null}
        {row.fresh ? (
          <DotBadge
            className="size-2 shrink-0"
            colorClass="bg-(--color-brand-600)"
            title={ASSISTANT_COPY.fresh}
          />
        ) : null}
        {row.muted ? (
          <span
            role="img"
            aria-label={CHAT_NOTIFY_MUTED_LABEL}
            title={CHAT_NOTIFY_MUTED_LABEL}
            className="inline-flex shrink-0 text-(--text-secondary)"
          >
            <IconBellOff className="size-3.5" />
          </span>
        ) : null}
      </span>
      <span className="text-[11.5px] text-(--text-secondary)">
        {row.at ? formatFriendlyTimestamp(row.at) : ASSISTANT_COPY.justNow}
      </span>
    </button>
  )
}
