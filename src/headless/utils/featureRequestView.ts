import { PROOF_KIND_LABELS } from 'thefactory-tools/constants'
import {
  featureRequestHandoverTarget,
  featureRequestRestartRefusal,
  featureRequestSettleRefusal,
} from 'thefactory-tools/utils'
import type {
  ChatContext,
  FeatureRequest,
  FeatureRequestBrief,
  FeatureRequestCriterion,
  FeatureRequestStatus,
} from 'thefactory-tools/types'
import { isProofKind } from 'thefactory-tools/validations'
import {
  FEATURE_REQUEST_SECTION_TITLES,
  FEATURE_REQUEST_STATUS_VIEW,
  FEATURE_REQUEST_WAIT_CYCLE_WORDS,
} from './featureRequestViewConstants'
import type {
  FeatureRequestLinkView,
  FeatureRequestPhase,
  FeatureRequestSectionId,
  FeatureRequestSectionView,
  FeatureRequestSettledView,
  FeatureRequestSettleMode,
  FeatureRequestStartAgainChoice,
  FeatureRequestStatusView,
} from './featureRequestViewTypes'

function filled(text: string | undefined): string | undefined {
  const trimmed = text?.trim()
  return trimmed ? trimmed : undefined
}

/** The paragraph under a request's title: its summary, or the whole text of an older request. */
export function featureRequestSummary(brief: FeatureRequestBrief): string {
  return filled(brief.summary) ?? filled(brief.description) ?? ''
}

function section(
  id: FeatureRequestSectionId,
  meta: string,
  numbered: boolean,
  items: ReadonlyArray<{ text: string; byHand?: boolean }>,
): FeatureRequestSectionView {
  return {
    id,
    title: FEATURE_REQUEST_SECTION_TITLES[id],
    meta,
    numbered,
    items: items.map((item, i) => ({
      marker: numbered ? String(i + 1) : '',
      text: item.text,
      byHand: item.byHand === true,
    })),
  }
}

const textItems = (texts: string[]) => texts.map((text) => ({ text }))

function doneWhenMeta(criteria: FeatureRequestCriterion[]): string {
  const count = `${criteria.length} ${criteria.length === 1 ? 'criterion' : 'criteria'}`
  const byHand = criteria.filter((c) => c.byHand).length
  return byHand > 0 ? `${count} · ${byHand} by hand` : count
}

/**
 * The parts a request's card opens, in reading order, each only when the request has it. An older
 * request — a description and nothing else — has none: its summary paragraph carries all of it.
 */
export function featureRequestSections(
  brief: FeatureRequestBrief,
  fromLabel: string,
): FeatureRequestSectionView[] {
  const sections: FeatureRequestSectionView[] = []
  const { changes, doneWhen, rules, proof, references } = brief
  if (changes?.length) {
    sections.push(section('changes', String(changes.length), true, textItems(changes)))
  }
  if (doneWhen?.length) sections.push(section('doneWhen', doneWhenMeta(doneWhen), true, doneWhen))
  if (rules?.length) sections.push(section('rules', String(rules.length), false, textItems(rules)))
  if (proof?.length) {
    const labels = proof.map((kind) => PROOF_KIND_LABELS[kind])
    sections.push(section('proof', String(proof.length), false, textItems(labels)))
  }
  const origin = filled(brief.origin)
  if (origin || references?.length) {
    const lines = [...(origin ? [origin] : []), ...(references ?? [])]
    sections.push(section('origin', fromLabel, false, textItems(lines)))
  }
  const description = filled(brief.description)
  if (description && filled(brief.summary)) {
    sections.push(section('detail', '', false, textItems([description])))
  }
  return sections
}

/** How a request's status reads, and which footer its card shows. */
export function featureRequestStatusView(status: FeatureRequestStatus): FeatureRequestStatusView {
  return FEATURE_REQUEST_STATUS_VIEW[status]
}

/** Which footer a request's card shows: settled once delivered or handed over elsewhere, else by its status. */
export function featureRequestPhase(
  request: Pick<FeatureRequest, 'status' | 'deliveredBy'>,
): FeatureRequestPhase {
  return request.deliveredBy ? 'settled' : featureRequestStatusView(request.status).phase
}

/** The request's own chat, in the project it was sent to — where a link to the request opens. */
export function featureRequestChatContext(
  request: Pick<FeatureRequest, 'id' | 'targetProjectId'>,
): ChatContext {
  return {
    type: 'FEATURE_REQUEST',
    projectId: request.targetProjectId,
    featureRequestId: request.id,
  }
}

