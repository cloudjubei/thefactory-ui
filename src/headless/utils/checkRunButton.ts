import { CHECK_RUN_LABEL, CHECK_RUN_WORKING } from './checkMethodConstants'
import type { CheckMethodId, CheckMethodRow, CheckRunButton } from './checkMethodTypes'

/**
 * The Run button for one check block, or none when the block has no check
 * the verify route can target.
 *
 * `blockLabel` names the block ("Unit tests", "Lint"). `runningCheckIds` is
 * what the in-flight verify asked for: an empty list is the whole pass, so
 * every button reads as running; absent means idle.
 */
export function checkRunButton(
  checkIds: readonly string[],
  blockLabel: string,
  runningCheckIds: readonly string[] | undefined,
): CheckRunButton | undefined {
  const ids = [...new Set(checkIds.map((id) => id.trim()).filter((id) => id.length > 0))]
  if (ids.length === 0) return undefined
  const label = `${CHECK_RUN_LABEL} ${blockLabel}`
  if (runningCheckIds === undefined) return { checkIds: ids, label, running: false, blocked: false }
  const running = runningCheckIds.length === 0 || ids.some((id) => runningCheckIds.includes(id))
  return { checkIds: ids, label, running, blocked: !running }
}

/**
 * The line beside the panel while verify runs. One check is named; several
 * are listed; a whole pass keeps the line it had before a block could be run
 * on its own.
 */
export function checkRunWorkingLabel(
  runningCheckIds: readonly string[] | undefined,
  checks: readonly { id: string; label: string }[],
): string {
  if (!runningCheckIds || runningCheckIds.length === 0) return CHECK_RUN_WORKING
  const names = runningCheckIds.map((id) => checks.find((check) => check.id === id)?.label ?? id)
  return `Running ${names.join(', ')}`
}

/**
 * Which method chip is busy while verify runs. A targeted run marks the
 * method that owns those checks. A whole pass marks the first method that
 * offered "Run it now", else types — the same chip the panel marked before a
 * block could be run on its own.
 */
export function runningCheckMethod(
  rows: readonly Pick<CheckMethodRow, 'id' | 'checkIds' | 'action' | 'state'>[],
  runningCheckIds: readonly string[] | undefined,
): CheckMethodId | undefined {
  if (runningCheckIds && runningCheckIds.length > 0) {
    return rows.find((row) => row.checkIds.some((id) => runningCheckIds.includes(id)))?.id
  }
  return rows.find((row) => row.action.kind === 'run' && row.state !== 'passed')?.id ?? 'types'
}
