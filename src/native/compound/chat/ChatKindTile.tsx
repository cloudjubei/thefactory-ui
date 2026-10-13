import type { ComponentType } from 'react'
import { View } from 'react-native'

import { CHAT_KIND_VIEW, type ChatKind } from '../../../headless'
import { palette } from '../../../tokens/colors'
import {
  IconChat,
  IconDocument,
  IconFolder,
  IconHandshake,
  IconPuzzle,
  IconRobot,
  IconWorkflow,
} from '../../icons'

const KIND_ICON: Record<ChatKind, ComponentType<{ size?: number }>> = {
  project: IconChat,
  topic: IconChat,
  story: IconDocument,
  feature: IconPuzzle,
  run: IconWorkflow,
  request: IconHandshake,
  group: IconFolder,
  assistant: IconRobot,
}

export interface ChatKindTileProps {
  kind: ChatKind
  /** Names the tile for a screen reader; defaults to the kind's own name. */
  label?: string
  /** `md` — the header's 28pt tile; `sm` — a list row's 22pt one. */
  size?: 'sm' | 'md'
}

/** Native peer of web's `ChatKindTile`: what a chat is about, as a tinted tile. */
export default function ChatKindTile({ kind, label, size = 'md' }: ChatKindTileProps) {
  const { ramp, label: kindLabel } = CHAT_KIND_VIEW[kind]
  const Icon = KIND_ICON[kind]
  const tint = palette[ramp][500]
  const box = size === 'md' ? 28 : 22
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ?? kindLabel}
      style={{
        width: box,
        height: box,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${tint}24`,
        borderWidth: 1,
        borderColor: `${tint}47`,
      }}
    >
      <Icon size={size === 'md' ? 16 : 14} />
    </View>
  )
}