/** Which of the asking project's chats sent the request, in a few words. */
export function featureRequestViaLabel(context: ChatContext): string {
  switch (context.type) {
    case 'PROJECT':
      return 'its project chat'
    case 'PROJECT_TOPIC':
      return 'a project chat'
    case 'STORY':
      return 'a story chat'
    case 'FEATURE':
      return 'a feature chat'
    case 'AGENT_RUN_STORY':
    case 'AGENT_RUN_FEATURE':
    case 'AGENT_RUN_TASK':
      return 'an agent run'
    case 'FEATURE_REQUEST':
      return 'a request it took on'
    case 'GROUP':
    case 'GROUP_TOPIC':
      return 'a group chat'
    case 'GENERAL':
      return 'the assistant'
  }
}

/** The request's filled parts and their counts, on one line — the asker's compact card. */
export function featureRequestCountsLine(brief: FeatureRequestBrief): string {
  const parts: Array<[string, number | undefined]> = [
    [FEATURE_REQUEST_SECTION_TITLES.changes, brief.changes?.length],
    [FEATURE_REQUEST_SECTION_TITLES.doneWhen, brief.doneWhen?.length],
    [FEATURE_REQUEST_SECTION_TITLES.rules, brief.rules?.length],
  ]
  return parts
    .filter(([, count]) => count)
    .map(([title, count]) => `${title} ${count}`)
    .join(' · ')
}

/**
 * The warning a request carries while its work and another request's wait on each other: who is
 * in it, and which side decides first. Nothing is decided for the person.
 */
export function featureRequestWaitCycleWarning(
  request: Partial<Pick<FeatureRequest, 'id' | 'waitCycle'>>,
): string | undefined {
  const cycle = request.waitCycle
  if (!cycle) return undefined
  const others = [
    ...new Set(cycle.waits.filter((w) => w.requestId !== request.id).map((w) => w.projectId)),
  ]
  const decider = cycle.waits.find((w) => w.requestId === cycle.decideFirstRequestId)?.projectId
  const lead = FEATURE_REQUEST_WAIT_CYCLE_WORDS.lead(others)
  return cycle.decideFirstRequestId === request.id || !decider
    ? `${lead} ${FEATURE_REQUEST_WAIT_CYCLE_WORDS.decideHere}`
    : `${lead} ${FEATURE_REQUEST_WAIT_CYCLE_WORDS.decideThere(decider)}`
}

/**
 * The warning a request carries when its work waits on another request's that waits on it, or
 * when accepting it can leave both projects waiting on each other.
 */
export function featureRequestCycleWarning(
  request: Partial<Pick<FeatureRequest, 'id' | 'cycleFlag' | 'waitCycle'>>,
  fromLabel: string,
): string | undefined {
  const waiting = featureRequestWaitCycleWarning(request)
  if (waiting) return waiting
  return request.cycleFlag?.detected
    ? `This project is already waiting on ${fromLabel}. Accepting can leave each waiting on the other.`
    : undefined
}

/** The story the work was placed on, as its chip reads: `#3 Title`, or as much as is known. */
export function featureRequestStoryLabel(
  title: string | undefined,
  index: number | undefined,
): string {
  const name = title ?? 'a story'
  return index !== undefined ? `#${index} ${name}` : name
}

/** What accepting does, said under the buttons. */
export function featureRequestAcceptHint(fromLabel: string): string {
  return `Accepting places it on a story here and starts the work the way you choose. Each step is reported back to ${fromLabel}.`
}

/** The label above the reason box when rejecting. */
export function featureRequestRejectPrompt(fromLabel: string): string {
  return `Why? ${fromLabel}’s chat is told.`
}

/** Under the full request's decision heading: who waits, and who hears. */
export function featureRequestWaitingLine(fromLabel: string): string {
  return `${fromLabel} is waiting on it. Its chat hears your decision.`
}

/** The line a rejected request's card shows. */
export function featureRequestRejectedLine(fromLabel: string): string {
  return `${fromLabel} was told; nothing was started.`
}

/** Whether an accepted request's work is still to start: it was accepted, and nothing started it. */
export function canStartFeatureRequestWork(
  request: Pick<FeatureRequest, 'status' | 'handling'>,
): boolean {
  return request.status === 'accepted' && !request.handling?.work
}

/** Whether a request's work can be started again: it ended blocked or failed, on a story. */
export function canStartFeatureRequestAgain(
  request: Pick<FeatureRequest, 'status' | 'handling'>,
): boolean {
  return featureRequestRestartRefusal(request) === undefined
}

/** How a request's work starts again when nothing else is chosen: the way its last work went. */
export function featureRequestStartAgainChoice(
  request: Pick<FeatureRequest, 'handling'> | undefined,
): FeatureRequestStartAgainChoice {
  return { mode: request?.handling?.work?.mode ?? 'chat' }
}

