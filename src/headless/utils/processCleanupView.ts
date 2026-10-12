// Pure view logic for a process run's cleanup list: its rows, its headline,
// and whether the person can still change it. No React, no I/O.

import type { ProcessCleanupList, ProcessCleanupOutcome } from 'thefactory-tools/types'
import { processCleanupSummary } from 'thefactory-tools/utils'
import {
  PROCESS_CLEANUP_BY_LABELS,
  PROCESS_CLEANUP_COPY,
  PROCESS_CLEANUP_KIND_LABELS,
  PROCESS_CLEANUP_OUTCOME_LABELS,
} from './processCleanupViewConstants'
import type { ProcessCleanupRow } from './processCleanupViewTypes'

function outcomeOf(outcome: ProcessCleanupOutcome): NonNullable<ProcessCleanupRow['outcome']> {
  return {
    status: outcome.status,
    label: PROCESS_CLEANUP_OUTCOME_LABELS[outcome.status],
    ...(outcome.detail ? { detail: outcome.detail } : {}),
  }
}

/**
 * The list's rows: each item with what it is, who registered it and whether it
 * goes — and, once the step ran, what it did, including items it removed that
 * are no longer there to list.
 */
export function processCleanupRows(list: ProcessCleanupList): ProcessCleanupRow[] {
  const outcomes = new Map((list.report?.outcomes ?? []).map((o) => [o.itemId, o]))
  const rows: ProcessCleanupRow[] = list.items.map((item) => {
    const outcome = outcomes.get(item.id)
    return {
      id: item.id,
      label: item.label,
      kindLabel: PROCESS_CLEANUP_KIND_LABELS[item.kind],
      reason: item.reason,
      byLabel: PROCESS_CLEANUP_BY_LABELS[item.registeredBy],
      selected: item.selected,
      ...(outcome ? { outcome: outcomeOf(outcome) } : {}),
    }
  })
  const listed = new Set(list.items.map((i) => i.id))
  const gone = (list.report?.outcomes ?? [])
    .filter((o) => !listed.has(o.itemId))
    .map(
      (o): ProcessCleanupRow => ({
        id: o.itemId,
        label: o.label,
        kindLabel: PROCESS_CLEANUP_KIND_LABELS[o.kind],
        reason: '',
        byLabel: '',
        selected: true,
        outcome: outcomeOf(o),
      }),
    )
  return [...rows, ...gone]
}

/** One line over the list: what will happen to it, or what did. */
export function processCleanupHeadline(list: ProcessCleanupList): string {
  if (list.report) return processCleanupSummary(list.report)
  if (!list.hasStep) return PROCESS_CLEANUP_COPY.noStep
  if (list.off) return PROCESS_CLEANUP_COPY.off
  if (list.items.length === 0) return PROCESS_CLEANUP_COPY.empty
  const selected = list.items.filter((i) => i.selected).length
  return PROCESS_CLEANUP_COPY.willRemove(selected, list.items.length)
}

/** Whether the person can still tick, untick or switch off: a step will carry it out and has not yet. */
export function processCleanupEditable(list: ProcessCleanupList): boolean {
  return list.hasStep && !list.report
}
