import { PROOF_KIND_LABELS } from 'thefactory-tools/constants'
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
} from './featureRequestViewConstants'
import type {
  FeatureRequestSectionId,
  FeatureRequestSectionView,
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

/** The warning a request carries when accepting it can leave both projects waiting on each other. */
export function featureRequestCycleWarning(
  request: Pick<FeatureRequest, 'cycleFlag'>,
  fromLabel: string,
): string | undefined {
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
  return `Accepting places it on a story here, starts an agent in this chat, and reports each step back to ${fromLabel}.`
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
