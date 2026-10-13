import { useEffect, useMemo, useState } from 'react'
import type { ChatContext } from 'thefactory-tools/types'

import {
  CHAT_LIST_COPY,
  CHAT_LIST_EMPTY,
  CHAT_LIST_FILTERS,
  CHAT_LIST_NOTICE_MS,
  chatListFilterCounts,
  chatListPool,
  chatListSections,
  inkBadgeLook,
  useAppSettings,
  useChatList,
  useChats,
  type ChatListFilter,
  type ChatListRow,
  type ChatListScope,
  type ChatListSection,
  type InkBadgeLook,
} from '../../../headless'
import type { BadgeColor, BadgeColorCategory } from '../../../headless/types/settings'
import { CHAT_NOTIFY_MUTED_LABEL } from '../../../headless/utils/chatNotifyConstants'
import { IconBellOff, IconPlus } from '../../icons'
import DotBadge from '../../primitives/DotBadge'
import { useToast } from '../../primitives/Toast'
import OverflowMenu from '../OverflowMenu'
import { renderProjectIcon } from '../projectIcons'
import ToneBadge from '../chips/ToneBadge'
import { useChatsSeen } from '../notifications/chatsSeen'
import InkBadge from '../shell/InkBadge'
import ChatKindTile from './ChatKindTile'

export type ChatListProps = {
  scope: ChatListScope
  /** The chat on screen, highlighted. */
  activeKey?: string
  onOpen: (context: ChatContext) => void
  /** Starts a new chat; omitted, there is no new-chat button. */
  onNewChat?: () => void
  /** The list's own title row — off where the host's header carries the title and new-chat button. */
  showHeader?: boolean
  /** The group's name, for a group list's title. */
  groupName?: string
}

const SECTION_COLOR: Record<NonNullable<ChatListSection['tone']>, string> = {
  neutral: 'var(--text-secondary)',
  'needs-you': 'var(--color-brand-700)',
  running: 'var(--status-done-soft-fg)',
}

/**
 * The chat list: one list of a project's chats — or a group's own chats with
 * what needs the person and what runs in its projects — each row with its kind
 * tile, title, status pill and the line under it, an ink badge for what waits
 * on the person and what runs, and a dot for news. Filter chips narrow it; ⋯
 * opens the chats archived from the list. A chat archived or shown again says
 * so in a toast, with Undo. The native `ChatList` draws the same rows.
 */