/** Whether a request can still be marked delivered or handed over — a rejected one included. */
export function canSettleFeatureRequest(request: Pick<FeatureRequest, 'status'>): boolean {
  return featureRequestSettleRefusal(request) === undefined
}

/** Whether the open settle form names enough to send: a reference, and a project to hand over to. */
export function featureRequestSettleFormReady(
  mode: FeatureRequestSettleMode,
  values: { projectId: string; ref: string },
): boolean {
  if (!values.ref.trim()) return false
  return mode === 'delivered' || values.projectId.trim() !== ''
}

/** Under the settle form: who hears it, and what else closes. */
export function featureRequestSettleHint(fromLabel: string): string {
  return `${fromLabel}’s chat is told. Its review closes.`
}

function requestLink(
  requestId: string,
  titleOf: (id: string) => string | undefined,
): FeatureRequestLinkView {
  return { requestId, label: titleOf(requestId) ?? requestId }
}

/**
 * How a request settled outside its own run reads: what delivered it, or where its work was handed
 * over — linking the request that took it over, by title once known. Nothing for any other request.
 */
export function featureRequestSettledLine(
  request: Pick<FeatureRequest, 'deliveredBy' | 'handedOverTo'>,
  titleOf: (id: string) => string | undefined,
): FeatureRequestSettledView | undefined {
  const { deliveredBy, handedOverTo } = request
  const settled = deliveredBy
    ? { text: `Delivered by ${deliveredBy.ref}`, note: deliveredBy.note }
    : handedOverTo?.requestId
      ? {
          text: `Handed over to ${handedOverTo.projectId}`,
          link: requestLink(handedOverTo.requestId, titleOf),
          note: handedOverTo.note,
        }
      : handedOverTo
        ? {
            text: `Handed over to ${featureRequestHandoverTarget(handedOverTo)}`,
            note: handedOverTo.note,
          }
        : undefined
  if (!settled) return undefined
  const { note, ...rest } = settled
  return note ? { ...rest, note } : rest
}

/** The requests whose work this one took over, each a link by title once known. */
export function featureRequestTakenOverLinks(
  request: Pick<FeatureRequest, 'takenOverFrom'>,
  titleOf: (id: string) => string | undefined,
): FeatureRequestLinkView[] {
  return (request.takenOverFrom ?? []).map((id) => requestLink(id, titleOf))
}

function parsedArgs(args: unknown): Record<string, unknown> | undefined {
  if (typeof args === 'string') {
    try {
      return parsedArgs(JSON.parse(args))
    } catch {
      return undefined
    }
  }
  return args && typeof args === 'object' ? (args as Record<string, unknown>) : undefined
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

function textList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter(isText) : undefined
}

function criteria(value: unknown): FeatureRequestCriterion[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((entry: unknown): FeatureRequestCriterion[] => {
    if (!entry || typeof entry !== 'object') return []
    const { text, byHand } = entry as { text?: unknown; byHand?: unknown }
    if (!isText(text)) return []
    return [byHand === true ? { text, byHand } : { text }]
  })
}

/**
 * The brief an agent is filing, read from its `requestProjectFeature` arguments for the card shown
 * before it is sent. Parts not in the shape a card can show are left out; no title, no brief.
 */
export function featureRequestBriefOfToolArgs(args: unknown): FeatureRequestBrief | undefined {
  const source = parsedArgs(args)
  if (!source || !isText(source.title)) return undefined
  const brief: FeatureRequestBrief = { title: source.title }
  if (isText(source.summary)) brief.summary = source.summary
  if (isText(source.description)) brief.description = source.description
  const changes = textList(source.changes)
  if (changes) brief.changes = changes
  const doneWhen = criteria(source.doneWhen)
  if (doneWhen) brief.doneWhen = doneWhen
  const rules = textList(source.rules)
  if (rules) brief.rules = rules
  if (Array.isArray(source.proof)) brief.proof = source.proof.filter(isProofKind)
  const adopters = textList(source.adopters)
  if (adopters) brief.adopters = adopters
  if (isText(source.origin)) brief.origin = source.origin
  const references = textList(source.references)
  if (references) brief.references = references
  return brief
}

/**
 * A request chat's messages without the opening one the host seeds — the request itself, which the
 * card above the conversation shows. Only that first message goes: the person's later ones stay.
 */
export function hiddenFeatureRequestIntro<T extends { role: string }>(
  messages: T[],
  isRequestChat: boolean,
): T[] {
  return isRequestChat && messages[0]?.role === 'user' ? messages.slice(1) : messages
}
