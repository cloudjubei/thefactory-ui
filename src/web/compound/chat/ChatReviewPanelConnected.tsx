import type { ReactNode } from 'react'

import { useChatReviewHeader } from '../../../headless/hooks/useChatChangesDock'
import type { ChatReviewLayout } from '../../../headless/utils/chatChangesDockTypes'
import { ChatReviewPanel } from './ChatReviewPanel'

export type ChatReviewPanelConnectedProps = {
  runId: string
  projectId: string
  layout: ChatReviewLayout
  chatWidth?: number
  onClose: () => void
  children: ReactNode
}

/** A run's opened review, its head read off the run. */
export function ChatReviewPanelConnected({
  runId,
  projectId,
  layout,
  chatWidth,
  onClose,
  children,
}: ChatReviewPanelConnectedProps) {
  const header = useChatReviewHeader(runId, projectId)
  return (
    <ChatReviewPanel
      layout={layout}
      header={header}
      {...(chatWidth !== undefined ? { chatWidth } : {})}
      onClose={onClose}
    >
      {children}
    </ChatReviewPanel>
  )
}
