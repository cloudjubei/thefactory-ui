import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  launchAgentPickMetadata,
  processOutsideWaitView,
  REVIEW_REPLY_TEXT,
  useLaunchAgentPick,
  type LaunchModelChipSlot,
  type UseReviewChatSlot,
} from '../../../headless'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import RunOutsideWaitCard from '../process/RunOutsideWaitCard'
import { RunPushApprovalCard, RunReviewDecisionCard } from './ColleagueReviewDecisionCard'
import ReviewReplyComposerCard from './ReviewReplyComposerCard'

export type ReviewChatSlotProps = {
  slot: UseReviewChatSlot
  renderModelChip?: ((picked: LaunchModelChipSlot) => ReactNode) | undefined
  onOpenRun?: ((projectId: string, runId: string) => void) | undefined
}

/**
 * Native peer of web's `ReviewChatSlot`: a review chat's composer place while
 * its run needs the person — its decision card, push approval or the reply
 * it waited for, with Open run — or the reply waiting to start an inline
 * review's next round. Not now hides it for this view.
 */
export default function ReviewChatSlot({ slot, renderModelChip, onOpenRun }: ReviewChatSlotProps) {
  const { theme } = useNativeTheme()
  const { pick, slot: chip } = useLaunchAgentPick()
  const { kind, run, reply } = slot
  if (!kind) return null
  const link = { fontSize: 13, color: theme.accent.primary }
  const footer = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {run && onOpenRun ? (
        <Pressable accessibilityRole="link" onPress={() => onOpenRun(run.projectId, run.id)}>
          <Text style={link}>{REVIEW_REPLY_TEXT.openRun}</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" style={{ marginLeft: 'auto' }} onPress={slot.notNow}>
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          {REVIEW_REPLY_TEXT.notNow}
        </Text>
      </Pressable>
    </View>
  )
  const card =
    kind === 'reply' && reply ? (
      <ReviewReplyComposerCard
        view={reply}
        starting={slot.starting}
        error={slot.startError}
        {...(renderModelChip ? { modelChip: renderModelChip(chip) } : {})}
        onStart={() => slot.start(launchAgentPickMetadata(pick))}
        onNotNow={slot.notNow}
      />
    ) : run && kind === 'run-decision' ? (
      <>
        <RunReviewDecisionCard run={run} embedded onAnswer={slot.answerGate} />
        {footer}
      </>
    ) : run && kind === 'run-push' ? (
      <>
        <RunPushApprovalCard run={run} embedded onAnswer={slot.answerGate} />
        {footer}
      </>
    ) : run && kind === 'run-outside' ? (
      <>
        <RunOutsideWaitCard view={processOutsideWaitView(run)!} onCarryOn={slot.carryOn} />
        {footer}
      </>
    ) : null
  if (!card) return null
  return (
    <ScrollView
      style={{ maxHeight: 520, borderTopWidth: 1, borderTopColor: theme.border.default }}
      contentContainerStyle={{ gap: 8, padding: 12 }}
    >
      {card}
    </ScrollView>
  )
}
