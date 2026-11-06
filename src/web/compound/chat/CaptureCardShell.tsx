import type { ReactNode } from 'react'
import { IconKey } from '../../icons'
import { CAPTURE_PURPOSE_LABEL } from '../../../headless/utils/credentialCaptureConstants'
import { captureCardTitle, captureStatusDisplay } from '../../../headless/utils/credentialCaptures'
import type { CredentialCapture } from '../../../headless/utils/credentialCaptureTypes'

export type CaptureCardShellProps = {
  capture: CredentialCapture
  /** What the card asks of the person, under its heading. */
  children: ReactNode
}

/** A capture card's frame and heading: what it asks for, what for, and where it stands. */
export default function CaptureCardShell({ capture, children }: CaptureCardShellProps) {
  return (
    <div className="block w-full rounded-md border text-sm text-(--text-primary) bg-amber-500/10 border-amber-500/60">
      <div className="flex items-start gap-2 px-3 py-2 min-w-0">
        <IconKey className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1 flex flex-col">
          <span className="font-semibold">{captureCardTitle(capture)}</span>
          <span className="text-[12px] text-(--text-secondary) wrap-break-word">
            {CAPTURE_PURPOSE_LABEL}: {capture.purpose}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/15 rounded-full px-1.5 py-0.5 shrink-0">
          {captureStatusDisplay(capture).label}
        </span>
      </div>

      {children}
    </div>
  )
}
