import { useChatChangesMarker } from '../../../headless/hooks/useChatChangesDock'
import { ChatChangesMarker } from './ChatChangesMarker'

export type ChatChangesMarkerConnectedProps = {
  runId: string
  projectId: string
  /** The run whose changes the chat's bar holds. */
  openRunId?: string
  /** Every commit the chat's approved commit asks made: a turn whose receipt already says its change is there shows no marker. */
  receiptShas?: readonly string[]
  /** Opens a run's review as a screen of its own. */
  onOpenReview?: (runId: string) => void
}

/** Native peer of web's `ChatChangesMarkerConnected`: the marker under a chat turn, read off its run. */
export function ChatChangesMarkerConnected({
  runId,
  projectId,
  openRunId,
  receiptShas,
  onOpenReview,
}: ChatChangesMarkerConnectedProps) {
  const view = useChatChangesMarker(runId, projectId, {
    ...(openRunId ? { openRunId } : {}),
    ...(receiptShas ? { receiptShas } : {}),
    canOpen: onOpenReview !== undefined,
  })
  if (!view) return null
  return (
    <ChatChangesMarker
      view={view}
      {...(onOpenReview ? { onOpen: () => onOpenReview(runId) } : {})}
    />
  )
}
