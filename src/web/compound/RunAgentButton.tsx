import React from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'
import { IconPlay } from '../icons'

/**
 * The Run button: a click asks the host to start the work. Which way it runs
 * is chosen after, in the launch chooser the host opens.
 */
export type RunAgentButtonProps = {
  className?: string
  onClick: () => void
  /** When set, the trigger renders with a visible text label instead of icon-only. */
  label?: string
  /**
   * Render the trigger as a plain `<button>` carrying this exact class
   * instead of the default `btn` styling — lets a host drop the control
   * into its own menu / list so it matches the surrounding rows.
   */
  triggerClassName?: string
}

export default function RunAgentButton({
  className = '',
  onClick,
  label,
  triggerClassName,
}: RunAgentButtonProps) {
  const triggerProps = {
    type: 'button' as const,
    'aria-label': 'Run Agent',
    title: 'Run Agent',
    style: { touchAction: 'manipulation', userSelect: 'none' } as React.CSSProperties,
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => e.stopPropagation(),
    onClick: () => onClick(),
    draggable: false,
  }

  return (
    <div className={cn('no-drag', className)}>
      {triggerClassName ? (
        <button {...triggerProps} className={triggerClassName}>
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <IconPlay className="h-4 w-4" />
          </span>
          {label}
        </button>
      ) : (
        <Button {...triggerProps} className={label ? 'btn' : 'btn btn-icon'}>
          <IconPlay />
          {label ? <span className="ml-1">{label}</span> : null}
        </Button>
      )}
    </div>
  )
}
