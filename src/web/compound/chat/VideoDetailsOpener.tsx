import { useState, type ReactNode } from 'react'

import { useIsNarrowViewport } from '../../hooks/useIsNarrowViewport'
import { BottomSheet } from '../../primitives/BottomSheet'
import Tooltip from '../../primitives/Tooltip'

export type VideoDetailsOpenerProps = {
  label: string
  details: ReactNode
  className: string
}

/**
 * The stretched button over a video's chip, which leaves the chip's own links
 * reachable above it: a popover on a big screen, a sheet on a small one.
 */
export default function VideoDetailsOpener({ label, details, className }: VideoDetailsOpenerProps) {
  const narrow = useIsNarrowViewport()
  const [open, setOpen] = useState(false)
  if (narrow) {
    return (
      <>
        <button
          type="button"
          aria-label={label}
          className={`absolute inset-0 ${className}`}
          onClick={() => setOpen(true)}
        />
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
      anchorClassName="absolute inset-0"
    >
      <button type="button" aria-label={label} className={`h-full w-full ${className}`} />
    </Tooltip>
  )
}
