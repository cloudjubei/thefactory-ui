import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  CliImageUpdatePhase,
  CliImageVersion,
} from '../../../headless/contexts/CliConfigsContext'
import { Spinner } from '../..'
import { IconCheck } from '../../icons'

const LOG_VISIBLE_LINES = 400
const LOG_STICK_THRESHOLD_PX = 24

export const CLI_IMAGE_BUILD_STEPS: { phase: CliImageUpdatePhase; label: string; hint: string }[] =
  [
    {
      phase: 'building',
      label: 'Build image',
      hint: 'docker build downloads the base image and installs the CLI',
    },
    {
      phase: 'verifying',
      label: 'Verify version',
      hint: 'boots the new image and checks the CLI reports the requested version',
    },
    {
      phase: 'promoting',
      label: 'Switch to new image',
      hint: 'new runs start on the verified image',
    },
    {
      phase: 'restarting-sessions',
      label: 'Restart chat sessions',
      hint: 'resident sessions reconnect on the new version',
    },
  ]

export function cliImageBuildStepLabel(phase: CliImageUpdatePhase | undefined): string | undefined {
  return CLI_IMAGE_BUILD_STEPS.find((step) => step.phase === phase)?.label
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export type CliImageBuildProgressProps = {
  cliName: string
  update: NonNullable<CliImageVersion['update']>
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

  const activeIndex = Math.max(
    0,
    CLI_IMAGE_BUILD_STEPS.findIndex((step) => step.phase === update.phase),
  )

  const visibleLog = useMemo(() => {
    const text = (output ?? update.logTail).replace(/\n$/, '')
    const lines = text.split('\n')
    return lines.length > LOG_VISIBLE_LINES ? lines.slice(-LOG_VISIBLE_LINES).join('\n') : text
  }, [output, update.logTail])

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
          {formatElapsed(now - Date.parse(update.startedAt))}
        </span>
      </div>

      <ol className="m-0 p-0 list-none flex flex-col gap-1">
        {CLI_IMAGE_BUILD_STEPS.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          return (
            <li key={step.phase} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {done ? (
                  <IconCheck className="h-3.5 w-3.5 text-green-600" />
                ) : active ? (
                  <Spinner size={12} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-(--text-muted) opacity-50" />
                )}
              </span>
              <span className="flex flex-col">
                <span
                  className={
                    active
                      ? 'font-medium text-(--text-primary)'
                      : done
                        ? 'text-(--text-secondary)'
                        : 'text-(--text-muted)'
                  }
                >
                  {active && !update.phase ? 'Starting…' : step.label}
                </span>
                {active && <span className="text-(--text-secondary)">{step.hint}</span>}
              </span>
            </li>
          )
        })}
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
        {visibleLog || 'Waiting for docker output…'}
      </pre>
    </div>
  )
}
