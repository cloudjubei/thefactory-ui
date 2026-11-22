import type { CheckProjectTemplateUpdatesResponse } from '../api/generated'
import {
  TEMPLATE_UPDATES_AVAILABLE_LABEL,
  TEMPLATE_UPDATES_STATUS_LABEL,
} from './templateUpdatesConstants'

export type TemplateUpdatesCheck = CheckProjectTemplateUpdatesResponse
export type TemplateUpdatesStatus = TemplateUpdatesCheck['status']

/** True when the catalog tip has moved past the project's recorded provenance. */
export function isTemplateUpdatesAvailable(
  check: TemplateUpdatesCheck | null | undefined,
): boolean {
  return check?.available === true
}

/**
 * The banner label when updates are available; otherwise `undefined` so a
 * surface can hide the affordance without special-casing status strings.
 */
export function templateUpdatesAvailableLabel(
  check: TemplateUpdatesCheck | null | undefined,
): string | undefined {
  return isTemplateUpdatesAvailable(check) ? TEMPLATE_UPDATES_AVAILABLE_LABEL : undefined
}

/** Human-readable status for any check result (including non-available ones). */
export function templateUpdatesStatusLabel(
  status: TemplateUpdatesStatus | null | undefined,
): string | undefined {
  if (!status) return undefined
  return TEMPLATE_UPDATES_STATUS_LABEL[status]
}
