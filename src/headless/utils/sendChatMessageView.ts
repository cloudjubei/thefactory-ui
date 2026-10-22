import { getChatContext } from 'thefactory-tools/utils'
import { formatChatTitle } from './chatTitle'
import { cleanCliToolName } from './cliRunner'
import { extract, safePreviewString } from './toolPreview'
import { TOOL_ASK_COPY } from './toolAskCardConstants'

// The preview of `sendChatMessage` — an agent in one chat posting a message
// into another chat as the user would. The host's real payload shape:
//   args:   chatId | projectId, message, awaitReply
//   detail: targetChatId, targetProjectId, targetTitle (chat title), targetLabel
//   result: delivered, held, chatTitle, agentStarted, awaitingReply
// A held message has delivered:false and agentStarted:false.

/** Characters of message shown before the body folds behind "Show more". */
export const SEND_CHAT_MESSAGE_COLLAPSE_CHARS = 600
/** Lines of message shown before the body folds behind "Show more". */
export const SEND_CHAT_MESSAGE_COLLAPSE_LINES = 12

/** Copy unique to the send-chat-message preview (shared words live on TOOL_ASK_COPY). */
export const SEND_CHAT_MESSAGE_COPY = {
  heading: 'Send a message to another chat?',
  message: 'Message',
  waitsForReply: 'Waits for reply',
  held: 'Held until the chat is free',
  agentStarted: 'Started a run',
  incomplete: TOOL_ASK_COPY.incompleteMessage,
  openTarget: 'Open target chat',
} as const

export type SendChatMessageOutcomeStatus =
  | 'awaiting'
  | 'sending'
  | 'sent'
  | 'denied'
  | 'failed'
  | 'cancelled'

export const SEND_CHAT_MESSAGE_OUTCOME_LABEL: Record<SendChatMessageOutcomeStatus, string> = {
  awaiting: 'Waiting for your approval',
  sending: 'Sending…',
  sent: 'Sent',
  denied: 'Not sent — you declined',
  failed: 'Not sent — it failed',
  cancelled: 'Not sent — cancelled',
}

export type SendChatMessageOutcome = {
  status: SendChatMessageOutcomeStatus
  /** Why it did not go, or what the host said once it did. */
  detail?: string
}

export type SendChatMessageView = {
  /** The text that will be posted, as the target chat will show it. */
  message?: string
  target: {
    projectId?: string
    chatContextId?: string
    /**
     * The target chat's title (`targetTitle` on the approval detail, or
     * `chatTitle` on the result). Not the project name.
     */
    chatTitle?: string
    /**
     * How the host names the target to a person (`targetLabel`), e.g.
     * `chat "Release prep" in project thefactory-tools`.
     */
    label?: string
  }
  source: { chatContextId?: string; chatTitle?: string }
  /** The agent will wait for a reply before carrying on. */
  awaitReply: boolean
  /** The message is held until the target chat is free. */
  held: boolean
  /** Sending started a run in the target chat. */
  agentStarted: boolean
  /** `overseer://projects/<projectId>`, when the target project is known. */
  link?: string
  /** Which of the fields the card needs could not be read. */
  missing: ('target' | 'message')[]
  /** The payload as received, for the fallback section. */
  raw: string
  outcome: SendChatMessageOutcome
}

type Rec = Record<string, unknown>

const record = (v: unknown): Rec | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : undefined

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v : undefined

/** Whether a tool call is a send-to-another-chat. Pure. */
export function isSendChatMessageTool(name: string | undefined): boolean {
  return name !== undefined && cleanCliToolName(name).toLowerCase() === 'sendchatmessage'
}

/** `overseer://projects/<projectId>` — the link the target is opened with. Pure. */
export function sendChatMessageTargetLink(projectId: string | undefined): string | undefined {
  return projectId ? `overseer://projects/${encodeURIComponent(projectId)}` : undefined
}

function outcomeOf(resultType: string | undefined, result: unknown): SendChatMessageOutcome {
  const rec = record(result)
  const reason =
    str(result) ??
    str(rec?.reason) ??
    str(rec?.message) ??
    str(rec?.error) ??
    str(extract(result, ['error.message', 'agentInstruction']))
  switch (resultType) {
    case undefined:
    case 'require_confirmation':
    case 'pending':
      return { status: 'awaiting' }
    case 'running':
      return { status: 'sending' }
    case 'success': {
      const held = rec?.held === true
      return {
        status: 'sent',
        ...(held ? { detail: SEND_CHAT_MESSAGE_COPY.held } : {}),
      }
    }
    case 'not_allowed':
      return { status: 'denied', ...(reason ? { detail: reason } : {}) }
    case 'errored':
      return { status: 'failed', ...(reason ? { detail: reason } : {}) }
    case 'aborted':
      return { status: 'cancelled' }
    default:
      return { status: 'awaiting' }
  }
}

export type SendChatMessageInput = {
  /** The call's arguments. */
  args?: unknown
  /** The ask's payload (`{ tool, args, detail }`), when the host enriched it. */
  detail?: unknown
  result?: unknown
  resultType?: string
  /** The chat the call was made from, when the host knows it. */
  sourceChatContextId?: string
}

