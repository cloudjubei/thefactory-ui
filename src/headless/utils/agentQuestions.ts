// Pure mappers for a mid-run `askUser` question. A question rides the same
// broker action path as a permission grant, but it is answered with text
// rather than approved — these helpers keep that split out of the components.

import type { AgentQuestion, AgentQuestionDecision } from './agentQuestionTypes'
import {
  BLOCKER_ACTION_KIND,
  QUESTION_ACTION_KIND,
  QUESTION_DECLINED_ANSWER,
  QUESTION_FALLBACK_PROMPT,
} from './agentQuestionConstants'
import type {
  PendingQuestionGrant,
  PendingRemedyGrant,
  PendingToolGrant,
  UserAsk,
} from './chatTypes'
import type { CredentialCapture } from './credentialCaptureTypes'
import { awaitingCaptures } from './credentialCaptures'
import { isRemedyGrant } from './agentRemedy'
import type { CliPendingActionLike } from './pendingToolGrants'

/**
 * True when a broker action is answered with words — an `askUser` question or
 * a `reportBlocked` blocker — rather than a permission request.
 */
export function isQuestionAction(action: CliPendingActionLike): boolean {
  return action.kind === QUESTION_ACTION_KIND || action.kind === BLOCKER_ACTION_KIND
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const seen = new Set<string>()
  for (const entry of value) {
    const text = readText(entry)
    if (text) seen.add(text)
  }
  return seen.size > 0 ? [...seen] : undefined
}

/**
 * Parse a broker action's `unknown` payload into a renderable question. Never
 * throws: a payload with no readable question text yields the fallback prompt
 * plus the untouched payload on `raw`, so the card shows what actually arrived.
 */
export function parseQuestionPayload(payload: unknown): AgentQuestion {
  const direct = readText(payload)
  if (direct) return { question: direct }

  const record =
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : undefined

  const blocker = readText(record?.blocker)
  const needed = readText(record?.needFromPerson)
  const tried = readText(record?.tried)
  const question =
    readText(record?.question) ??
    (blocker || needed
      ? [blocker, needed ? `What it needs from you: ${needed}` : undefined]
          .filter((line): line is string => line !== undefined)
          .join('\n\n')
      : undefined)
  const context = readText(record?.context) ?? (tried ? `What it tried: ${tried}` : undefined)
  const options = readOptions(record?.options)

  const parsed: AgentQuestion = { question: question ?? QUESTION_FALLBACK_PROMPT }
  if (context) parsed.context = context
  if (options) parsed.options = options
  if (!question) parsed.raw = payload
  return parsed
}

/** Whether an answer is substantive enough to send back to the agent. */
export function canSubmitAnswer(answer: string): boolean {
  return answer.trim().length > 0
}

/** Decision body carrying the user's typed answer back to the waiting agent. */
export function answerDecision(answer: string): AgentQuestionDecision {
  return { outcome: 'approved', decidedVia: 'card', metadata: { answer: answer.trim() } }
}

/** Decision body for a declined question — the agent proceeds on its own judgement. */
export function declineDecision(): AgentQuestionDecision {
  return { outcome: 'denied', decidedVia: 'card', metadata: { answer: QUESTION_DECLINED_ANSWER } }
}

/** Narrow a unified grant to one the question card can render and answer. */
export function isQuestionGrant(grant: PendingToolGrant): grant is PendingQuestionGrant {
  return grant.question !== undefined && typeof grant.answer === 'function'
}

/**
 * Split the unified grant feed into the questions (rendered inline as question
 * cards) and the permission grants (rendered by the confirmation modal), so
 * neither surface ever renders the other's kind.
 */
export function partitionGrants(grants: PendingToolGrant[] | undefined): {
  questions: PendingQuestionGrant[]
  remedies: PendingRemedyGrant[]
  permissions: PendingToolGrant[]
} {
  const questions: PendingQuestionGrant[] = []
  const remedies: PendingRemedyGrant[] = []
  const permissions: PendingToolGrant[] = []
  for (const grant of grants ?? []) {
    if (isQuestionGrant(grant)) questions.push(grant)
    else if (isRemedyGrant(grant)) remedies.push(grant)
    else permissions.push(grant)
  }
  return { questions, remedies, permissions }
}

/**
 * Everything waiting on the user's answer, in the order it is paged through:
 * the open questions, then the credential forms still open. Both park the agent
 * the same way, so both take the composer's place the same way.
 */
export function userAsks(
  questions: readonly PendingQuestionGrant[],
  captures: readonly CredentialCapture[],
): UserAsk[] {
  return [
    ...questions.map((grant): UserAsk => ({ kind: 'question', id: grant.id, grant })),
    ...awaitingCaptures(captures).map(
      (capture): UserAsk => ({ kind: 'capture', id: capture.id, capture }),
    ),
  ]
}

/**
 * Which of the open questions to show — one at a time, as a pager does: the one
 * chosen while it is still open, else the first. Answering one moves on to the
 * next instead of stacking every question at once.
 */
export function shownQuestionId(
  openIds: readonly string[],
  chosenId: string | undefined,
): string | undefined {
  if (chosenId !== undefined && openIds.includes(chosenId)) return chosenId
  return openIds[0]
}
