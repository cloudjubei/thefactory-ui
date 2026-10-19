import type { UseChatOpenChanges } from '../../../headless/hooks/useChatOpenChanges'
import { useCliRunArtifact } from '../../../headless/hooks/useCliRunArtifact'
import { useRunSignoffVerdict } from '../../../headless/hooks/useRunSignoffVerdict'
import { chatChangesBarView } from '../../../headless/utils/chatChangesDock'
import { ChatChangesBar } from './ChatChangesBar'

export type ChatChangesBarConnectedProps = {
  projectId: string
  /** The chat's open changes, from `useChatOpenChanges`. */
  openChanges: UseChatOpenChanges
  compact?: boolean
  /** A phone-wide chat: the bar as one row. */
  narrow?: boolean
  /** Opens the open changes' review. */
  onReview: (runId: string) => void
}

/** The bar holding the decision on the chat's open changes, with their checks' verdict. Nothing while none wait. */
export function ChatChangesBarConnected({
  projectId,
  openChanges,
  compact = false,
  narrow = false,
  onReview,
}: ChatChangesBarConnectedProps) {
  const verdict = useRunSignoffVerdict(openChanges.openChanges?.runId, projectId)
  const { landFailure } = useCliRunArtifact(openChanges.openChanges?.runId, projectId)
  const view = chatChangesBarView(
    {
      openChanges: openChanges.openChanges,
      ...(verdict ? { verdict } : {}),
      ...(openChanges.busy ? { busy: openChanges.busy } : {}),
      ...(openChanges.error ? { error: openChanges.error } : {}),
      ...(landFailure?.reason === 'already-on-base' ? { alreadyOnBase: true } : {}),
    },
    Date.now(),
  )
  if (!view) return null
  return (
    <ChatChangesBar
      view={view}
      compact={compact}
      narrow={narrow}
      onReview={() => onReview(view.runId)}
      onDiscard={() => void openChanges.discard()}
    />
  )
}
