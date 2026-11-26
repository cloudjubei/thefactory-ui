import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'

import {
  launchAgentPickMetadata,
  useLaunchAgentPick,
  type LaunchModelChipSlot,
  type UseReviewChatSlot,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { TicketRunLine } from '../groupStories/TicketRunState'
import ReviewReplyComposerCard from './ReviewReplyComposerCard'

export type ReviewChatSlotProps = {
  slot: UseReviewChatSlot
  renderModelChip?: ((picked: LaunchModelChipSlot) => ReactNode) | undefined
  onOpenRun?: ((projectId: string, runId: string) => void) | undefined
}

/**
 * Native peer of web's `ReviewChatSlot`: by an inline review chat's composer,
 * one line saying the ticket's review run while one is going — it never
 * works in this chat — with Open run, above the composer; with no run, the
 * reply waiting to start the next round, in the composer's place. Not now
 * hides it for this view.
 */
export default function ReviewChatSlot({ slot, renderModelChip, onOpenRun }: ReviewChatSlotProps) {
  const { theme } = useNativeTheme()
  const { pick, slot: chip } = useLaunchAgentPick()
  const { runLine, reply } = slot
  if (slot.kind === 'run-link' && runLine) {
    return (
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border.default,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <TicketRunLine
          run={runLine}
          {...(onOpenRun
            ? {
                onOpen: (open) => {
                  if (open.kind === 'run') onOpenRun(open.projectId, open.runId)
                },
              }
            : {})}
        />
      </View>
    )
  }
  if (slot.kind !== 'reply' || !reply) return null
  return (
    <ScrollView
      style={{ maxHeight: 520, borderTopWidth: 1, borderTopColor: theme.border.default }}
      contentContainerStyle={{ gap: 8, padding: 12 }}
    >
      <ReviewReplyComposerCard
        view={reply}
        starting={slot.starting}
        error={slot.startError}
        {...(renderModelChip ? { modelChip: renderModelChip(chip) } : {})}
        onStart={() => slot.start(launchAgentPickMetadata(pick))}
        onNotNow={slot.notNow}
      />
    </ScrollView>
  )
}
