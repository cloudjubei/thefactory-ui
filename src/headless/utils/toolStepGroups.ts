import { STOP_ACTIVITY_TOOL_NAME } from './activityStopApprovalConstants'
import { cleanCliToolName } from './cliRunner'
import { GIT_CHANGE_TOOL_NAMES } from './gitChangeApprovalConstants'
import { GIT_SETUP_TOOL_NAME } from './gitSetupApprovalConstants'
import { COMPOSER_LAUNCH_TOOL_NAMES, USER_INPUT_TOOL_NAMES } from './pendingToolGrantsConstants'
import { SHOW_STORED_SECRET_TOOL_NAME } from './storedSecretViewConstants'
import { TOOL_STEP_FOLD_MIN } from './toolStepGroupsConstants'
import type { ToolStepGroup, ToolStepLayout } from './toolStepGroupsTypes'
import { FEATURE_QUESTION_TOOL } from './toolAskCardConstants'
import type { ChatMessageLike } from './chatTypes'

const MILESTONE_TOOLS = new Set<string>([
  GIT_SETUP_TOOL_NAME,
  ...GIT_CHANGE_TOOL_NAMES,
  STOP_ACTIVITY_TOOL_NAME,
  FEATURE_QUESTION_TOOL,
])

const ASK_TOOLS = new Set<string>([...USER_INPUT_TOOL_NAMES, ...COMPOSER_LAUNCH_TOOL_NAMES])

const SEND_CHAT_MESSAGE_TOOL = 'sendchatmessage'

/**
 * A tool-call row the chat may fold. Milestones, asks and run cards stay on
 * their own rows, and so does a call whose row is a card rather than a step:
 * a message sent into another chat, or a stored secret shown to the person.
 * A hand-off's own tools belong to the agents' exchange, not to this fold.
 * Pure.
 */
export function isFoldableToolStep(message: ChatMessageLike): boolean {
  const call = message.role === 'tool' || message.toolCall ? message.toolCall : undefined
  if (!call) return false
  if (message.processRunId !== undefined || message.processGroupRunId !== undefined) return false
  if (message.handoffFrom !== undefined || message.answersHandoffFrom !== undefined) return false
  if (message.managerCard !== undefined) return false
  const name = cleanCliToolName(call.name)
  if (MILESTONE_TOOLS.has(name) || ASK_TOOLS.has(name)) return false
  if (name.toLowerCase() === SEND_CHAT_MESSAGE_TOOL) return false
  if (name === SHOW_STORED_SECRET_TOOL_NAME) return false
  if (call.awaitingDecision === true) return false
  if (message.toolResult?.type === 'require_confirmation') return false
  return true
}

/**
 * Consecutive tool-call rows drawn as one "N steps" line at the first of
 * them. A run shorter than {@link TOOL_STEP_FOLD_MIN} stays as its own rows.
 * `skip` indexes — a row drawn as something else, such as an agents' exchange
 * — break a run, and are not folded. With `openTail`, a run that ends the
 * list stays open, so a turn still writing its steps is not folded over while
 * it happens. Pure.
 */
export function toolStepLayout(
  messages: readonly ChatMessageLike[],
  options: { skip?: ReadonlySet<number>; openTail?: boolean } = {},
): ToolStepLayout {
  const starts = new Map<number, ToolStepGroup>()
  const hidden = new Set<number>()
  const skip = options.skip
  let start = -1
  const close = (end: number) => {
    if (start < 0) return
    const leaveOpen = options.openTail === true && end === messages.length
    if (!leaveOpen && end - start >= TOOL_STEP_FOLD_MIN) {
      starts.set(start, { start, end })
      for (let i = start + 1; i < end; i++) hidden.add(i)
    }
    start = -1
  }
  messages.forEach((message, index) => {
    if (skip?.has(index)) {
      close(index)
      return
    }
    if (isFoldableToolStep(message)) {
      if (start < 0) start = index
      return
    }
    close(index)
  })
  close(messages.length)
  return { starts, hidden }
}

/**
 * What keeps a fold's open state to its own chat. The list stays mounted when
 * the chat changes, so an index alone would leave the next chat's fold at that
 * index open. Pure.
 */
export function toolStepFoldKey(chatId: string | undefined, start: number): string {
  return `steps-${chatId ?? ''}-${start}`
}

/**
 * Where a message is drawn: the first row of the fold it sits in, else
 * itself — so opening at an unread step opens at its "N steps" line. Pure.
 */
export function toolStepStartOf(layout: ToolStepLayout, index: number | null): number | null {
  if (index === null) return null
  for (const group of layout.starts.values()) {
    if (index >= group.start && index < group.end) return group.start
  }
  return index
}

/**
 * Where the row drawn at `index` ends (exclusive): after the last step folded
 * into it, else after itself. The row ending the chat carries the delete of
 * the chat's last message, even when that message is folded into it. Pure.
 */
export function toolStepRowEnd(layout: ToolStepLayout, index: number): number {
  return layout.starts.get(index)?.end ?? index + 1
}

/**
 * Where a list showing its last `rows` drawn rows starts. Folded steps count
 * as one row, so the window opens at the fold rather than inside it. Pure.
 */
export function foldedRowWindowStart(
  hidden: ReadonlySet<number>,
  total: number,
  rows: number,
): number {
  let start = total
  let drawn = 0
  while (start > 0 && drawn < rows) {
    start -= 1
    if (!hidden.has(start)) drawn += 1
  }
  return start
}
