import type { ReactNode } from 'react'

import { Button } from '../../primitives/Button'
import { IconAgent } from '../../icons'

export type HandoffButtonProps = {
  /** The request, without the trailing ellipsis — "Ask the agent to fix this". */
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}

/**
 * The control that hands work to an AGENT. Quieter than the run button, never
 * accent-filled, and it ends in an ellipsis because it opens a confirm rather
 * than acting — approving it spends a run, and the price is shown on the face
 * so the confirm never carries a surprise.
 */
export default function HandoffButton({ children, onClick, disabled, title }: HandoffButtonProps) {
  return (
    <Button variant="handoff" size="sm" onClick={onClick} disabled={disabled} title={title}>
      <IconAgent className="w-3 h-3" />
      <span>
        {children}
        {'…'}
      </span>
      <span className="text-(--text-muted) font-normal">· 1 run</span>
    </Button>
  )
}