export default function ChatList({
  scope,
  activeKey,
  onOpen,
  onNewChat,
  showHeader = true,
  groupName,
}: ChatListProps) {
  const seen = useChatsSeen()
  const rows = useChatList(scope, seen)
  const { chatListNotice, dismissChatListNotice, showChatInList } = useChats()
  const { settings } = useAppSettings()
  const { toast } = useToast()
  const [filter, setFilter] = useState<ChatListFilter>('all')
  const [archived, setArchived] = useState(false)

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

  const sections = useMemo(
    () => chatListSections({ rows, scope, filter, archived }),
    [rows, scope, filter, archived],
  )
  const counts = useMemo(
    () => chatListFilterCounts(chatListPool(rows, scope, false)),
    [rows, scope],
  )
  const archivedCount = useMemo(() => chatListPool(rows, scope, true).length, [rows, scope])
  const look = inkBadgeLook(settings.userPreferences)
  const badgeColors = settings.notifications.badgeColors
  const empty = sections.every((s) => s.rows.length === 0)
  const title = archived
    ? CHAT_LIST_COPY.archivedTitle
    : scope.kind === 'group' && groupName
      ? CHAT_LIST_COPY.groupTitle(groupName)
      : CHAT_LIST_COPY.title

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader ? (
        <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-1.5">
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-(--text-primary)">
            {title}
          </span>
          {onNewChat ? (
            <button
              type="button"
              onClick={onNewChat}
              aria-label={CHAT_LIST_COPY.newChat}
              title={CHAT_LIST_COPY.newChat}
              className="inline-flex size-8 items-center justify-center rounded-md border border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
            >
              <IconPlus className="size-4" />
            </button>
          ) : null}
        </div>
      ) : archived ? (
        <div className="shrink-0 px-3 pt-3 pb-1.5 text-[15px] font-semibold text-(--text-primary)">
          {title}
        </div>
      ) : null}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 pb-2">
        {archived
          ? null
          : CHAT_LIST_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                label={f.label}
                count={f.id === 'all' ? 0 : counts[f.id]}
                pressed={filter === f.id}
                accent={f.id === 'needs-you'}
                onPick={() => setFilter(f.id)}
              />
            ))}
        <span className="ml-auto">
          <OverflowMenu
            label={CHAT_LIST_COPY.moreOptions}
            className="size-7"
            items={[
              archived
                ? {
                    key: 'current',
                    label: CHAT_LIST_COPY.backToCurrent,
                    onSelect: () => setArchived(false),
                  }
                : {
                    key: 'archived',
                    label: CHAT_LIST_COPY.showArchived,
                    hint: String(archivedCount),
                    onSelect: () => setArchived(true),
                  },
            ]}
          />
        </span>
      </div>
      <div className="flex-1 overflow-auto px-1.5 pb-2">
        {sections.map((section) =>
          section.rows.length === 0 ? null : (
            <div key={section.id} className="flex flex-col gap-px">
              {section.label ? (
                <div
                  className="px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: SECTION_COLOR[section.tone ?? 'neutral'] }}
                >
                  {section.label}
                </div>
              ) : null}
              {section.rows.map((row) => (
                <ChatListRowButton
                  key={row.key}
                  row={row}
                  active={row.key === activeKey}
                  showProject={scope.kind === 'group' && row.kind !== 'group'}
                  look={look}
                  badgeColors={badgeColors}
                  onOpen={onOpen}
                />
              ))}
            </div>
          ),
        )}
        {empty ? (
          <p className="px-4 py-7 text-center text-[13px] leading-relaxed text-(--text-secondary)">
            {archived ? CHAT_LIST_COPY.archivedEmpty : CHAT_LIST_EMPTY[filter]}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function FilterChip({
  label,
  count,
  pressed,
  accent,
  onPick,
}: {
  label: string
  count: number
  pressed: boolean
  accent: boolean
  onPick: () => void
}) {
  const style = accent
    ? pressed
      ? {
          background: 'var(--color-brand-600)',
          color: '#ffffff',
          borderColor: 'var(--color-brand-600)',
        }
      : {
          background: 'var(--color-brand-50)',
          color: 'var(--color-brand-700)',
          borderColor: 'var(--color-brand-200)',
        }
    : pressed
      ? {
          background: 'var(--text-primary)',
          color: 'var(--surface-base)',
          borderColor: 'var(--text-primary)',
        }
      : {
          background: 'var(--surface-raised)',
          color: 'var(--text-secondary)',
          borderColor: 'var(--border-default)',
        }
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPick}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px]"
      style={style}
    >
      {label}
      {count > 0 ? <span className="text-[11px] font-bold tabular-nums">{count}</span> : null}
    </button>
  )
}

function ChatListRowButton({
  row,
  active,
  showProject,
  look,
  badgeColors,
  onOpen,
}: {
  row: ChatListRow
  active: boolean
  showProject: boolean
  look: InkBadgeLook
  badgeColors: Readonly<Record<BadgeColorCategory, BadgeColor>>
  onOpen: (context: ChatContext) => void
}) {
  const loud = row.needsYou > 0 || row.fresh
  const badgeLabel = [
    row.needsYou > 0 ? `${CHAT_LIST_COPY.needsYou}: ${row.needsYou}` : '',
    row.running ? CHAT_LIST_COPY.running : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={() => onOpen(row.context)}
      aria-current={active ? 'true' : undefined}
      title={row.title}
      className="flex w-full items-start gap-2.5 rounded-[9px] border p-2 text-left transition-colors"
      style={
        active
          ? {
              background: 'color-mix(in srgb, var(--color-brand-500) 12%, transparent)',
              borderColor: 'var(--color-brand-200)',
            }
          : { background: 'transparent', borderColor: 'transparent' }
      }
    >
      <ChatKindTile kind={row.kind} label={row.kindLabel} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
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
                ...(row.running ? { running: row.runningChannel } : {}),
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
              title={CHAT_LIST_COPY.fresh}
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
        <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-(--text-secondary)">
          {showProject && row.projectName ? (
            <span className="inline-flex shrink-0 items-center gap-1">
              <span aria-hidden>{renderProjectIcon(row.projectIcon ?? 'folder', 'size-3')}</span>
              {row.projectName}
            </span>
          ) : null}
          {row.pill ? <ToneBadge tone={row.pill.tone}>{row.pill.label}</ToneBadge> : null}
          <span className="min-w-0 truncate">{row.sub}</span>
        </span>
      </span>
    </button>
  )
}
