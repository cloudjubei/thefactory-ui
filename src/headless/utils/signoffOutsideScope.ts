import type { ProcessRun } from 'thefactory-tools/types'
import { processOutsideScopeLine } from 'thefactory-tools/utils'

/**
 * "Outside the feature’s scope: a.ts, b.ts" — the changed files each run's
 * newest code review was told lie outside its feature's scope, joined across
 * the story's runs; `undefined` when none do. A review that ran again with
 * every file in scope clears its run's. Pure.
 */
export function signoffOutsideScopeLine(
  runs: readonly Pick<ProcessRun, 'plan' | 'ledger'>[],
): string | undefined {
  const files = new Set<string>()
  for (const run of runs) {
    const judges = new Set(
      (run.plan?.steps ?? []).filter((s) => s.kind === 'judge').map((s) => s.id),
    )
    const newest = run.ledger.filter((e) => judges.has(e.stepId) && e.status === 'done').at(-1)
    for (const file of newest?.outsideScope ?? []) files.add(file)
  }
  return processOutsideScopeLine([...files].sort())
}
