import type {
  ProcessParkChoice,
  ProcessResumeChoice,
  ProcessRun,
  ProcessWaitingAsk,
  ProcessWaitingItem,
} from 'thefactory-tools/types'
import {
  isReflectedPark,
  processAgentLabel,
  processParkChoices,
  processWaitingItemChoices,
  processWaitingOpenItems,
} from 'thefactory-tools/utils'

import {
  WAITING_BLOCKER_HEADING,
  WAITING_DELEGATED_LABEL,
  WAITING_DETAIL_LABELS,
  WAITING_PERMISSION_HEADING,
  WAITING_PERMISSION_HEADINGS,
  WAITING_QUESTION_HEADING,
  WAITING_REQUEST_DECIDED,
  WAITING_REQUESTS_HEADING,
  WAITING_REQUESTS_WORDS,
} from './processWaitingViewConstants'
import type { ChatContext } from '../api'
import type {
  ProcessWaitingDetail,
  ProcessWaitingRequestView,
  ProcessWaitingView,
} from './processWaitingViewTypes'

/** "The verifier needs network access" — the card's heading, by what was asked. */
export function processWaitingHeading(
  ask: Pick<ProcessWaitingAsk, 'kind' | 'agent' | 'request' | 'items'>,
): string {
  const agent = `The ${processAgentLabel(ask.agent)}`
  if (ask.items) return `${agent} ${WAITING_REQUESTS_HEADING}`
  if (ask.kind === 'question') return `${agent} ${WAITING_QUESTION_HEADING}`
  if (ask.kind === 'blocker') return `${agent} ${WAITING_BLOCKER_HEADING}`
  const kind = ask.request?.actionKind ?? ''
  return `${agent} ${WAITING_PERMISSION_HEADINGS[kind] ?? WAITING_PERMISSION_HEADING}`
}

/** What exactly the agent asked for, one line each. */
export function processWaitingDetails(
  ask: Pick<ProcessWaitingAsk, 'request'>,
): ProcessWaitingDetail[] {
  const request = ask.request
  if (!request) return []
  const packageName = request.packageName
    ? `${request.packageName}${request.ecosystem ? ` (${request.ecosystem})` : ''}`
    : undefined
  return [
    ...(request.host ? [{ label: WAITING_DETAIL_LABELS.host, value: request.host }] : []),
    ...(packageName ? [{ label: WAITING_DETAIL_LABELS.packageName, value: packageName }] : []),
    ...(request.url ? [{ label: WAITING_DETAIL_LABELS.url, value: request.url }] : []),
    // A blocker's words are its whole ask; the tool it was said through is not news.
    ...(request.toolName && request.actionKind !== 'blocker'
      ? [{ label: WAITING_DETAIL_LABELS.tool, value: request.toolName }]
      : []),
  ]
}

/** What a decided request of several says, by how it was decided. */
function decidedLabel(answer: NonNullable<ProcessWaitingItem['answer']>): string {
  const choice = answer.choice
  return choice === 'allow' || choice === 'allow-site' || choice === 'decline'
    ? WAITING_REQUEST_DECIDED[choice]
    : WAITING_REQUEST_DECIDED.withdrawn
}

/** One of several waiting requests, as its own row: what it asks and its answers. */
function processWaitingRequestView(item: ProcessWaitingItem): ProcessWaitingRequestView {
  return {
    actionId: item.request.actionId,
    title: item.title,
    words: item.detail,
    details: processWaitingDetails(item),
    choices: item.answer ? [] : processWaitingItemChoices(item),
    ...(item.answer ? { decided: decidedLabel(item.answer) } : {}),
  }
}

/**
 * The card for a run parked on an agent waiting on the person, or `undefined`
 * for any other park — including a story's mirror of one, which is answered on
 * the nested run.
 */
export function processWaitingView(
  run: Pick<ProcessRun, 'park' | 'projectId'>,
): ProcessWaitingView | undefined {
  const park = run.park
  const ask = park?.ask
  if (park?.reason !== 'step-waiting' || !ask || isReflectedPark(park)) return undefined
  const delegatedTo = ask.delegatedTo
  const chatContext: ChatContext | undefined = delegatedTo
    ? { type: 'PROJECT_TOPIC', projectId: run.projectId, topicId: delegatedTo.topicId }
    : undefined
  return {
    kind: ask.kind,
    heading: processWaitingHeading(ask),
    title: ask.title,
    words: ask.items
      ? WAITING_REQUESTS_WORDS(processWaitingOpenItems(ask).length, ask.items.length)
      : ask.detail,
    details: processWaitingDetails(ask),
    ...(ask.runRef?.chatContextId ? { transcript: ask.runRef } : {}),
    transcriptLabel: `Open the ${processAgentLabel(ask.agent)}’s transcript →`,
    choices: processParkChoices('step-waiting', { ask }),
    ...(ask.items ? { requests: ask.items.map(processWaitingRequestView) } : {}),
    ...(chatContext ? { delegated: { chatContext, label: WAITING_DELEGATED_LABEL } } : {}),
  }
}

/** A park choice that answers the run through resume — every one but handing the ask on. */
export function isResumeParkChoice(
  choice: ProcessParkChoice,
): choice is ProcessParkChoice & { choice: ProcessResumeChoice } {
  return choice.choice !== 'delegate'
}
