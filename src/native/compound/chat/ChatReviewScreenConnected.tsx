import type { ReactNode } from 'react'

import { useChatReviewHeader } from '../../../headless/hooks/useChatChangesDock'
import { ChatReviewScreen } from './ChatReviewScreen'

export type ChatReviewScreenConnectedProps = {
  runId: string
  projectId: string
  onBack: () => void
  children: ReactNode
}

/** A run's review screen, its head read off the run. */
export function ChatReviewScreenConnected({
  runId,
  projectId,
  onBack,
  children,
}: ChatReviewScreenConnectedProps) {
  const header = useChatReviewHeader(runId, projectId)
  return (
    <ChatReviewScreen header={header} onBack={onBack}>
      {children}
    </ChatReviewScreen>
  )
}
