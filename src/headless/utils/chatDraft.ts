import {
  CHAT_DRAFT_MAX_AGE_MS,
  CHAT_DRAFT_STORAGE_PREFIX,
  EMPTY_CHAT_DRAFT,
  PENDING_MESSAGE_SEPARATOR,
  PENDING_SEND_NOW_HINT,
  PENDING_STACK_TEXT,
} from './chatDraftConstants'
import type {
  ChatComposerBlockers,
  ChatDraft,
  OutgoingChatMessage,
  PendingAutoDispatchInput,
  PendingChatMessage,
  PendingSendNowMode,
  PendingStackInput,
  PendingStackView,
  PendingTurnInput,
  PendingTurnState,
  PendingTurnStep,
  StoredChatDraft,
} from './chatDraftTypes'
import {
  mergeVideoMarks,
  videoMarksOf,
  withVideoMarkRefusal,
  withoutVideoMarkRefusals,
} from './videoMarks'
import type { ChatVideoMarkDraft } from './videoMarksTypes'

/** What was taken out of a draft to send — handed back by {@link restoreUnsent} if the send fails. */
export type TakenChatDraft = {
  pending: PendingChatMessage[]
  composer: OutgoingChatMessage | null
}

export type ChatDraftTake = {
  message: OutgoingChatMessage
  rest: ChatDraft
  taken: TakenChatDraft
}

export function chatDraftStorageKey(chatKey: string): string {
  return `${CHAT_DRAFT_STORAGE_PREFIX}${chatKey}`
}

function hasContent(message: OutgoingChatMessage): boolean {
  return (
    message.text.trim().length > 0 ||
    message.attachments.length > 0 ||
    (message.videoMarks?.length ?? 0) > 0
  )
}

/** The value with these marks, or with no `videoMarks` at all when there are none. */
function withMarks<T extends object>(value: T, marks: ChatVideoMarkDraft[]): T {
  const next: T & { videoMarks?: ChatVideoMarkDraft[] } = { ...value }
  if (marks.length > 0) next.videoMarks = marks
  else delete next.videoMarks
  return next
}

export function isEmptyChatDraft(draft: ChatDraft): boolean {
  return !hasContent(draft) && draft.pending.length === 0
}

function uniqueInOrder(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function joinTexts(first: string, second: string): string {
  if (first.trim().length === 0) return second
  if (second.trim().length === 0) return first
  return `${first}${PENDING_MESSAGE_SEPARATOR}${second}`
}

/** The stored form of a draft, or `null` when there is nothing worth keeping. */
export function serializeChatDraft(draft: ChatDraft, now: number): string | null {
  if (isEmptyChatDraft(draft)) return null
  const stored: StoredChatDraft = withMarks(
    { ...draft, savedAt: now },
    withoutVideoMarkRefusals(draft.videoMarks ?? []),
  )
  return JSON.stringify(stored)
}

function stringsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function pendingOf(value: unknown): PendingChatMessage[] {
  if (!Array.isArray(value)) return []
  const items: PendingChatMessage[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { id, text, attachments, videoMarks } = entry as Record<string, unknown>
    if (typeof id !== 'string') continue
    const parsed = withMarks(
      { id, text: typeof text === 'string' ? text : '', attachments: stringsOf(attachments) },
      videoMarksOf(videoMarks),
    )
    if (hasContent(parsed)) items.push(parsed)
  }
  return items
}

/**
 * A stored draft read back — or `null` when the entry is missing, unreadable,
 * older than {@link CHAT_DRAFT_MAX_AGE_MS}, or holds nothing once sanitized.
 */
export function parseChatDraft(
  raw: string | null,
  now: number,
  maxAgeMs: number = CHAT_DRAFT_MAX_AGE_MS,
): ChatDraft | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const stored = value as Record<string, unknown>
  if (typeof stored.savedAt !== 'number') return null
  if (now - stored.savedAt > maxAgeMs) return null
  const draft: ChatDraft = withMarks(
    {
      text: typeof stored.text === 'string' ? stored.text : '',
      attachments: stringsOf(stored.attachments),
      pending: pendingOf(stored.pending),
      paused: stored.paused === true,
    },
    videoMarksOf(stored.videoMarks),
  )
  return isEmptyChatDraft(draft) ? null : draft
}

/**
 * Queue a message sent while the agent is busy, clearing the composer it came from. The
 * composer's marks go with it, as they were made for this message.
 */
export function enqueueMessage(
  draft: ChatDraft,
  id: string,
  message: OutgoingChatMessage,
): ChatDraft {
  const marks = withoutVideoMarkRefusals(mergeVideoMarks(message.videoMarks, draft.videoMarks))
  if (!hasContent({ ...message, videoMarks: marks })) return draft
  const queued = withMarks(
    { id, text: message.text.trim(), attachments: uniqueInOrder(message.attachments) },
    marks,
  )
  return withMarks({ ...draft, text: '', attachments: [], pending: [...draft.pending, queued] }, [])
}

function withoutPending(draft: ChatDraft, id: string): ChatDraft {
  const pending = draft.pending.filter((p) => p.id !== id)
  return { ...draft, pending, paused: pending.length > 0 && draft.paused }
}

/** Move a queued message back into the composer, after anything already typed there. */
export function editPendingMessage(draft: ChatDraft, id: string): ChatDraft {
  const target = draft.pending.find((p) => p.id === id)
  if (!target) return draft
  return withMarks(
    {
      ...withoutPending(draft, id),
      text: joinTexts(draft.text, target.text),
      attachments: uniqueInOrder([...draft.attachments, ...target.attachments]),
    },
    mergeVideoMarks(draft.videoMarks, target.videoMarks),
  )
}

