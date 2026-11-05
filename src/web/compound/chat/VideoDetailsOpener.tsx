import { useState, type ReactNode } from 'react'

import { useIsNarrowViewport } from '../../hooks/useIsNarrowViewport'
import { BottomSheet } from '../../primitives/BottomSheet'
import Tooltip from '../../primitives/Tooltip'

export type VideoDetailsOpenerProps = {
  label: string
  details: ReactNode
  className: string
  /** What the button shows. Left out, it stretches over the chip instead. */
  children?: ReactNode
}

/**
 * What opens a video's details: a popover on a big screen, a sheet on a small
 * one. Stretched over a chip it leaves the chip's own links reachable above it;
 * given `children`, it is a button of its own in the row.
 */
export default function VideoDetailsOpener({
  label,
  details,
  className,
  children,
}: VideoDetailsOpenerProps) {
  const narrow = useIsNarrowViewport()
  const [open, setOpen] = useState(false)
  const stretch = children ? '' : 'absolute inset-0'
  if (narrow) {
    return (
      <>
        <button
          type="button"
          aria-label={label}
          className={`${stretch} ${className}`}
          onClick={() => setOpen(true)}
        >
          {children}
        </button>
        <BottomSheet
          isOpen={open}
          onClose={() => setOpen(false)}
          ariaLabel={label}
          minHeightFraction={0.25}
          maxHeightFraction={0.7}
        >
          <div className="p-4">{details}</div>
        </BottomSheet>
      </>
    )
  }
  return (
    <Tooltip
      content={details}
      placement="top"
      allowedPlacements={['top', 'bottom']}
      {...(stretch ? { anchorClassName: stretch } : {})}
    >
      <button
        type="button"
        aria-label={label}
        className={`${stretch ? 'h-full w-full' : ''} ${className}`}
      >
        {children}
      </button>
    </Tooltip>
  )
}
