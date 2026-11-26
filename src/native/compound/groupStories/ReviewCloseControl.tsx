import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { ColleagueReviewCloseOutcome, ProcessRun } from 'thefactory-tools/types'
import { useColleagueReviewClose } from '../../../headless/hooks/useColleagueReviewClose'
import { reviewCloseConfirmView } from '../../../headless/utils/colleagueReviewClose'
import {
  REVIEW_CLOSE_DEFAULT_OUTCOME,
  REVIEW_CLOSE_NOTE_MAX_CHARS,
} from '../../../headless/utils/colleagueReviewCloseConstants'
import type {
  ReviewCloseContext,
  ReviewCloseView,
} from '../../../headless/utils/colleagueReviewCloseTypes'
import type { GroupTicketPageState } from '../../../headless/utils/groupTicketPageTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { Textarea } from '../../primitives/Textarea'

export type ReviewCloseControlProps = {
  view: ReviewCloseView
  context: ReviewCloseContext
  onClose: (outcome: ColleagueReviewCloseOutcome, note?: string) => void
  /** Leave out the closed line where the surface already says how the review ended. */
  hideClosed?: boolean
  /** Open the confirm at once, on this outcome: for the playground. */
  confirmOpen?: ColleagueReviewCloseOutcome
}

/**
 * Native peer of [web's `ReviewCloseControl`](../../../web/compound/groupStories/ReviewCloseControl.tsx):
 * "Close this review", the same on the ticket's page, its review run's page
 * and the review's card — a quiet button that always asks first, the two
 * outcomes with exactly what each does, that nothing is posted, and a short
 * note — then the review as it was closed, in a line.
 */
export function ReviewCloseControl({
  view,
  context,
  onClose,
  hideClosed = false,
  confirmOpen,
}: ReviewCloseControlProps) {
  const { theme, status } = useNativeTheme()
  const [open, setOpen] = useState(confirmOpen !== undefined)
  const [outcome, setOutcome] = useState(confirmOpen ?? REVIEW_CLOSE_DEFAULT_OUTCOME)
  const [note, setNote] = useState('')
  if (view.state === 'none') return null
  if (view.state !== 'open') {
    return hideClosed ? null : (
      <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.line}</Text>
    )
  }
  const confirm = reviewCloseConfirmView(context)
  const cancel = () => setOpen(false)
  return (
    <View style={{ alignItems: 'flex-start', gap: nativeSpace[1] }}>
      <Button variant="ghost" size="sm" onPress={() => setOpen(true)}>
        {view.label}
      </Button>
      {view.error ? (
        <Text accessibilityRole="alert" style={{ fontSize: 12, color: status.stuck.softFg }}>
          {view.error}
        </Text>
      ) : null}
      {open ? (
        <Modal isOpen onClose={cancel} title={confirm.title} size="md">
          <View style={{ gap: nativeSpace[3] }}>
            <View accessibilityRole="radiogroup" style={{ gap: nativeSpace[2] }}>
              {confirm.outcomes.map((option) => {
                const picked = option.outcome === outcome
                return (
                  <Pressable
                    key={option.outcome}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: picked }}
                    onPress={() => setOutcome(option.outcome)}
                    style={{
                      gap: nativeSpace[1],
                      borderRadius: nativeRadii[2],
                      borderWidth: 1,
                      borderColor: picked ? theme.accent.primary : theme.border.subtle,
                      backgroundColor: picked ? theme.surface.raised : 'transparent',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                      {option.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.text.muted }}>{option.when}</Text>
                    {picked
                      ? option.goes.map((line) => (
                          <Text key={line} style={{ fontSize: 12, color: theme.text.secondary }}>
                            {`• ${line}`}
                          </Text>
                        ))
                      : null}
                  </Pressable>
                )
              })}
            </View>
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {confirm.nothingPosted}
            </Text>
            <Textarea
              rows={2}
              value={note}
              maxLength={REVIEW_CLOSE_NOTE_MAX_CHARS}
              accessibilityLabel={confirm.noteLabel}
              placeholder={confirm.notePlaceholder}
              onChangeText={setNote}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
              <Button variant="ghost" size="sm" onPress={cancel}>
                {confirm.cancel}
              </Button>
              <Button
                variant={outcome === 'remove' ? 'danger' : 'primary'}
                size="sm"
                onPress={() => {
                  setOpen(false)
                  onClose(outcome, note)
                }}
              >
                {confirm.confirm[outcome]}
              </Button>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}

export type ReviewCloseActionProps = {
  groupId: string
  ticketKey: string
  runOpen?: boolean
  offersWaiting?: boolean
  hideClosed?: boolean
}

/** {@link ReviewCloseControl} on a ticket's live review: one closing, shown wherever the review shows. */
export function ReviewCloseAction({
  groupId,
  ticketKey,
  runOpen = false,
  offersWaiting = false,
  hideClosed = false,
}: ReviewCloseActionProps) {
  const { view, close } = useColleagueReviewClose(groupId, ticketKey)
  return (
    <ReviewCloseControl
      view={view}
      context={{ ticketKey, runOpen, offersWaiting }}
      onClose={close}
      hideClosed={hideClosed}
    />
  )
}

/** Closing the review on its run's page; nothing on any other run, or once the run reads as closed. */
export function ReviewRunClose({
  run,
}: {
  run: Pick<ProcessRun, 'ticketReview' | 'closedAs' | 'status'>
}) {
  const subject = run.ticketReview
  if (!subject || run.closedAs || run.status === 'succeeded') return null
  return (
    <View style={{ paddingHorizontal: nativeSpace[4], marginTop: nativeSpace[3] }}>
      <ReviewCloseAction
        groupId={subject.groupId}
        ticketKey={subject.ticketKey}
        runOpen
        hideClosed
      />
    </View>
  )
}

/** Closing the review on its ticket's page, once the page shows a review. */
export function ticketReviewClose(
  groupId: string,
  ticketKey: string,
  state: GroupTicketPageState,
): ReactNode {
  if (state.kind !== 'page' || !state.page.review) return undefined
  const { liveRun, reply } = state.page
  return (
    <ReviewCloseAction
      groupId={groupId}
      ticketKey={ticketKey}
      runOpen={liveRun !== undefined}
      offersWaiting={reply !== undefined}
    />
  )
}
