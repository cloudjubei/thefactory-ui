import { useEffect, useMemo, useRef, useState } from 'react'

import {
  cliImageBuildLog,
  cliImageBuildSteps,
  formatBuildElapsed,
} from '../../../headless/utils/cliImageView'
import { CLI_IMAGE_LOG_WAITING } from '../../../headless/utils/cliImageViewConstants'
import type { CliImageBuild } from '../../../headless/utils/cliImageViewTypes'
import { Spinner } from '../..'
import { IconCheck } from '../../icons'

const LOG_STICK_THRESHOLD_PX = 24

export type CliImageBuildProgressProps = {
  cliName: string
  update: CliImageBuild
  output: string | undefined
}

/**
 * Live view of a sandbox-image rebuild: which stage it is in, how long it has run, and the docker
 * output as it streams. Only `building` produces output, so the step list is what shows progress
 * through the silent stages that follow.
 */
export function CliImageBuildProgress({ cliName, update, output }: CliImageBuildProgressProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const steps = useMemo(() => cliImageBuildSteps(update.phase), [update.phase])
  const visibleLog = useMemo(
    () => cliImageBuildLog(output, update.logTail),
    [output, update.logTail],
  )

  const logRef = useRef<HTMLPreElement>(null)
  const stickToBottomRef = useRef(true)
  useEffect(() => {
    const el = logRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [visibleLog])

  return (
    <div
      className="rounded border border-(--border-default) bg-(--surface-muted) px-3 py-2 text-xs flex flex-col gap-2"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-(--text-primary)">
          Updating {cliName} to {update.targetVersion}
        </span>
        <span className="tabular-nums text-(--text-secondary)">
          {formatBuildElapsed(now - Date.parse(update.startedAt))}
        </span>
      </div>

      <ol className="m-0 p-0 list-none flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.phase} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
              {step.state === 'done' ? (
                <IconCheck className="h-3.5 w-3.5 text-green-600" />
              ) : step.state === 'active' ? (
                <Spinner size={12} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-(--text-muted) opacity-50" />
              )}
            </span>
            <span className="flex flex-col">
              <span
                className={
                  step.state === 'active'
                    ? 'font-medium text-(--text-primary)'
                    : step.state === 'done'
                      ? 'text-(--text-secondary)'
                      : 'text-(--text-muted)'
                }
              >
                {step.text}
              </span>
              {step.state === 'active' && (
                <span className="text-(--text-secondary)">{step.hint}</span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <pre
        ref={logRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < LOG_STICK_THRESHOLD_PX
        }}
        className="m-0 h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-(--surface-base) p-2 font-mono text-[11px] text-(--text-secondary)"
      >
        {visibleLog || CLI_IMAGE_LOG_WAITING}
      </pre>
    </div>
  )
}
