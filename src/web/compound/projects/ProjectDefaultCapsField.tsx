import { useEffect, useState } from 'react'

import {
  LAUNCH_CAPS_COPY,
  processDefaultCapFields,
  processDefaultCapsError,
  readProcessDefaultCaps,
  withProcessDefaultCaps,
  type LaunchCapsTyped,
} from '../../../headless'
import { LaunchCapField } from '../chat/LaunchCapsFields'

export type ProjectDefaultCapsFieldProps = {
  /** The project's metadata. */
  metadata: Record<string, unknown>
  /** The metadata with the defaults as edited. */
  onChange: (metadata: Record<string, unknown>) => void
  /** What stops a save while a limit cannot be kept; nothing once it can. */
  onErrorChange?: (error: string | undefined) => void
  busy?: boolean
}

/** The limits a project's launches start from: spend, time and attempts. */
export default function ProjectDefaultCapsField({
  metadata,
  onChange,
  onErrorChange,
  busy = false,
}: ProjectDefaultCapsFieldProps) {
  const [typed, setTyped] = useState<LaunchCapsTyped>({})
  const stored = readProcessDefaultCaps(metadata.processDefaultCaps)
  const fields = processDefaultCapFields(stored, typed)
  const error = processDefaultCapsError(fields)
  useEffect(() => onErrorChange?.(error), [error, onErrorChange])
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-(--text-primary)">
          {LAUNCH_CAPS_COPY.projectHeading}
        </span>
        <span className="text-[12px] text-(--text-secondary)">{LAUNCH_CAPS_COPY.projectHint}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {fields.map((field) => (
          <LaunchCapField
            key={field.key}
            field={field}
            busy={busy}
            onChange={(text) => {
              const next = { ...typed, [field.key]: text }
              setTyped(next)
              onChange(withProcessDefaultCaps(metadata, processDefaultCapFields(stored, next)))
            }}
          />
        ))}
      </div>
    </div>
  )
}
