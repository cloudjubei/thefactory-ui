import type { FilesEmittedArtifact } from '../api'
import { CHAT_CHANGES_COPY } from './chatChangesViewConstants'

/**
 * What a chat turn's change card shows in place of its review once its changes
 * were settled elsewhere — a later turn of the chat captured them again, or the
 * person discarded them; `undefined` while they still wait on the person. Pure.
 */
export function chatChangesNotice(
  artifact: Pick<FilesEmittedArtifact, 'supersededBy' | 'discardedAt' | 'appliedAt'> | undefined,
): string | undefined {
  if (!artifact || artifact.appliedAt != null) return undefined
  if (artifact.supersededBy) return CHAT_CHANGES_COPY.superseded
  return artifact.discardedAt != null ? CHAT_CHANGES_COPY.discarded : undefined
}

/**
 * What a chat turn's changes say when they were made without the chat's open
 * review — its session started from the checkout because that review no longer
 * fit — and so wait as their own sign-off; `undefined` for any others. Pure.
 */
export function heldChatChangesNote(
  artifact: Pick<FilesEmittedArtifact, 'heldBehindReview' | 'appliedAt'> | undefined,
): string | undefined {
  if (!artifact?.heldBehindReview || artifact.appliedAt != null) return undefined
  return CHAT_CHANGES_COPY.held
}

/** The files whose captured change throws away edits nobody had committed. Pure. */
export function discardedEditPaths(
  artifact:
    | { payload: { files: ReadonlyArray<{ path: string; discardsUncommittedEdits?: boolean }> } }
    | undefined,
): ReadonlySet<string> {
  return new Set(
    (artifact?.payload.files ?? []).filter((f) => f.discardsUncommittedEdits).map((f) => f.path),
  )
}

/** Each changed file, warned when its change throws away edits nobody had committed. Pure. */
export function withDiscardWarnings<F extends { path: string; warning?: string }>(
  files: F[],
  discarded: ReadonlySet<string>,
): F[] {
  if (discarded.size === 0) return files
  return files.map((file) =>
    discarded.has(file.path)
      ? { ...file, warning: CHAT_CHANGES_COPY.discardsUncommittedEdits }
      : file,
  )
}
