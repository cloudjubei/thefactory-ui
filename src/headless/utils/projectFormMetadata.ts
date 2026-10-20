/** What a project editor carries through a save untouched. Pure. */

import { PROJECT_FORM_METADATA_KEYS } from './projectFormMetadataConstants'

/**
 * Every metadata key the project editor does not normalise itself, as the project holds it — so a
 * save, which sends the whole metadata, keeps what the editor has no field for. Pure.
 */
export function projectMetadataCarried(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata ?? {}).filter(([key]) => !PROJECT_FORM_METADATA_KEYS.includes(key)),
  )
}