export function removePendingMessage(draft: ChatDraft, id: string): ChatDraft {
  if (!draft.pending.some((p) => p.id === id)) return draft
  return withoutPending(draft, id)
}

/**
 * Several messages as ONE: texts in order, each canonicalized on its own and
 * separated by a blank line; attachments de-duplicated in first-seen order.
 */
export function mergeOutgoing(
  messages: readonly OutgoingChatMessage[],
  canonicalize: (text: string) => string,
): OutgoingChatMessage {
  const texts: string[] = []
  const attachments: string[] = []
  let marks: ChatVideoMarkDraft[] = []
  for (const message of messages) {
    const text = message.text.trim()
    if (text.length > 0) texts.push(canonicalize(text))
    attachments.push(...message.attachments)
    marks = mergeVideoMarks(marks, message.videoMarks)
  }
  return withMarks(
    { text: texts.join(PENDING_MESSAGE_SEPARATOR), attachments: uniqueInOrder(attachments) },
    withoutVideoMarkRefusals(marks),
  )
}

/** Everything in the draft — the queue, then the composer — as one message, leaving the draft empty. */
export function takeOutgoing(
  draft: ChatDraft,
  canonicalize: (text: string) => string,
): ChatDraftTake {
  const composer: OutgoingChatMessage | null = hasContent(draft)
    ? withMarks(
        { text: draft.text, attachments: draft.attachments },
        withoutVideoMarkRefusals(draft.videoMarks ?? []),
      )
    : null
  return {
    message: mergeOutgoing([...draft.pending, ...(composer ? [composer] : [])], canonicalize),
    rest: EMPTY_CHAT_DRAFT,
    taken: { pending: draft.pending, composer },
  }
}

/** The queue alone as one message; the composer stays as typed. */
export function takePending(
  draft: ChatDraft,
  canonicalize: (text: string) => string,
): ChatDraftTake {
  return {
    message: mergeOutgoing(draft.pending, canonicalize),
    rest: { ...draft, pending: [], paused: false },
    taken: { pending: draft.pending, composer: null },
  }
}

/**
 * Put a send that did not go through back where it came from: queued items at
 * the front of the queue (paused — the person decides when to retry), composer
 * text and attachments in front of anything typed since.
 */
export function restoreUnsent(draft: ChatDraft, taken: TakenChatDraft): ChatDraft {
  if (taken.pending.length === 0 && !taken.composer) return draft
  const composer = taken.composer
  return withMarks(
    {
      text: composer ? joinTexts(composer.text, draft.text) : draft.text,
      attachments: composer
        ? uniqueInOrder([...composer.attachments, ...draft.attachments])
        : draft.attachments,
      pending: [...taken.pending, ...draft.pending],
      paused: taken.pending.length > 0 ? true : draft.paused,
    },
    mergeVideoMarks(composer?.videoMarks, draft.videoMarks),
  )
}

/** The draft with the composer's marks set to these. */
export function setDraftVideoMarks(draft: ChatDraft, marks: ChatVideoMarkDraft[]): ChatDraft {
  return withMarks(draft, marks)
}

/** The draft with a refused send's reason by the composer's mark it is about. */
export function refuseDraftVideoMark(draft: ChatDraft, reason: string): ChatDraft {
  return withMarks(draft, withVideoMarkRefusal(draft.videoMarks ?? [], reason))
}

export function isComposerBlocked(blockers: ChatComposerBlockers): boolean {
  return (
    blockers.askShown ||
    blockers.approvalShown ||
    blockers.historyLocked ||
    blockers.inputOverridden
  )
}

/**
 * The queue goes out on its own only after a turn was seen ending, with the
 * composer free and the person not having paused it.
 */
export function canAutoDispatch(input: PendingAutoDispatchInput): boolean {
  return (
    input.pendingCount > 0 &&
    !input.busy &&
    !input.paused &&
    input.turnEnded &&
    !isComposerBlocked(input.blockers)
  )
}

/** CLI chats queue a message behind the running turn on the server; API chats interrupt it. */
export function pendingSendNowMode(isCliChat: boolean): PendingSendNowMode {
  return isCliChat ? 'queued-behind-turn' : 'interrupts-turn'
}

/**
 * One step of the queue watching the chat's turns. A running turn that ends
 * arms the queue (pausing it if the turn failed). The agent parking on an ask
 * disarms it: answering resumes the agent, and a message sent in that gap would
 * race the resumed turn — the end of that turn arms it again.
 */
export function pendingTurnStep(state: PendingTurnState, input: PendingTurnInput): PendingTurnStep {
  const ended = state.wasBusy && !input.busy
  const turnEnded = (state.turnEnded || ended) && !input.blocked
  return {
    wasBusy: input.busy,
    turnEnded,
    pause: ended && input.failed && input.pendingCount > 0,
  }
}

export function pendingStackView(input: PendingStackInput): PendingStackView {
  const status = input.paused
    ? PENDING_STACK_TEXT.paused
    : input.busy
      ? PENDING_STACK_TEXT.waiting
      : PENDING_STACK_TEXT.idle
  return {
    title: `${input.count} pending`,
    status,
    sendLabel: input.busy && !input.paused ? PENDING_STACK_TEXT.sendNow : PENDING_STACK_TEXT.send,
    sendHint: input.busy ? PENDING_SEND_NOW_HINT[input.mode] : PENDING_STACK_TEXT.sendIdleHint,
  }
}
