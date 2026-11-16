import type { ToolCallLike } from 'thefactory-ui/headless'

/** Why the 12 Nov ask closed itself: the person decided the item on the run's page first. */
export const ALREADY_HANDLED_REASON =
  'Settled elsewhere: you decided the “Needs you” item yourself.'

/** The run chat's ask to decide a "Needs you" item, closed once the person decided it. */
export const ALREADY_HANDLED_CALL: ToolCallLike = {
  toolCallId: 't-needs-you',
  name: 'resolveNeedsYouItem',
  arguments: {
    itemId: 'ny-8638f9e0',
    decision: 'Accept the backend-adapter proof boundary for this run.',
  },
  alreadyHandled: ALREADY_HANDLED_REASON,
}

/** What the host wrote on its row: the call did not run, and why. */
export const ALREADY_HANDLED_RESULT = `Already handled before the user decided — ${ALREADY_HANDLED_REASON} This request did not run.`

/** A call ran again later in the chat, so its earlier ask closed itself. */
export const SAME_CALL_RAN_CALL: ToolCallLike = {
  toolCallId: 't-set-status',
  name: 'setFeatureStatus',
  arguments: { storyId: 's21', featureId: 'f3', status: 'done', reason: 'Drafts approved.' },
  alreadyHandled: 'The same call already ran later in this chat.',
}

/** A live ask beside them: the only row with a toggle, the only one Resume counts. */
export const LIVE_ASK_CALL: ToolCallLike = {
  toolCallId: 't-delete-feature',
  name: 'deleteFeature',
  arguments: { storyId: 's21', featureId: 'f4' },
  approvalId: 'live-ask',
}
