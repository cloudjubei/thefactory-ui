import type { ComponentType } from 'react'

import { CHAT_KIND_VIEW, type ChatKind } from '../../../headless'
import {
  IconChat,
  IconDocument,
  IconFolder,
  IconHandshake,
  IconPuzzle,
  IconRobot,
  IconWorkflow,
} from '../../icons'

const KIND_ICON: Record<ChatKind, ComponentType<{ className?: string }>> = {
  project: IconChat,
  topic: IconChat,
  story: IconDocument,
  feature: IconPuzzle,
  run: IconWorkflow,
  request: IconHandshake,
  group: IconFolder,
  assistant: IconRobot,
}

export type ChatKindTileProps = {
  kind: ChatKind
  /** Names the tile for a tooltip and a screen reader; defaults to the kind's own name. */
  label?: string
  /** `md` — the header's 28px tile; `sm` — a list row's 22px one. */
  size?: 'sm' | 'md'
}

/** What a chat is about, as a tinted tile: project, story, feature, run, request, group. */
export default function ChatKindTile({ kind, label, size = 'md' }: ChatKindTileProps) {
  const { ramp, label: kindLabel } = CHAT_KIND_VIEW[kind]
  const Icon = KIND_ICON[kind]
  const name = label ?? kindLabel
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${size === 'md' ? 'size-7' : 'size-[22px]'}`}
      style={{
        background: `color-mix(in srgb, var(--color-${ramp}-500) 14%, transparent)`,
        border: `1px solid color-mix(in srgb, var(--color-${ramp}-500) 28%, transparent)`,
      }}
    >
      <Icon className={size === 'md' ? 'size-4' : 'size-3.5'} />
    </span>
  )
}
