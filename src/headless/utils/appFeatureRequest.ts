import type { CreateFeatureRequestData } from '../api/generated'
import { bridgeMessageName, type BridgeRequest } from './appBridge'
import { FEATURE_REQUEST_MESSAGE } from './appBridgeConstants'
import {
  APP_FEATURE_REQUEST_LISTS_INVALID,
  APP_FEATURE_REQUEST_OWN_PROJECT,
  APP_FEATURE_REQUEST_TARGET_REQUIRED,
  APP_FEATURE_REQUEST_TITLE_REQUIRED,
} from './appFeatureRequestConstants'
import type { AppFeatureRequestDraft, AppFeatureRequestReply } from './appFeatureRequestTypes'

export function isFeatureRequestRequest(req: BridgeRequest): boolean {
  return bridgeMessageName(req.type) === FEATURE_REQUEST_MESSAGE
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function textList(value: unknown): string[] | null {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) return null
  return (value as string[]).map((v) => v.trim()).filter(Boolean)
}

/**
 * The request an app asks to send (`feature.request {targetProjectId, title, summary?,
 * description?, doneWhen?, references?}`), or why it cannot be shown.
 */
export function parseFeatureRequestPayload(
  payload: unknown,
): AppFeatureRequestDraft | { error: string } {
  const rec = asRecord(payload)
  const targetProjectId = text(rec?.targetProjectId)
  if (!rec || !targetProjectId) return { error: APP_FEATURE_REQUEST_TARGET_REQUIRED }
  const title = text(rec.title)
  if (!title) return { error: APP_FEATURE_REQUEST_TITLE_REQUIRED }
  const doneWhen = textList(rec.doneWhen)
  const references = textList(rec.references)
  if (!doneWhen || !references) return { error: APP_FEATURE_REQUEST_LISTS_INVALID }
  return {
    targetProjectId,
    title,
    summary: text(rec.summary),
    description: text(rec.description),
    doneWhen,
    references,
  }
}

/** Why the person's edited request cannot be sent from `fromProjectId`, or `null` when it can. */
export function featureRequestDraftError(
  draft: AppFeatureRequestDraft,
  fromProjectId: string,
): string | null {
  if (!draft.title.trim()) return APP_FEATURE_REQUEST_TITLE_REQUIRED
  if (draft.targetProjectId === fromProjectId) return APP_FEATURE_REQUEST_OWN_PROJECT
  return null
}

/** The request as `POST /feature-requests` takes it, empty fields left out. */
export function featureRequestBody(
  fromProjectId: string,
  draft: AppFeatureRequestDraft,
): CreateFeatureRequestData['body'] {
  const summary = draft.summary.trim()
  const description = draft.description.trim()
  const doneWhen = draft.doneWhen.map((line) => line.trim()).filter(Boolean)
  return {
    targetProjectId: draft.targetProjectId,
    fromProjectId,
    title: draft.title.trim(),
    ...(summary ? { summary } : {}),
    ...(description ? { description } : {}),
    ...(doneWhen.length ? { doneWhen: doneWhen.map((line) => ({ text: line })) } : {}),
    ...(draft.references.length ? { references: [...draft.references] } : {}),
  }
}

/**
 * The lines of a one-per-line text field as typed, blank ones included, so typing a new line
 * keeps it; what is sent leaves the blank ones out.
 */
export function featureRequestLines(value: string): string[] {
  return value.split('\n')
}

/** Entries as a one-per-line text field. */
export function featureRequestLinesText(lines: readonly string[]): string {
  return lines.join('\n')
}

export function featureRequestSent(requestId: string): AppFeatureRequestReply {
  return { status: 'sent', requestId }
}

export function featureRequestDeclined(reason?: string): AppFeatureRequestReply {
  return reason ? { status: 'declined', reason } : { status: 'declined' }
}
