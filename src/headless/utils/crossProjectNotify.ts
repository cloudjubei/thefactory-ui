import type { FeatureRequestStatus } from 'thefactory-tools/types'

/** OS-notification content for a cross-project feature-request transition. */
export interface CrossProjectNotification {
  title: string
  body?: string
  /** Coalescing tag — same request replaces its prior notification rather than stacking. */
  tag: string
}

/**
 * The transitions worth an OS notification. The intermediate `accepted` / `in_progress` churn is
 * deliberately excluded — only a new inbound request (`pending`), a review to sign off (`in_review`),
 * and the terminal outcomes (`completed` / `failed` / `rejected`) notify.
 */
const NOTIFY_TITLE: Partial<Record<FeatureRequestStatus, string>> = {
  pending: 'New feature request',
  in_review: 'Feature request ready for review',
  completed: 'Feature request completed',
  failed: 'Feature request failed',
  rejected: 'Feature request rejected',
}

/**
 * Map a `featureRequest:updated` payload to its notification, or `null` to skip (a noisy
 * intermediate state). The EventNotifier still gates the actual post on permission + the
 * `cross-project` category toggle + document-visibility.
 */
export function crossProjectNotification(fr: {
  id: string
  title?: string
  status: FeatureRequestStatus
}): CrossProjectNotification | null {
  const title = NOTIFY_TITLE[fr.status]
  if (!title) return null
  return {
    title,
    ...(fr.title ? { body: fr.title } : {}),
    tag: `cross-project:${fr.id}`,
  }
}
