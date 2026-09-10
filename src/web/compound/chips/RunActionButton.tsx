import type { ReactNode } from 'react'

import { Button } from '../../primitives/Button'
import { IconPlay } from '../../icons'

export type RunActionButtonProps = {
  children: ReactNode
  onClick: () => void
  /** True while the run is in flight — the button turns inert with a spinner. */
  busy?: boolean
  busyLabel?: string
  disabled?: boolean
  title?: string
}

/**
 * The control that starts IMMEDIATE work on a review surface — a configured
 * command, no agent, no cost. It is the only accent-toned control in a check
 * block, so the eye finds the free action first.
 */
export default function RunActionButton({
  children,
  onClick,
  busy = false,
  busyLabel,
  disabled,
  title,
}: RunActionButtonProps) {
  return (
    <Button
      variant="run"
      size="sm"
      onClick={onClick}
      loading={busy}
      disabled={disabled}
      title={title}
    >
      {busy ? (
        (busyLabel ?? 'Running…')
      ) : (
        <>
          <IconPlay className="w-3 h-3" />
          {children}
        </>
      )}
    </Button>
  )
}
