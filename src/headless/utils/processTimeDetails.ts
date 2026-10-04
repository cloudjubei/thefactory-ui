import type { ProcessTimeBreakdown } from 'thefactory-tools/types'

import {
  PROCESS_TIME_PART_HINTS,
  PROCESS_TIME_PART_LABELS,
  PROCESS_TIME_TOOLS_SHOWN,
} from './processTimeDetailsConstants'
import type {
  ProcessTimeDetailsRow,
  ProcessTimeDetailsTool,
  ProcessTimeDetailsView,
  ProcessTimePart,
} from './processTimeDetailsTypes'
import { formatProcessDuration } from './processView'

/** A share of the total as a person reads it: a whole percentage, never a non-zero "0%". */
function shareLabel(fraction: number): string {
  if (fraction <= 0) return '0%'
  if (fraction < 0.01) return '<1%'
  return `${Math.round(fraction * 100)}%`
}

function toolLabel(name: string, calls: number): string {
  return calls > 1 ? `${name} ×${calls}` : name
}

/**
 * Where a piece of work's time went, worded for the time chip's details: the
 * total, then agent thinking and tools & commands — always, so the split the
 * chip promises is never missing — and setup, other and still-running work
 * only when there is some, each with its duration and share; the slowest
 * tools; and time waiting on a person beside the total.
 *
 * `workMs` is the chip's own total, live while a step runs: work the breakdown
 * has not placed yet — the clock carried on since the totals were read — is
 * still running. Undefined when the totals carry no breakdown, or there is no
 * time to explain.
 */
export function processTimeDetailsView(
  time: ProcessTimeBreakdown | undefined,
  workMs: number,
): ProcessTimeDetailsView | undefined {
  if (!time) return undefined
  const placed = time.thinkingMs + time.toolMs + time.systemMs + time.otherMs
  const parts: Record<ProcessTimePart, number> = {
    thinking: time.thinkingMs,
    tools: time.toolMs,
    system: time.systemMs,
    other: time.otherMs,
    running: Math.max(time.runningMs, workMs - placed),
  }
  const total = Math.max(workMs, placed + parts.running)
  if (total <= 0 && time.waitingMs <= 0) return undefined
  const rows: ProcessTimeDetailsRow[] = []
  for (const key of Object.keys(parts) as ProcessTimePart[]) {
    const ms = parts[key]
    if (ms <= 0 && key !== 'thinking' && key !== 'tools') continue
    const fraction = total > 0 ? ms / total : 0
    rows.push({
      key,
      label: PROCESS_TIME_PART_LABELS[key],
      hint: PROCESS_TIME_PART_HINTS[key],
      value: formatProcessDuration(ms),
      share: shareLabel(fraction),
      fraction,
    })
  }
  const tools: ProcessTimeDetailsTool[] = time.tools
    .filter((tool) => tool.ms > 0)
    .slice(0, PROCESS_TIME_TOOLS_SHOWN)
    .map((tool) => ({
      label: toolLabel(tool.name, tool.calls),
      value: formatProcessDuration(tool.ms),
    }))
  return {
    total: formatProcessDuration(total),
    rows,
    tools,
    ...(time.waitingMs > 0 ? { waiting: formatProcessDuration(time.waitingMs) } : {}),
  }
}