/**
 * Everything the preview shows, read from the real backend payload — args
 * (`chatId` | `projectId`, `message`, `awaitReply`), host detail
 * (`targetChatId`, `targetProjectId`, `targetTitle` = chat title, `targetLabel`),
 * and result (`delivered`, `held`, `chatTitle`, `agentStarted`, `awaitingReply`).
 * Pure.
 */
export function sendChatMessageView(input: SendChatMessageInput): SendChatMessageView {
  const detail = record(input.detail)
  const args = record(input.args) ?? record(detail?.args)
  // The host's enriched detail wins over the agent's arguments.
  const enriched = record(detail?.detail) ?? record(detail)

  const message = str(args?.message)
  const targetChatId = str(enriched?.targetChatId) ?? str(args?.chatId)
  const targetProjectId = str(enriched?.targetProjectId) ?? str(args?.projectId)
  // Backend: targetTitle is the target CHAT's title, not the project's.
  const targetTitle = str(enriched?.targetTitle)
  const targetLabel = str(enriched?.targetLabel)
  const result = record(input.result)
  const resultChatTitle = str(result?.chatTitle)

  const awaitReply = args?.awaitReply === true || result?.awaitingReply === true
  const held = result?.held === true
  const agentStarted = result?.agentStarted === true
  // `delivered` confirms a successful send when the result carries it.
  const delivered = result?.delivered === true

  const missing: SendChatMessageView['missing'] = []
  if (!targetProjectId && !targetChatId && !targetLabel && !targetTitle) missing.push('target')
  if (message === undefined) missing.push('message')
  const link = sendChatMessageTargetLink(targetProjectId)

  const outcome = outcomeOf(input.resultType, input.result)
  // A success that only sets `delivered` still reads as sent.
  const status = outcome.status === 'awaiting' && delivered ? ('sent' as const) : outcome.status

  return {
    ...(message !== undefined ? { message } : {}),
    target: {
      ...(targetProjectId ? { projectId: targetProjectId } : {}),
      ...(targetChatId ? { chatContextId: targetChatId } : {}),
      ...((resultChatTitle ?? targetTitle) ? { chatTitle: resultChatTitle ?? targetTitle } : {}),
      ...(targetLabel ? { label: targetLabel } : {}),
    },
    source: {
      ...(input.sourceChatContextId ? { chatContextId: input.sourceChatContextId } : {}),
    },
    awaitReply,
    held,
    agentStarted,
    ...(link ? { link } : {}),
    missing,
    raw: safePreviewString(input.detail ?? input.args).text,
    outcome: {
      status,
      ...(outcome.detail
        ? { detail: outcome.detail }
        : held && status === 'sent'
          ? { detail: SEND_CHAT_MESSAGE_COPY.held }
          : {}),
    },
  }
}

/**
 * The message cut to its first lines / characters for the folded card, or
 * `undefined` when it is short enough to show whole. Cuts at a line break where
 * one is near, so markdown is not split mid-line. Pure.
 */
export function collapsedMessage(
  message: string,
  maxChars: number = SEND_CHAT_MESSAGE_COLLAPSE_CHARS,
  maxLines: number = SEND_CHAT_MESSAGE_COLLAPSE_LINES,
): string | undefined {
  const lines = message.split('\n')
  if (message.length <= maxChars && lines.length <= maxLines) return undefined
  let cut = lines.slice(0, maxLines).join('\n')
  if (cut.length > maxChars) {
    const lastBreak = cut.lastIndexOf('\n', maxChars)
    cut = lastBreak > maxChars / 2 ? cut.slice(0, lastBreak) : cut.slice(0, maxChars)
  }
  cut = `${cut.trimEnd()}…`
  // A cut inside a ``` block would render the rest of the card as code: close it.
  const fences = cut.split('\n').filter((line) => line.trimStart().startsWith('```')).length
  return fences % 2 === 1 ? `${cut}\n\`\`\`` : cut
}

/**
 * A chat's display name from its context id — "Backend Chat", "Story #3", a
 * topic's own name when the caller knows it — or `undefined` for an id that is
 * not a chat key. What the card names the source and target chats by when the
 * payload carries only their ids. Pure.
 */
export function chatTitleFromContextId(
  chatContextId: string | undefined,
  projectTitle?: (projectId: string) => string | undefined,
): string | undefined {
  if (!chatContextId) return undefined
  const context = getChatContext(chatContextId)
  if (!context) return undefined
  const projectId = 'projectId' in context ? context.projectId : undefined
  const projectName = projectId ? projectTitle?.(projectId) : undefined
  // A topic's name lives on the chat record, not in its key: without it the
  // formatter's bare "Topic" would name nothing.
  if (context.type === 'PROJECT_TOPIC' || context.type === 'GROUP_TOPIC') {
    return projectName ? `a topic in ${projectName}` : undefined
  }
  return formatChatTitle({ context, ...(projectName ? { projectName } : {}) })
}
