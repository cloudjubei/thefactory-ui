import { BACKGROUND_JOB_OUTCOME } from 'thefactory-tools/constants'
import type { ChatBackgroundJobResult } from 'thefactory-tools/types'
import { formatDurationMs } from './time'
import type { ToolOrigin } from './chatTypes'
import {
  TOOL_RUNNING_LABEL,
  TOOL_SLOW_AFTER_MS,
  TOOL_WAITING_ON_HOST_LABEL,
} from './backgroundJobsConstants'

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return undefined
    }
  }
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** The background job a tool call carries on as, read off its result; `undefined` for any other result. */
export function backgroundJobIdOf(result: unknown): string | undefined {
  const body = asRecord(result)
  if (body?.outcome !== BACKGROUND_JOB_OUTCOME) return undefined
  return typeof body.jobId === 'string' ? body.jobId : undefined
}

/** The element id of the row of the call a job carries on — what a result jumps back to. */
export function backgroundJobAnchorId(jobId: string): string {
  return `bg-job-${jobId.replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/** The anchor of a tool row whose call carries on as a background job; `undefined` for any other. */
export function backgroundJobAnchorOf(result: unknown): string | undefined {
  const jobId = backgroundJobIdOf(result)
  return jobId !== undefined ? backgroundJobAnchorId(jobId) : undefined
}

/** How a call that finished in the background ended, and how long it took. */
export function describeBackgroundResult(result: ChatBackgroundJobResult): string {
  const verb = result.status === 'succeeded' ? 'finished' : 'failed'
  return `${verb} after ${formatDurationMs(result.tookMs)}`
}

/**
 * What a call still running says once it has run a while: where it is waiting
 * — on the host's own tools, or on something the CLI runs itself — and for how
 * long. `undefined` for a call that has not run long, or whose start is unknown.
 */
export function slowToolLabel(input: {
  origin?: ToolOrigin
  startedAt?: string
  nowMs: number
}): string | undefined {
  const started = input.startedAt !== undefined ? Date.parse(input.startedAt) : NaN
  if (!Number.isFinite(started)) return undefined
  const elapsed = input.nowMs - started
  if (elapsed < TOOL_SLOW_AFTER_MS) return undefined
  const where =
    (input.origin ?? 'internal') === 'internal' ? TOOL_WAITING_ON_HOST_LABEL : TOOL_RUNNING_LABEL
  return `${where} · ${formatDurationMs(Math.floor(elapsed / 1000) * 1000)}`
}
