import { bridgeMessageName, type BridgeRequest } from './appBridge'
import { WORK_START_MESSAGE } from './appBridgeConstants'
import {
  APP_WORK_START_FEATURE_TITLE_REQUIRED,
  APP_WORK_START_FEATURES_INVALID,
  APP_WORK_START_PROCESS_INVALID,
  APP_WORK_START_TITLE_REQUIRED,
} from './appWorkStartConstants'
import type {
  AppWorkFeatureDraft,
  AppWorkStartAsk,
  AppWorkStartDraft,
  AppWorkStartReply,
} from './appWorkStartTypes'

export function isWorkStartRequest(req: BridgeRequest): boolean {
  return bridgeMessageName(req.type) === WORK_START_MESSAGE
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const PROCESS_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * The work an app asks to start (`work.start {title, description, features?, processId?}`), or
 * why it cannot be shown.
 */
export function parseWorkStartPayload(payload: unknown): AppWorkStartDraft | { error: string } {
  const rec = asRecord(payload)
  const title = text(rec?.title)
  if (!rec || !title) return { error: APP_WORK_START_TITLE_REQUIRED }
  const raw = rec.features ?? []
  if (!Array.isArray(raw)) return { error: APP_WORK_START_FEATURES_INVALID }
  const features: AppWorkFeatureDraft[] = []
  for (const entry of raw) {
    const feature = asRecord(entry)
    if (!feature) return { error: APP_WORK_START_FEATURES_INVALID }
    const featureTitle = text(feature.title)
    if (!featureTitle) return { error: APP_WORK_START_FEATURE_TITLE_REQUIRED }
    features.push({ title: featureTitle, description: text(feature.description) })
  }
  const processId = text(rec.processId)
  if (rec.processId !== undefined && !PROCESS_ID.test(processId)) {
    return { error: APP_WORK_START_PROCESS_INVALID }
  }
  return {
    title,
    description: text(rec.description),
    features,
    ...(processId ? { processId } : {}),
  }
}

/** Why the person's edited draft cannot start, or `null` when it can. */
export function workStartDraftError(draft: AppWorkStartDraft): string | null {
  if (!draft.title.trim()) return APP_WORK_START_TITLE_REQUIRED
  if (draft.features.some((f) => !f.title.trim())) return APP_WORK_START_FEATURE_TITLE_REQUIRED
  return null
}

/** The features to make: those asked for, or the work itself as one feature, since a run works features. */
export function workStartFeatures(draft: AppWorkStartDraft): AppWorkFeatureDraft[] {
  const features = draft.features.length
    ? draft.features
    : [{ title: draft.title, description: draft.description }]
  return features.map((f) => ({ title: f.title.trim(), description: f.description.trim() }))
}

/** Whether the person may still edit the draft: nothing is running and no story was made from it yet. */
export function workStartEditable(ask: Pick<AppWorkStartAsk, 'busy' | 'progress'>): boolean {
  return !ask.busy && !ask.progress.storyId
}

export function workStartStarted(storyId: string, runId?: string): AppWorkStartReply {
  return runId ? { status: 'started', storyId, runId } : { status: 'started', storyId }
}

export function workStartDeclined(reason?: string): AppWorkStartReply {
  return reason ? { status: 'declined', reason } : { status: 'declined' }
}
