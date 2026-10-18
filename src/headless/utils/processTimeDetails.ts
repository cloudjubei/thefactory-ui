import type { ProcessManagerTotals, ProcessTimeBreakdown } from 'thefactory-tools/types'

import { costChipLabel } from './costDetails'
import {
  PROCESS_TIME_MANAGER_LABEL,
  PROCESS_TIME_PART_HINTS,
  PROCESS_TIME_PART_LABELS,
  PROCESS_TIME_TOOLS_SHOWN,
} from './processTimeDetailsConstants'
import type {
  ProcessTimeDetailsLine,
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

/** The agent manager's line: its turns' charge as a cost chip words it, then their work time. */
function managerLine(manager: ProcessManagerTotals): ProcessTimeDetailsLine {
  const cost = costChipLabel(manager)
  const time = formatProcessDuration(manager.workMs)
  return { label: PROCESS_TIME_MANAGER_LABEL, value: cost ? `${cost} · ${time}` : time }
}

/**
 * Where a piece of work's time went, worded for the time chip's details: the
 * total, then agent thinking and tools & commands — always, so the split the
 * chip promises is never missing — and setup, other and still-running work
 * only when there is some, each with its duration and share; the slowest
 * tools; and, beside the total, time waiting on a person and time waiting a
 * turn behind other check runs (`queuedMs`, part of `waitingMs`), each apart.
 *
 * `workMs` is the chip's own total, live while a step runs: work the breakdown
 * has not placed yet — the clock carried on since the totals were read — is
 * still running. Undefined when the totals carry no breakdown, or there is no
 * time to explain. A run's `manager` totals add the agent manager's line.
 */
export function processTimeDetailsView(
  time: ProcessTimeBreakdown | undefined,
  workMs: number,
  manager?: ProcessManagerTotals,
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
  const queuedMs = Math.min(time.queuedMs ?? 0, time.waitingMs)
  const personMs = time.waitingMs - queuedMs
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
    ...(personMs > 0 ? { waiting: formatProcessDuration(personMs) } : {}),
    ...(queuedMs > 0 ? { queued: formatProcessDuration(queuedMs) } : {}),
    ...(manager ? { manager: managerLine(manager) } : {}),
  }
}
