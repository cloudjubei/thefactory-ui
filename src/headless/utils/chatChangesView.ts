import type { FilesEmittedArtifact } from '../api'
import { CHAT_CHANGES_COPY } from './chatChangesViewConstants'

/**
 * What a chat turn's sign-off shows in place of its review once its changes
 * were settled elsewhere — a later turn of the chat captured them again, or the
 * person discarded them — or `undefined` while they still wait on the person. Pure.
 */
export function chatChangesNotice(
  artifact: Pick<FilesEmittedArtifact, 'supersededBy' | 'discardedAt' | 'appliedAt'> | undefined,
): string | undefined {
  if (!artifact || artifact.appliedAt != null) return undefined
  if (artifact.supersededBy) return CHAT_CHANGES_COPY.superseded
  return artifact.discardedAt != null ? CHAT_CHANGES_COPY.discarded : undefined
}
