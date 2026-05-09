import type { MouseEvent, ReactNode } from 'react'
import Tooltip from '../../primitives/Tooltip'
import { CHIP_PILL_NEUTRAL } from './pillStyles'

export type ProjectChipProps = {
  // Display label (typically the project title).
  label: string
  // Tooltip body — usually a description; pass any ReactNode for richer content.
  description?: ReactNode
  // Disabled / read-only mode: renders as a div with no click handler.
  nonActionable?: boolean
  // Click handler. Library doesn't know about routing; the consumer wires this up.
  onClick?: () => void
  className?: string
}

// Pill that surfaces a project reference. Click is wired by the consumer
// (overseer-local routes to the project's home; a different host may navigate
// elsewhere). Library makes no assumption about the routing target.
export default function ProjectChip({
  label,
  description,
  nonActionable = false,
  onClick,
  className,
}: ProjectChipProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    if (nonActionable) return
    onClick?.()
  }

  const chipBody = (
    <>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
      <span className="truncate max-w-[18ch]" style={{ lineHeight: 1 }}>
        {label}
      </span>
    </>
  )

  const baseClasses = ['inline-flex items-center gap-1', CHIP_PILL_NEUTRAL, className || '']
    .join(' ')
    .trim()

  const chip = nonActionable ? (
    <div className={baseClasses} title={label}>
      {chipBody}
    </div>
  ) : (
    <button
      type="button"
      onClick={handleClick}
      className={[
        baseClasses,
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'disabled:opacity-70 disabled:cursor-not-allowed',
      ].join(' ')}
      title={label}
      disabled={!onClick}
    >
      {chipBody}
    </button>
  )

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold text-xs mb-0.5">{label}</div>
          {description ? (
            <div className="text-xs text-neutral-300 whitespace-pre-wrap max-w-65">
              {description}
            </div>
          ) : null}
        </div>
      }
      placement="top"
      disabled={nonActionable}
    >
      {chip}
    </Tooltip>
  )
}
